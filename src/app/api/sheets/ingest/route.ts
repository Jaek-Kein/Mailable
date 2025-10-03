import { NextRequest, NextResponse } from "next/server";
import { parseSheetUrl } from "@/lib/gsheets/parseUrl";
import { fetchCsv } from "@/lib/gsheets/fetchCsv";
import { csvToJson } from "@/lib/gsheets/csvToJson";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json() as { url?: string };
    if (!url) return NextResponse.json({ ok: false, error: "url required" }, { status: 400 });

    const { spreadsheetId, gid, isExportCsv } = parseSheetUrl(url);
    if (!spreadsheetId) {
      return NextResponse.json({ ok: false, error: "Invalid Google Sheets URL" }, { status: 400 });
    }

    // 1) CSV 텍스트 확보 (이미 export 링크면 그대로 가져오기)
    const csvText = isExportCsv
      ? await (await fetch(url, { cache: "no-store" })).text()
      : await fetchCsv({ spreadsheetId, gid });

    // 2) CSV → JSON
    const data = csvToJson(csvText);

    // 👇 필요 시 여기서 스키마 검증/컬럼 매핑/가공
    return NextResponse.json({ ok: true, spreadsheetId, gid, count: data.length, data });
    /* eslint */
  } catch (e: unknown) {
          if (e instanceof Error) {
        return NextResponse.json({ ok: false, error: e.message}, {status: 500});
      }
      return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
