// /app/api/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { z } from "zod";
import { auth } from "@/src/lib/auth";
import { EventStatus } from "@prisma/client";
import { encrypt, decrypt, encryptJson, decryptJson } from "@/src/lib/crypto";

const schema = z.object({
  title: z.string().min(1),
  date: z.string().datetime().optional(),
  place: z.string().optional(),
  sheetUrl: z.string().url().optional(),
  posterUrl: z.string().url().optional(),
  status: z.nativeEnum(EventStatus).optional(),
  eventData: z.object({ payload: z.any() }).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    const ownerId = session?.user?.id;
    if (!ownerId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    // 날짜가 지난 ONGOING 행사를 CLOSED로 일괄 업데이트
    const now = new Date();
    await prisma.event.updateMany({
      where: {
        ownerId,
        status: EventStatus.ONGOING,
        date: { lt: now, not: null },
      },
      data: { status: EventStatus.CLOSED },
    });

    const events = await prisma.event.findMany({
      where: { ownerId },
      include: { owner: true, data: true },
      orderBy: { createdAt: 'desc' }
    });

    const decryptedEvents = events.map((e) => ({
      ...e,
      sheetUrl: e.sheetUrl ? decrypt(e.sheetUrl) : null,
      data: e.data ? { ...e.data, payload: decryptJson(e.data.payload as string) } : null,
    }));
    return NextResponse.json({ ok: true, events: decryptedEvents });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const ownerId = session?.user?.id;
    if (!ownerId) return NextResponse.json({ ok:false, error:"unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, date, place, sheetUrl, posterUrl, status, eventData } = schema.parse(body);

    const created = await prisma.event.create({
      data: {
        ownerId,
        title,
        date: date ? new Date(date) : null,
        place,
        sheetUrl: sheetUrl ? encrypt(sheetUrl) : undefined,
        posterUrl,
        status: status ?? EventStatus.ONGOING,
        data: eventData ? { create: { payload: encryptJson(eventData.payload) } } : undefined,
      },
      include: { owner: true, data: true },
    });

    return NextResponse.json({ ok: true, data: created });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
