// /api/templates — 이메일 템플릿 목록 조회 / 생성
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  htmlContent: z.string().min(1),
  textContent: z.string().optional().default(""),
});

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const templates = await prisma.emailTemplate.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, templates });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, subject, htmlContent, textContent } = createSchema.parse(body);

    const template = await prisma.emailTemplate.create({
      data: { name, subject, htmlContent, textContent, userId },
    });

    return NextResponse.json({ ok: true, template }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
