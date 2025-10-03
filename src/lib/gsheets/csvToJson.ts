import { parse } from "csv-parse/sync";

// 첫 행을 헤더로 인식해 JSON 배열 반환
export function csvToJson(csvText: string) {
  return parse(csvText, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
}
