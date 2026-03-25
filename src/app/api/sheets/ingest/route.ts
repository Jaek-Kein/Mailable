import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseSheetUrl } from "@/src/lib/gsheets/parseUrl";
import { fetchCsv } from "@/src/lib/gsheets/fetchCsv";
import { csvToJson } from "@/src/lib/gsheets/csvToJson";
import { prisma } from "@/src/lib/prisma";

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

        const rows = csvToJson(csvText);

        const payload = { rows };

        const saved = await prisma.eventData.upsert({
            where: { eventId },
            update: {
                payload,
                version: { increment: 1 },
                updatedAt: new Date(),
            },
            create: { eventId, payload },
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
