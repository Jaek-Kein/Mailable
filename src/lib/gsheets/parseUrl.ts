export function parseSheetUrl(input: string) {
  const u = new URL(input);
  const idMatch = u.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const spreadsheetId = idMatch?.[1];
  const gid = u.hash.match(/gid=([0-9]+)/)?.[1] ?? u.searchParams.get("gid") ?? undefined;
  const isExportCsv = u.pathname.endsWith("/export") && u.searchParams.get("format") === "csv";
  return { spreadsheetId, gid, isExportCsv, original: input };
}
