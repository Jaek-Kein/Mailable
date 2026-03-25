// /api/cron/send-scheduled — 예약 발송 처리
// Vercel Cron 또는 외부 스케줄러가 주기적으로 호출합니다.
// Authorization: Bearer <CRON_SECRET> 헤더로 보호됩니다.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { sendGmail, renderTemplate } from "@/src/lib/gmail";
import { DeliveryStatus } from "@prisma/client";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  // 보안: CRON_SECRET 검증
  if (CRON_SECRET) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();

  // 예약 시간이 지난 SCHEDULED 캠페인 조회
  const due = await prisma.emailCampaign.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
    include: {
      template: true,
      event: { include: { data: true } },
    },
  });

  if (due.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const results: Array<{ id: string; sentCount: number; failCount: number }> = [];

  for (const campaign of due) {
    // SENDING 상태로 전환
    await prisma.emailCampaign.update({ where: { id: campaign.id }, data: { status: "SENDING" } });

    const rows: Record<string, string>[] =
      (campaign.event.data?.payload as { rows?: Record<string, string>[] } | null)?.rows ?? [];

    let sentCount = 0;
    let failCount = 0;

    for (const row of rows) {
      const emailKey = Object.keys(row).find((k) =>
        ["email", "이메일", "e-mail", "mail"].includes(k.toLowerCase())
      );
      if (!emailKey) { failCount++; continue; }
      const recipientEmail = row[emailKey]?.trim();
      if (!recipientEmail?.includes("@")) { failCount++; continue; }

      const nameKey = Object.keys(row).find((k) =>
        ["name", "이름", "성명", "참가자명"].includes(k.toLowerCase())
      );
      const recipientName = nameKey ? row[nameKey]?.trim() : undefined;

      const htmlWithTracking =
        renderTemplate(campaign.template.htmlContent, row) +
        `<img src="${baseUrl}/api/track/open/${campaign.id}?e=${encodeURIComponent(recipientEmail)}" width="1" height="1" style="display:none" />`;
      const text = renderTemplate(campaign.template.textContent, row);
      const subject = renderTemplate(campaign.template.subject, row);

      const delivery = await prisma.emailDelivery.create({
        data: { campaignId: campaign.id, recipientEmail, recipientName, status: "PENDING" },
      });

      const result = await sendGmail({ userId: campaign.userId, to: recipientEmail, subject, html: htmlWithTracking, text });

      const newStatus: DeliveryStatus = result.ok ? "SENT" : "FAILED";
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: { status: newStatus, sentAt: result.ok ? new Date() : null, errorMessage: result.error ?? null },
      });

      if (result.ok) sentCount++; else failCount++;
    }

    const finalStatus = rows.length === 0 || failCount === rows.length ? "FAILED" : "COMPLETED";
    await prisma.emailCampaign.update({ where: { id: campaign.id }, data: { status: finalStatus } });
    results.push({ id: campaign.id, sentCount, failCount });
  }

  return NextResponse.json({ ok: true, processed: due.length, results });
}

// Vercel Cron은 GET도 지원하므로 GET도 노출
export { POST as GET };
