import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { encrypt, decrypt, decryptJson } from "@/src/lib/crypto";

const patchSchema = z.object({
  emailSubject: z.string().optional(),
  emailContent: z.string().optional(),
  title: z.string().min(1).optional(),
  date: z.string().optional().nullable(),
  place: z.string().optional().nullable(),
  sheetUrl: z.string().url().optional().nullable().or(z.literal("")),
  posterUrl: z.string().url().optional().nullable(),
  status: z.enum(["ONGOING", "CLOSED"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const ownerId = session?.user?.id;
    if (!ownerId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { id } = await params;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    if (event.ownerId !== ownerId) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const body = await req.json();
    const parsed = patchSchema.parse(body);

    // sheetUrl은 저장 전 암호화
    const dbData: Record<string, unknown> = { ...parsed };
    if ("sheetUrl" in parsed) {
      dbData.sheetUrl = parsed.sheetUrl ? encrypt(parsed.sheetUrl) : null;
    }
    // date가 빈 문자열이면 null 처리
    if ("date" in parsed && parsed.date === "") {
      dbData.date = null;
    } else if ("date" in parsed && parsed.date) {
      dbData.date = new Date(parsed.date);
    }

    const updated = await prisma.event.update({ where: { id }, data: dbData });
    return NextResponse.json({
      ok: true,
      event: { ...updated, sheetUrl: updated.sheetUrl ? decrypt(updated.sheetUrl) : null },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const ownerId = session?.user?.id;
    if (!ownerId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: { data: true },
    });

    if (!event) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }
    if (event.ownerId !== ownerId) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // 이 행사의 모든 캠페인 발송 기록을 이메일 기준으로 집계 (최근 발송 기준)
    const deliveries = await prisma.emailDelivery.findMany({
      where: { campaign: { eventId: id } },
      orderBy: { createdAt: "desc" },
      select: { recipientEmail: true, status: true, sentAt: true, openedAt: true, createdAt: true },
    });

    // 이메일별 가장 최근 delivery만 유지
    const deliveryMap: Record<string, { status: string; sentAt: string | null; openedAt: string | null }> = {};
    for (const d of deliveries) {
      if (!deliveryMap[d.recipientEmail]) {
        deliveryMap[d.recipientEmail] = {
          status: d.status,
          sentAt: d.sentAt?.toISOString() ?? null,
          openedAt: d.openedAt?.toISOString() ?? null,
        };
      }
    }

    const eventForResponse = {
      ...event,
      sheetUrl: event.sheetUrl ? decrypt(event.sheetUrl) : null,
      data: event.data ? { ...event.data, payload: decryptJson(event.data.payload as string) } : null,
    };
    return NextResponse.json({ ok: true, event: eventForResponse, deliveryMap });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const ownerId = session?.user?.id;
    if (!ownerId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }
    if (event.ownerId !== ownerId) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    await prisma.event.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
