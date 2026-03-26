// POST /api/events/[id]/payment — 입금 확인 토글 (단건 또는 일괄)
// body: { rowId: string, paid: boolean } | { rowIds: string[], paid: boolean }
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { encryptJson, decryptJson } from "@/src/lib/crypto";

const schema = z.object({
  rowId: z.string().min(1).optional(),
  rowIds: z.array(z.string().min(1)).min(1).optional(),
  paid: z.boolean(),
}).refine((d) => d.rowId !== undefined || d.rowIds !== undefined, {
  message: "rowId 또는 rowIds 중 하나는 필수입니다",
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

  const { paid } = parsed.data;
  const targets: string[] = parsed.data.rowIds ?? (parsed.data.rowId ? [parsed.data.rowId] : []);

  const eventData = await prisma.eventData.findUnique({ where: { eventId: id } });
  if (!eventData) return NextResponse.json({ ok: false, error: "데이터 없음" }, { status: 404 });

  const payload = decryptJson<{
    rows: Record<string, string>[];
    cancelledRids?: string[];
    checkinMap?: Record<string, string | null>;
    paidRids?: string[];
  }>(eventData.payload);

  let paidRids: string[] = Array.isArray(payload?.paidRids) ? payload.paidRids : [];

  if (paid) {
    for (const rid of targets) {
      if (!paidRids.includes(rid)) {
        paidRids = [...paidRids, rid];
      }
    }
  } else {
    const targetSet = new Set(targets);
    paidRids = paidRids.filter((r) => !targetSet.has(r));
  }

  await prisma.eventData.update({
    where: { eventId: id },
    data: {
      payload: encryptJson({ ...payload, paidRids }),
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, paidRids });
}
