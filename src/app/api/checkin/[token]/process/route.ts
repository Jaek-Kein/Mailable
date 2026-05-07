// POST /api/checkin/[token]/process — QR 스캐너(운영자 UI)용 체크인 처리
// GET /api/checkin/[token] 의 JSON 버전 (리다이렉트 없이 결과 반환)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { verifyCheckinToken } from "@/src/lib/checkinToken";
import { encryptJson, decryptJson } from "@/src/lib/crypto";

type Payload = {
  rows: Record<string, string>[];
  checkinMap?: Record<string, string | null>;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const checkinPayload = verifyCheckinToken(token);
  if (!checkinPayload) {
    return NextResponse.json({ status: "invalid" });
  }

  const { eventId, rid } = checkinPayload;

  const eventData = await prisma.eventData.findUnique({ where: { eventId } });
  if (!eventData) {
    return NextResponse.json({ status: "invalid" });
  }

  let payload: Payload;
  try {
    payload = decryptJson<Payload>(eventData.payload);
  } catch {
    return NextResponse.json({ status: "error" });
  }

  const checkinMap: Record<string, string | null> = { ...(payload.checkinMap ?? {}) };

  if (checkinMap[rid]) {
    return NextResponse.json({ status: "already", at: checkinMap[rid] });
  }

  const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  checkinMap[rid] = now;

  await prisma.eventData.update({
    where: { eventId },
    data: { payload: encryptJson({ ...payload, checkinMap }) },
  });

  const row = payload.rows.find((r) => r._rid === rid);
  const nameKey = row
    ? Object.keys(row).find((k) =>
        ["name", "이름", "입금자명", "닉네임", "성명", "참가자명"].includes(k.toLowerCase())
      )
    : undefined;
  const name = nameKey && row ? row[nameKey] : "";

  return NextResponse.json({ status: "success", rid, name, at: now });
}
