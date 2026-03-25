// /api/campaigns/[id] — 캠페인 단건 조회 / 수정 / 삭제
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
});

async function getOwnedCampaign(id: string, userId: string) {
  return prisma.emailCampaign.findFirst({
    where: { id, userId },
    include: {
      template: true,
      event: { select: { id: true, title: true } },
      deliveries: { orderBy: { createdAt: "desc" } },
      _count: { select: { deliveries: true } },
    },
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaign = await getOwnedCampaign(id, userId);
  if (!campaign) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true, campaign });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.emailCampaign.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  if (["SENDING", "COMPLETED"].includes(existing.status)) {
    return NextResponse.json({ ok: false, error: "발송 중이거나 완료된 캠페인은 수정할 수 없습니다." }, { status: 409 });
  }

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);
    const campaign = await prisma.emailCampaign.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
      },
      include: {
        template: { select: { id: true, name: true, subject: true } },
        event: { select: { id: true, title: true } },
      },
    });
    return NextResponse.json({ ok: true, campaign });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaign = await prisma.emailCampaign.findFirst({ where: { id, userId } });
  if (!campaign) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  if (campaign.status === "SENDING") {
    return NextResponse.json({ ok: false, error: "발송 중인 캠페인은 삭제할 수 없습니다." }, { status: 409 });
  }

  await prisma.emailCampaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
