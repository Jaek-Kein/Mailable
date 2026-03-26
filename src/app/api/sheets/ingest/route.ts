import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { parseSheetUrl } from "@/src/lib/gsheets/parseUrl";
import { fetchCsv } from "@/src/lib/gsheets/fetchCsv";
import { csvToJson } from "@/src/lib/gsheets/csvToJson";
import { prisma } from "@/src/lib/prisma";
import { encryptJson, decryptJson } from "@/src/lib/crypto";
import { EMAIL_KEYS, TS_KEYS, ALLOWED_KEYS, PAID_KEYS, isTrueValue } from "@/src/lib/columnDetection";
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

        const filteredRows = allRows.map((row) =>
            Object.fromEntries(
                Object.entries(row).filter(([k]) =>
                    ALLOWED_KEYS.some((key) => k.toLowerCase() === key.toLowerCase())
                )
            )
        );

        // 기존 payload에서 _rid, 취소자, 체크인, 결제 정보 유지
        const existing = await prisma.eventData.findUnique({ where: { eventId }, select: { payload: true } });
        let cancelledRids: string[] = [];
        let checkinMap: Record<string, string | null> = {};
        let paidRids: string[] = [];
        // 레거시: 이메일 기반 상태값 (마이그레이션용)
        let legacyCancelledEmails: string[] = [];
        let legacyCheckinMapEmails: Record<string, string | null> = {};
        let legacyPaidEmails: string[] = [];
        // 기존 rows의 _rid 매핑 (타임스탬프+이메일 → _rid)
        const existingRidMap = new Map<string, string>();

        if (existing) {
            const prev = decryptJson<{
                rows?: Record<string, string>[];
                cancelledRids?: string[];
                cancelledEmails?: string[];
                checkinMap?: Record<string, string | null>;
                paidRids?: string[];
                paidEmails?: string[];
            }>(existing.payload as string);
            cancelledRids = Array.isArray(prev?.cancelledRids) ? prev.cancelledRids : [];
            paidRids = Array.isArray(prev?.paidRids) ? prev.paidRids : [];
            checkinMap = prev?.checkinMap ?? {};
            // 레거시 이메일 기반 데이터
            legacyCancelledEmails = Array.isArray(prev?.cancelledEmails) ? prev.cancelledEmails : [];
            legacyPaidEmails = Array.isArray(prev?.paidEmails) ? prev.paidEmails : [];
            legacyCheckinMapEmails = {};
            // 기존 rows에서 _rid 매핑 구축
            if (Array.isArray(prev?.rows)) {
                for (const r of prev.rows) {
                    if (r._rid) {
                        // 타임스탬프+이메일 복합키로 매핑
                        const tsKey = Object.keys(r).find((k) => TS_KEYS.some((t) => k.toLowerCase() === t.toLowerCase()));
                        const emailKey = Object.keys(r).find((k) => EMAIL_KEYS.some((e) => k.toLowerCase() === e.toLowerCase()));
                        const mapKey = `${tsKey ? r[tsKey] : ""}|${emailKey ? r[emailKey] : ""}`;
                        existingRidMap.set(mapKey, r._rid);
                    }
                }
            }
        }

        // 레거시 이메일 기반 취소자 → cancelledRids로 마이그레이션 (신규 row에 적용)
        const legacyCancelledSet = new Set(legacyCancelledEmails.map((e) => e.toLowerCase()));

        // 각 row에 _rid 부여 (기존 row는 기존 _rid 유지, 신규 row에 새 UUID 발급)
        const rowsWithRid = filteredRows.map((row) => {
            const tsKey = Object.keys(row).find((k) => TS_KEYS.some((t) => k.toLowerCase() === t.toLowerCase()));
            const emailKey = Object.keys(row).find((k) => EMAIL_KEYS.some((e) => k.toLowerCase() === e.toLowerCase()));
            const mapKey = `${tsKey ? row[tsKey] : ""}|${emailKey ? row[emailKey] : ""}`;
            const existingRid = existingRidMap.get(mapKey);
            return { ...row, _rid: existingRid ?? randomUUID() };
        });

        // 취소 처리: cancelledRids + 레거시 이메일 취소 적용
        const rows = rowsWithRid.filter((row) => {
            if (cancelledRids.includes(row._rid)) return false;
            // 레거시: 이메일이 취소 목록에 있으면 제외하고 _rid를 cancelledRids에 추가
            const emailKey = Object.keys(row).find((k) => EMAIL_KEYS.some((e) => k.toLowerCase() === e.toLowerCase()));
            const emailVal = emailKey ? (row as Record<string, string>)[emailKey]?.toLowerCase().trim() : null;
            if (emailVal && legacyCancelledSet.has(emailVal)) {
                cancelledRids = [...cancelledRids, row._rid];
                return false;
            }
            return true;
        });

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

        // 입금 체크박스 컬럼이 있으면 paidRids에 자동 반영
        for (const row of rows) {
            const paidKey = Object.keys(row).find((k) => PAID_KEYS.some((p) => k.toLowerCase() === p.toLowerCase()));
            if (paidKey && row._rid) {
                const val = (row as Record<string, string>)[paidKey] ?? "";
                if (isTrueValue(val)) {
                    if (!paidRids.includes(row._rid)) paidRids = [...paidRids, row._rid];
                } else {
                    // Sheets에서 명시적으로 false 표시된 경우 paidRids에서 제거
                    paidRids = paidRids.filter((r) => r !== row._rid);
                }
            }
        }

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
