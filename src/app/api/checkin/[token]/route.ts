// GET /api/checkin/[token] — QR 코드 스캔 시 체크인 처리
// 토큰 검증 → checkinMap 업데이트 → 결과 페이지로 리다이렉트
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { verifyCheckinToken } from "@/src/lib/checkinToken";
import { encryptJson, decryptJson } from "@/src/lib/crypto";

type Payload = {
  rows: Record<string, string>[];
  checkinMap?: Record<string, string | null>;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const base = process.env.NEXTAUTH_URL ?? "";

  const checkinPayload = verifyCheckinToken(token);
  if (!checkinPayload) {
    return NextResponse.redirect(`${base}/checkin/invalid`);
  }

  const { eventId, rid } = checkinPayload;

  const eventData = await prisma.eventData.findUnique({ where: { eventId } });
  if (!eventData) {
    return NextResponse.redirect(`${base}/checkin/invalid`);
  }

  let payload: Payload;
  try {
    payload = decryptJson<Payload>(eventData.payload);
  } catch {
    return NextResponse.redirect(`${base}/checkin/error`);
  }

  const checkinMap: Record<string, string | null> = { ...(payload.checkinMap ?? {}) };

  // 이미 체크인된 경우 → 중복 스캔 안내 페이지로
  if (checkinMap[rid]) {
    const alreadyAt = encodeURIComponent(checkinMap[rid]!);
    return NextResponse.redirect(`${base}/checkin/already?at=${alreadyAt}`);
  }

  const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  checkinMap[rid] = now;

  await prisma.eventData.update({
    where: { eventId },
    data: { payload: encryptJson({ ...payload, checkinMap }) },
  });

  // 참가자 이름 조회 (결과 페이지에 표시)
  const row = payload.rows.find((r) => r._rid === rid);
  const nameKey = row
    ? Object.keys(row).find((k) =>
        ["name", "이름", "입금자명", "닉네임", "성명", "참가자명"].includes(k.toLowerCase())
      )
    : undefined;
  const name = nameKey && row ? row[nameKey] : "";

  return NextResponse.redirect(
    `${base}/checkin/done?name=${encodeURIComponent(name)}&at=${encodeURIComponent(now)}`
  );
}
