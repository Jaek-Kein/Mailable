import { describe, it, expect } from "vitest";
import { parseSheetUrl } from "@/src/lib/gsheets/parseUrl";
import { csvToJson } from "@/src/lib/gsheets/csvToJson";

describe("parseSheetUrl", () => {
  const SHEET_ID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms";

  it("spreadsheetId를 올바르게 추출한다", () => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=0`;
    const result = parseSheetUrl(url);
    expect(result.spreadsheetId).toBe(SHEET_ID);
  });

  it("hash에서 gid를 추출한다", () => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=123`;
    const result = parseSheetUrl(url);
    expect(result.gid).toBe("123");
  });

  it("query string에서 gid를 추출한다", () => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=456`;
    const result = parseSheetUrl(url);
    expect(result.gid).toBe("456");
  });

  it("export CSV URL을 감지한다", () => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
    const result = parseSheetUrl(url);
    expect(result.isExportCsv).toBe(true);
  });

  it("일반 edit URL은 isExportCsv가 false다", () => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=0`;
    const result = parseSheetUrl(url);
    expect(result.isExportCsv).toBe(false);
  });

  it("유효하지 않은 URL이면 spreadsheetId가 undefined다", () => {
    expect(() => parseSheetUrl("not-a-url")).toThrow();
  });
});

describe("csvToJson", () => {
  it("헤더를 키로 사용해 JSON 배열을 반환한다", () => {
    const csv = `name,email\n홍길동,hong@example.com\n김철수,kim@example.com`;
    const result = csvToJson(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: "홍길동", email: "hong@example.com" });
    expect(result[1]).toEqual({ name: "김철수", email: "kim@example.com" });
  });

  it("빈 줄을 무시한다", () => {
    const csv = `name,email\n홍길동,hong@example.com\n\n김철수,kim@example.com`;
    const result = csvToJson(csv);
    expect(result).toHaveLength(2);
  });

  it("빈 CSV면 빈 배열을 반환한다", () => {
    const result = csvToJson("name,email\n");
    expect(result).toHaveLength(0);
  });
});
