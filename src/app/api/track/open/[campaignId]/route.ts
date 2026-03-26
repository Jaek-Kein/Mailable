// /api/track/open/[campaignId]?e=<email> — 이메일 오픈 추적 픽셀
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

// 1×1 투명 GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const email = req.nextUrl.searchParams.get("e");

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && EMAIL_RE.test(email)) {
    // 최초 오픈만 기록
    try {
      await prisma.emailDelivery.updateMany({
        where: { campaignId, recipientEmail: email, openedAt: null },
        data: { openedAt: new Date(), status: "OPENED" },
      });
    } catch (e) {
      console.error("[track/open] DB 업데이트 실패:", e);
    }
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
