import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { parseSheetUrl } from "@/src/lib/gsheets/parseUrl";
import { fetchCsv } from "@/src/lib/gsheets/fetchCsv";
import { csvToJson } from "@/src/lib/gsheets/csvToJson";
import { prisma } from "@/src/lib/prisma";
import { encryptJson, decryptJson } from "@/src/lib/crypto";
import { EMAIL_KEYS, TS_KEYS } from "@/src/lib/columnDetection";
import { sanitizePayload } from "@/src/lib/sanitizePayload";
import { auth } from "@/src/lib/auth";

const schema = z.object({
    eventId: z.string().min(1),
    sheetUrl: z.string().url("유효한 URL 형식이 아닙니다."),
});

export async function POST(req: NextRequest) {

    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }

        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ ok: false, error: "요청 본문이 올바른 JSON 형식이 아닙니다." }, { status: 400 });
        }
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { ok: false, error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }
        const { eventId, sheetUrl } = parsed.data;

        // 행사 소유권 검증
        const event = await prisma.event.findFirst({ where: { id: eventId, ownerId: userId } });
        if (!event) {
            return NextResponse.json({ ok: false, error: "행사를 찾을 수 없거나 접근 권한이 없습니다." }, { status: 404 });
        }

        const { spreadsheetId, gid, isExportCsv } = parseSheetUrl(sheetUrl);
        if (!spreadsheetId)
            return NextResponse.json(
                { ok: false, error: "Invalid sheet URL" },
                { status: 400 }
            );

        // SSRF 방어: Google Sheets 도메인만 허용
        const ALLOWED_SHEET_HOSTS = ["docs.google.com", "sheets.googleapis.com"];
        if (isExportCsv) {
            const parsedUrl = new URL(sheetUrl);
            if (!ALLOWED_SHEET_HOSTS.includes(parsedUrl.hostname)) {
                return NextResponse.json({ ok: false, error: "허용되지 않은 URL입니다." }, { status: 400 });
            }
        }

        let csvText: string;
        try {
            if (isExportCsv) {
                const csvRes = await fetch(sheetUrl, { cache: "no-store" });
                if (!csvRes.ok) throw new Error(`HTTP ${csvRes.status}`);
                csvText = await csvRes.text();
            } else {
                csvText = await fetchCsv({ spreadsheetId, gid });
            }
        } catch (e: unknown) {
            const reason = e instanceof Error ? e.message : String(e);
            return NextResponse.json({ ok: false, error: `Google Sheets 데이터를 가져오지 못했습니다: ${reason}` }, { status: 502 });
        }

        const allRows = csvToJson(csvText);
        console.log("[ingest] allRows count:", allRows.length);
        console.log("[ingest] headers:", allRows.length > 0 ? Object.keys(allRows[0]) : []);
        console.log("[ingest] allRows sample:", JSON.stringify(allRows.slice(0, 3)));

        const filteredRows = allRows
            .filter((row) => {
                // 빈 컬럼명 제거 후 실질 컬럼이 하나라도 있어야 함
                const entries = Object.entries(row).filter(([k]) => k.trim() !== "");
                if (entries.length === 0) return false;
                // _rid 컬럼만 있는 행(관리 데이터 잔류 행) 제거
                const nonRidEntries = entries.filter(([k]) => k !== "_rid");
                if (nonRidEntries.length === 0) return false;
                // 이메일 컬럼이 있고 실제 값이 있어야 유효한 행
                const emailKey = Object.keys(row).find((k) =>
                    EMAIL_KEYS.some((e) => k.toLowerCase() === e.toLowerCase())
                );
                if (!emailKey) return false;
                const emailVal = row[emailKey];
                // 이메일 형식 최소 검증: @ 포함
                return typeof emailVal === "string" && emailVal.trim() !== "" && emailVal.includes("@");
            })
            .map((row) =>
                // 빈 헤더 컬럼과 _rid 컬럼 제거 (ingest 시 새로 발급)
                Object.fromEntries(Object.entries(row).filter(([k]) => k.trim() !== "" && k !== "_rid"))
            );
        console.log("[ingest] filteredRows count:", filteredRows.length);
        console.log("[ingest] filteredRows sample:", JSON.stringify(filteredRows.slice(0, 3)));

        // 기존 payload에서 _rid, 취소자, 체크인, 결제 정보 유지
        const existing = await prisma.eventData.findUnique({ where: { eventId }, select: { payload: true } });
        let cancelledRids: string[] = [];
        let checkinMap: Record<string, string | null> = {};
        let paidRids: string[] = [];
        // 레거시: 이메일 기반 상태값 (마이그레이션용)
        let legacyCancelledEmails: string[] = [];
        let legacyPaidEmails: string[] = [];
        // 기존 rows의 _rid 매핑 (타임스탬프+이메일 → _rid[])
        // 동일 복합키를 가진 행이 여러 개일 수 있으므로 배열로 관리
        const existingRidMap = new Map<string, string[]>();

        if (existing) {
            const rawPrev = decryptJson<{
                rows?: Record<string, string>[];
                cancelledRids?: string[];
                cancelledEmails?: string[];
                checkinMap?: Record<string, string | null>;
                paidRids?: string[];
                paidEmails?: string[];
            }>(existing.payload as string);
            // 기존 payload에서 빈 행과 stale rid를 먼저 정리
            const prev = sanitizePayload((rawPrev ?? {}) as Record<string, unknown>);
            cancelledRids = prev.cancelledRids;
            paidRids = prev.paidRids;
            checkinMap = prev.checkinMap;
            // 레거시 이메일 기반 데이터
            legacyCancelledEmails = Array.isArray(rawPrev?.cancelledEmails) ? rawPrev.cancelledEmails : [];
            legacyPaidEmails = Array.isArray(rawPrev?.paidEmails) ? rawPrev.paidEmails : [];
            // 정리된 rows로 _rid 매핑: 타임스탬프+이메일 복합키 (동일 복합키가 여러 행일 수 있으므로 배열로 보존)
            for (const r of (prev.rows ?? [])) {
                if (!r._rid) continue;
                const tsKey = Object.keys(r).find((k) => TS_KEYS.some((t) => k.toLowerCase() === t.toLowerCase()));
                const emailKey = Object.keys(r).find((k) => EMAIL_KEYS.some((e) => k.toLowerCase() === e.toLowerCase()));
                const tsVal = tsKey ? r[tsKey] : "";
                const emailVal = emailKey ? r[emailKey]?.trim().toLowerCase() : "";
                if (!emailVal) continue;
                const mapKey = `${tsVal}|${emailVal}`;
                const arr = existingRidMap.get(mapKey) ?? [];
                arr.push(r._rid);
                existingRidMap.set(mapKey, arr);
            }
        }

        // 레거시 이메일 기반 취소자 → cancelledRids로 마이그레이션 (신규 row에 적용)
        const legacyCancelledSet = new Set(legacyCancelledEmails.map((e) => e.toLowerCase()));

        // 각 row에 _rid 부여 (타임스탬프+이메일 복합키 매핑 — 기존 row는 기존 _rid 유지, 신규 row에 새 UUID 발급)
        // 동일 복합키가 여러 행인 경우 배열에서 순서대로 shift()하여 각 행에 고유 _rid 부여
        // 이미 할당된 _rid는 재사용하지 않음 (기존 데이터의 중복 _rid 오염 복구)
        const usedRids = new Set<string>();
        const rowsWithRid = filteredRows.map((row) => {
            const tsKey = Object.keys(row).find((k) => TS_KEYS.some((t) => k.toLowerCase() === t.toLowerCase()));
            const emailKey = Object.keys(row).find((k) => EMAIL_KEYS.some((e) => k.toLowerCase() === e.toLowerCase()));
            const tsVal = tsKey ? row[tsKey] : "";
            const emailVal = emailKey ? row[emailKey]?.trim().toLowerCase() : "";
            const mapKey = `${tsVal}|${emailVal}`;
            const ridArr = emailVal ? existingRidMap.get(mapKey) : undefined;
            // 배열에서 아직 사용하지 않은 고유 _rid를 꺼냄
            let existingRid: string | undefined;
            while (ridArr?.length) {
                const candidate = ridArr.shift()!;
                if (!usedRids.has(candidate)) {
                    existingRid = candidate;
                    break;
                }
            }
            const rid = existingRid ?? randomUUID();
            usedRids.add(rid);
            return { ...row, _rid: rid };
        });

        // 레거시 이메일 취소 → cancelledRids 마이그레이션
        for (const row of rowsWithRid) {
            const emailKey = Object.keys(row).find((k) => EMAIL_KEYS.some((e) => k.toLowerCase() === e.toLowerCase()));
            const emailVal = emailKey ? (row as Record<string, string>)[emailKey]?.toLowerCase().trim() : null;
            if (emailVal && legacyCancelledSet.has(emailVal) && !cancelledRids.includes(row._rid)) {
                cancelledRids = [...cancelledRids, row._rid];
            }
        }

        // orphan 정리: 관리 데이터(paidRids, cancelledRids, checkinMap)는
        // 시트에서 행이 일시적으로 사라져도 보존 (재수집 시 기존 관리 정보 소실 방지)
        // checkinMap만 새 rows에 없는 rid 정리 (체크인은 당일 이벤트용이라 리셋이 자연스러움)
        const incomingRidSet = new Set(rowsWithRid.map((r) => r._rid));
        checkinMap = Object.fromEntries(
            Object.entries(checkinMap).filter(([rid]) => incomingRidSet.has(rid))
        );
        // cancelledRids/paidRids는 시트에서 사라진 row도 보존 (수동 관리 데이터)

        // rows는 취소자 포함 전체 유지 (프론트엔드가 cancelledRids로 표시 여부 결정)
        const rows = rowsWithRid;

        // 레거시 paidEmails → paidRids 마이그레이션
        if (legacyPaidEmails.length > 0) {
            const legacyPaidSet = new Set(legacyPaidEmails.map((e) => e.toLowerCase()));
            for (const row of rowsWithRid) {
                const emailKey = Object.keys(row).find((k) => EMAIL_KEYS.some((e) => k.toLowerCase() === e.toLowerCase()));
                const emailVal = emailKey ? (row as Record<string, string>)[emailKey]?.toLowerCase().trim() : null;
                if (emailVal && legacyPaidSet.has(emailVal) && !paidRids.includes(row._rid)) {
                    paidRids = [...paidRids, row._rid];
                }
            }
        }

        // checkinMap 레거시 마이그레이션은 하지 않음 (체크인은 당일 이벤트용이라 재수집 시 리셋이 자연스러움)

        const encryptedPayload = encryptJson({ rows, cancelledRids, checkinMap, paidRids });

        const saved = await prisma.eventData.upsert({
            where: { eventId },
            update: {
                payload: encryptedPayload,
                version: { increment: 1 },
                updatedAt: new Date(),
            },
            create: { eventId, payload: encryptedPayload },
            select: { eventId: true, version: true },
        });

        return NextResponse.json({
            ok: true,
            saved,
            count: rows.length,
            data: rows,
        });
    } catch (e: unknown) {
        console.error("[sheets/ingest] 예기치 않은 오류:", e);
        return NextResponse.json({ ok: false, error: "데이터 수집 중 오류가 발생했습니다." }, { status: 500 });
    }
}
