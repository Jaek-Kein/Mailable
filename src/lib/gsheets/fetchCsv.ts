export async function fetchCsv({ spreadsheetId, gid }: { spreadsheetId: string; gid?: string }) {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export`);
  url.searchParams.set("format", "csv");
  if (gid) url.searchParams.set("gid", gid);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status} (링크 공개/읽기 권한 확인)`);
  return await res.text();
}
