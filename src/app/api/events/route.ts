// /app/api/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { z } from "zod";
import { auth } from "@/src/lib/auth";
import { EventStatus } from "@prisma/client";

const schema = z.object({
  title: z.string().min(1),
  date: z.string().datetime().optional(),
  place: z.string().optional(),
  sheetUrl: z.string().url().optional(),
  status: z.nativeEnum(EventStatus).optional(),
  eventData: z.object({ payload: z.any() }).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const ownerId = session?.user?.id;
    if (!ownerId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const events = await prisma.event.findMany({
      where: { ownerId },
      include: { owner: true, data: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ ok: true, events });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const ownerId = session?.user?.id;
    if (!ownerId) return NextResponse.json({ ok:false, error:"unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, date, place, sheetUrl, status, eventData } = schema.parse(body);

    const created = await prisma.event.create({
      data: {
        ownerId,
        title,
        date: date ? new Date(date) : null,
        place,
        sheetUrl,
        status: status ?? EventStatus.ONGOING,
        data: eventData ? { create: { payload: eventData.payload } } : undefined,
      },
      include: { owner: true, data: true },
    });

    return NextResponse.json({ ok: true, data: created });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error: e.message ?? String(e) }, { status: 400 });
  }
}
