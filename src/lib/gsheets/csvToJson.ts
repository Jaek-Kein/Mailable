import { parse } from "csv-parse/sync";

// 첫 행을 헤더로 인식해 JSON 배열 반환
// 모든 셀이 비어있는 행은 제거 (구글 시트에서 열 삭제 후 남는 빈 행 방어)
export function csvToJson(csvText: string): Record<string, string>[] {
  const rows = parse(csvText, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  return rows.filter((row) =>
    Object.entries(row).some(([k, v]) => k.trim() !== "" && typeof v === "string" && v.trim() !== "")
  );
}
