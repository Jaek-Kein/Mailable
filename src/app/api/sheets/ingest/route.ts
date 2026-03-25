import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseSheetUrl } from "@/src/lib/gsheets/parseUrl";
import { fetchCsv } from "@/src/lib/gsheets/fetchCsv";
import { csvToJson } from "@/src/lib/gsheets/csvToJson";
import { prisma } from "@/src/lib/prisma";
import { encryptJson } from "@/src/lib/crypto";

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

        const EMAIL_KEYS = ["email", "이메일", "연락처", "e-mail", "mail"];
        const NAME_KEYS = ["name", "이름", "입금자명", "닉네임", "성명", "참가자명"];
        const TS_KEYS = ["타임스탬프", "timestamp", "제출 시간", "응답 날짜", "응답시간"];
        const ALLOWED_KEYS = [...EMAIL_KEYS, ...NAME_KEYS, ...TS_KEYS];

        const rows = allRows.map((row) =>
            Object.fromEntries(
                Object.entries(row).filter(([k]) =>
                    ALLOWED_KEYS.some((key) => k.toLowerCase() === key.toLowerCase())
                )
            )
        );

        const encryptedPayload = encryptJson({ rows });

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
