// /api/templates/[id] — 이메일 템플릿 단건 조회 / 수정 / 삭제
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  htmlContent: z.string().min(1).optional(),
  textContent: z.string().optional(),
});

async function getOwnedTemplate(id: string, userId: string) {
  return prisma.emailTemplate.findFirst({ where: { id, userId } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const template = await getOwnedTemplate(id, userId);
  if (!template) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true, template });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await getOwnedTemplate(id, userId);
  if (!existing) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    const template = await prisma.emailTemplate.update({ where: { id }, data });
    return NextResponse.json({ ok: true, template });
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
  const existing = await getOwnedTemplate(id, userId);
  if (!existing) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  // 활성 캠페인에서 사용 중이면 삭제 불가
  const activeCampaign = await prisma.emailCampaign.findFirst({
    where: { templateId: id, status: { in: ["SENDING", "SCHEDULED"] } },
  });
  if (activeCampaign) {
    return NextResponse.json(
      { ok: false, error: "활성 캠페인에서 사용 중인 템플릿은 삭제할 수 없습니다." },
      { status: 409 }
    );
  }

  await prisma.emailTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
