// /api/campaigns — 이메일 캠페인 목록 조회 / 생성
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1),
  templateId: z.string().min(1),
  eventId: z.string().min(1),
  scheduledAt: z.string().datetime().optional(),
});

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const campaigns = await prisma.emailCampaign.findMany({
    where: { userId },
    include: {
      template: { select: { id: true, name: true, subject: true } },
      event: { select: { id: true, title: true } },
      _count: { select: { deliveries: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, campaigns });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, templateId, eventId, scheduledAt } = createSchema.parse(body);

    // 템플릿 소유자 확인
    const template = await prisma.emailTemplate.findFirst({ where: { id: templateId, userId } });
    if (!template) return NextResponse.json({ ok: false, error: "템플릿을 찾을 수 없습니다." }, { status: 404 });

    // 행사 소유자 확인
    const event = await prisma.event.findFirst({ where: { id: eventId, ownerId: userId } });
    if (!event) return NextResponse.json({ ok: false, error: "행사를 찾을 수 없습니다." }, { status: 404 });

    const campaign = await prisma.emailCampaign.create({
      data: {
        name,
        templateId,
        eventId,
        userId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: "DRAFT",
      },
      include: {
        template: { select: { id: true, name: true, subject: true } },
        event: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ ok: true, campaign }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
