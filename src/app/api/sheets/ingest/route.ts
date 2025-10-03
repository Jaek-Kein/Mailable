import { NextRequest, NextResponse } from "next/server";
import { parseSheetUrl } from "@/lib/gsheets/parseUrl";
import { fetchCsv } from "@/lib/gsheets/fetchCsv";
import { csvToJson } from "@/lib/gsheets/csvToJson";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  
    try {
        const { eventId, sheetUrl } = (await req.json()) as {
            eventId: string;
            sheetUrl: string;
        };
        if (!eventId || !sheetUrl)
            return NextResponse.json(
                { ok: false, error: "eventId, sheetUrl required" },
                { status: 400 }
            );

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
