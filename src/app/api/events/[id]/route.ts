import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";

export async function GET(
  req: NextRequest,
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

    return NextResponse.json({ ok: true, event });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const ownerId = session?.user?.id;
    if (!ownerId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 본인 소유 행사인지 확인 후 삭제
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }
    if (event.ownerId !== ownerId) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    await prisma.event.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}
