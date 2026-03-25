// PATCH /api/events/[id]/data — 참가자 행 수정
// body: { rowIndex: number; updates: Record<string, string> }
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

const patchSchema = z.object({
  rowIndex: z.number().int().min(0),
  updates: z.record(z.string()),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const ownerId = session?.user?.id;
  if (!ownerId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // 소유권 확인
  const event = await prisma.event.findUnique({ where: { id }, select: { ownerId: true } });
  if (!event) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  if (event.ownerId !== ownerId) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { rowIndex, updates } = parsed.data;

  const eventData = await prisma.eventData.findUnique({ where: { eventId: id } });
  if (!eventData) return NextResponse.json({ ok: false, error: "데이터 없음" }, { status: 404 });

  const payload = eventData.payload as { rows: Record<string, string>[] };
  const rows: Record<string, string>[] = Array.isArray(payload?.rows) ? payload.rows : [];

  if (rowIndex >= rows.length) {
    return NextResponse.json({ ok: false, error: "rowIndex out of range" }, { status: 400 });
  }

  // 기존 행에 업데이트 병합 (새 키는 추가하지 않음 — 기존 컬럼만 수정)
  const updatedRow = { ...rows[rowIndex] };
  for (const key of Object.keys(updates)) {
    if (key in updatedRow) updatedRow[key] = updates[key];
  }

  const updatedRows = rows.map((r, i) => (i === rowIndex ? updatedRow : r));

  const updated = await prisma.eventData.update({
    where: { eventId: id },
    data: { payload: { rows: updatedRows }, updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true, row: updatedRow, version: updated.version });
}
