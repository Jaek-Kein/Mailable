import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseSheetUrl } from "@/src/lib/gsheets/parseUrl";
import { fetchCsv } from "@/src/lib/gsheets/fetchCsv";
import { csvToJson } from "@/src/lib/gsheets/csvToJson";
import { prisma } from "@/src/lib/prisma";
import { encryptJson, decryptJson } from "@/src/lib/crypto";
import { EMAIL_KEYS, NAME_KEYS, TS_KEYS, ALLOWED_KEYS } from "@/src/lib/columnDetection";

const schema = z.object({
    eventId: z.string().min(1),
    sheetUrl: z.string().url("유효한 URL 형식이 아닙니다."),
});

export async function POST(req: NextRequest) {

    try {
        const body = await req.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { ok: false, error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }
        const { eventId, sheetUrl } = parsed.data;

        const { spreadsheetId, gid, isExportCsv } = parseSheetUrl(sheetUrl);
        if (!spreadsheetId)
            return NextResponse.json(
                { ok: false, error: "Invalid sheet URL" },
                { status: 400 }
            );

        const csvText = isExportCsv
            ? await (await fetch(sheetUrl, { cache: "no-store" })).text()
            : await fetchCsv({ spreadsheetId, gid });

        const allRows = csvToJson(csvText);

        const filteredRows = allRows.map((row) =>
            Object.fromEntries(
                Object.entries(row).filter(([k]) =>
                    ALLOWED_KEYS.some((key) => k.toLowerCase() === key.toLowerCase())
                )
            )
        );

        // 기존 취소자 목록 유지: 재수집 시 취소된 참가자는 다시 추가되지 않음
        const existing = await prisma.eventData.findUnique({ where: { eventId }, select: { payload: true } });
        let cancelledEmails: string[] = [];
        let checkinMap: Record<string, string | null> = {};
        if (existing) {
            const prev = decryptJson<{ cancelledEmails?: string[]; checkinMap?: Record<string, string | null> }>(existing.payload as string);
            cancelledEmails = Array.isArray(prev?.cancelledEmails) ? prev.cancelledEmails : [];
            checkinMap = prev?.checkinMap ?? {};
        }

        const cancelledSet = new Set(cancelledEmails.map((e) => e.toLowerCase()));
        const rows = filteredRows.filter((row) => {
            const emailVal = Object.entries(row).find(([k]) =>
                EMAIL_KEYS.some((key) => k.toLowerCase() === key.toLowerCase())
            )?.[1];
            if (!emailVal) return true;
            return !cancelledSet.has(emailVal.toLowerCase().trim());
        });

        const encryptedPayload = encryptJson({ rows, cancelledEmails, checkinMap });

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
        if (e instanceof Error) {
            return NextResponse.json(
                { ok: false, error: e.message },
                { status: 500 }
            );
        }
        return NextResponse.json(
            { ok: false, error: String(e) },
            { status: 500 }
        );
    }
}
