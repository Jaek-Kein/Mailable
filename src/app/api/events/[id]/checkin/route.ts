// POST /api/events/[id]/checkin — 전체 checkinMap bulk save
// body: { checkinMap: Record<string, string | null> }
// sendBeacon은 PATCH를 지원하지 않아 POST로 통일
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { encryptJson, decryptJson } from "@/src/lib/crypto";

const bulkSchema = z.object({ checkinMap: z.record(z.string().nullable()) });

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

  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const eventData = await prisma.eventData.findUnique({ where: { eventId: id } });
  if (!eventData) return NextResponse.json({ ok: false, error: "데이터 없음" }, { status: 404 });

  let payload: { rows: Record<string, string>[]; checkinMap?: Record<string, string | null> };
  try {
    payload = decryptJson<typeof payload>(eventData.payload);
  } catch {
    return NextResponse.json({ ok: false, error: "데이터 복호화에 실패했습니다." }, { status: 500 });
  }

  await prisma.eventData.update({
    where: { eventId: id },
    data: { payload: encryptJson({ ...payload, checkinMap: parsed.data.checkinMap }) },
  });

  return NextResponse.json({ ok: true });
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

  let payload: { rows: Record<string, string>[]; checkinMap?: Record<string, string | null> };
  try {
    payload = decryptJson<typeof payload>(eventData.payload);
  } catch {
    return NextResponse.json({ ok: false, error: "데이터 복호화에 실패했습니다." }, { status: 500 });
  }
  await prisma.eventData.update({
    where: { eventId: id },
    data: { payload: encryptJson({ ...payload, checkinMap: {} }) },
  });

  return NextResponse.json({ ok: true });
}
