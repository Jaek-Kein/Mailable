// POST /api/events/[id]/cancel — 참가자 참여 취소 / 복원
// body: { rowId: string, cancelled: boolean }
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { encryptJson, decryptJson } from "@/src/lib/crypto";

const schema = z.object({
  rowId: z.string().min(1),
  cancelled: z.boolean(),
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

  const { rowId, cancelled } = parsed.data;

  const eventData = await prisma.eventData.findUnique({ where: { eventId: id } });
  if (!eventData) return NextResponse.json({ ok: false, error: "데이터 없음" }, { status: 404 });

  let payload: { rows: Record<string, string>[]; cancelledRids?: string[]; checkinMap?: Record<string, string | null>; paidRids?: string[] };
  try {
    payload = decryptJson<typeof payload>(eventData.payload);
  } catch {
    return NextResponse.json({ ok: false, error: "데이터 복호화에 실패했습니다." }, { status: 500 });
  }
  const rows: Record<string, string>[] = Array.isArray(payload?.rows) ? payload.rows : [];
  const checkinMap = payload?.checkinMap ?? {};
  const paidRids = payload?.paidRids ?? [];

  let cancelledRids: string[] = Array.isArray(payload?.cancelledRids) ? payload.cancelledRids : [];

  if (cancelled) {
    if (!cancelledRids.includes(rowId)) {
      cancelledRids = [...cancelledRids, rowId];
    }
  } else {
    cancelledRids = cancelledRids.filter((r) => r !== rowId);
  }

  await prisma.eventData.update({
    where: { eventId: id },
    data: {
      payload: encryptJson({ rows, cancelledRids, checkinMap, paidRids }),
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, cancelledRids });
}
