// POST /api/events/[id]/checkin — 입장 체크인 상태 토글
// body: { rowId: string; checkedIn: boolean }
// checkinMap은 EventData.payload의 별도 필드에 { [rowId]: ISO_string | null } 형태로 저장
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { encryptJson, decryptJson } from "@/src/lib/crypto";

const bodySchema = z.object({
  rowId: z.string().min(1),
  checkedIn: z.boolean(),
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { rowId, checkedIn } = parsed.data;

  const eventData = await prisma.eventData.findUnique({ where: { eventId: id } });
  if (!eventData) return NextResponse.json({ ok: false, error: "데이터 없음" }, { status: 404 });

  const payload = decryptJson<{ rows: Record<string, string>[]; checkinMap?: Record<string, string | null> }>(eventData.payload);
  const checkinMap: Record<string, string | null> = payload.checkinMap ?? {};

  if (checkedIn) {
    checkinMap[rowId] = new Date().toISOString();
  } else {
    checkinMap[rowId] = null;
  }

  await prisma.eventData.update({
    where: { eventId: id },
    data: { payload: encryptJson({ ...payload, checkinMap }) },
  });

  return NextResponse.json({ ok: true, rowId, checkedIn, checkedInAt: checkinMap[rowId] });
}

// DELETE /api/events/[id]/checkin — 전체 체크인 초기화
export async function DELETE(
  _req: NextRequest,
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

  const eventData = await prisma.eventData.findUnique({ where: { eventId: id } });
  if (!eventData) return NextResponse.json({ ok: false, error: "데이터 없음" }, { status: 404 });

  const payload = decryptJson<{ rows: Record<string, string>[]; checkinMap?: Record<string, string | null> }>(eventData.payload);
  await prisma.eventData.update({
    where: { eventId: id },
    data: { payload: encryptJson({ ...payload, checkinMap: {} }) },
  });

  return NextResponse.json({ ok: true });
}
