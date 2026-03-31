// /api/track/open/[campaignId]?d=<deliveryId> — 이메일 오픈 추적 픽셀
// deliveryId(UUID)를 토큰으로 사용: 이메일 주소를 URL에 노출하지 않음
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

// 1×1 투명 GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const deliveryId = req.nextUrl.searchParams.get("d");

  if (deliveryId) {
    // 최초 오픈만 기록 — campaignId와 deliveryId 둘 다 일치해야 업데이트
    try {
      await prisma.emailDelivery.updateMany({
        where: { id: deliveryId, campaignId, openedAt: null },
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
