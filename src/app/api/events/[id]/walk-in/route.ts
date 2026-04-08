// POST /api/events/[id]/walk-in — 현장예매 인원 추가
// body: { name: string }
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { encryptJson, decryptJson } from "@/src/lib/crypto";

const schema = z.object({
  name: z.string().min(1).max(100),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const ownerId = session?.user?.id;
  if (!ownerId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const event = await prisma.event.findUnique({ where: { id }, select: { ownerId: true } });
  if (!event) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  if (event.ownerId !== ownerId) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { name } = parsed.data;

  const eventData = await prisma.eventData.findUnique({ where: { eventId: id } });
  if (!eventData) return NextResponse.json({ ok: false, error: "데이터 없음" }, { status: 404 });

  let payload: {
    rows: Record<string, string>[];
    cancelledRids?: string[];
    checkinMap?: Record<string, string | null>;
    paidRids?: string[];
  };
  try {
    payload = decryptJson<typeof payload>(eventData.payload);
  } catch {
    return NextResponse.json({ ok: false, error: "데이터 복호화에 실패했습니다." }, { status: 500 });
  }

  // 고유 _rid 생성 (현장예매 prefix + timestamp + 랜덤)
  const rid = `walkin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // 기존 컬럼 키 감지 (첫 번째 행 기준)
  const firstRow = payload.rows[0] ?? {};
  const emailKey = Object.keys(firstRow).find((k) =>
    ["email", "이메일", "연락처", "e-mail", "mail"].includes(k.toLowerCase())
  ) ?? "이메일";
  const nameKey = Object.keys(firstRow).find((k) =>
    ["name", "이름", "입금자명", "닉네임", "성명", "참가자명"].includes(k.toLowerCase())
  ) ?? "이름";
  const tsKey = Object.keys(firstRow).find((k) =>
    ["타임스탬프", "timestamp", "제출 시간", "응답 날짜", "응답시간"].includes(k.toLowerCase())
  ) ?? null;

  const newRow: Record<string, string> = {
    _rid: rid,
    [nameKey]: name,
    [emailKey]: `현장예매_${rid}`,
  };
  if (tsKey) {
    newRow[tsKey] = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  }

  const rows = [...payload.rows, newRow];
  const paidRids = [...(payload.paidRids ?? []), rid];

  await prisma.eventData.update({
    where: { eventId: id },
    data: {
      payload: encryptJson({ ...payload, rows, paidRids }),
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, row: newRow, paidRids });
}
