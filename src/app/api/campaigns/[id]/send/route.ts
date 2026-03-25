// /api/campaigns/[id]/send — 캠페인 이메일 발송
// EventData.payload.rows 에서 이메일 컬럼을 추출하여 Gmail API로 발송합니다.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { sendGmail, renderTemplate } from "@/src/lib/gmail";
import { DeliveryStatus } from "@prisma/client";

// CSV 행에서 이메일 컬럼 키를 찾습니다 (대소문자 무시)
function findEmailKey(row: Record<string, string>): string | null {
  const candidates = ["email", "이메일", "연락처", "e-mail", "mail"];
  for (const key of Object.keys(row)) {
    if (candidates.includes(key.toLowerCase())) return key;
  }
  return null;
}

function findNameKey(row: Record<string, string>): string | null {
  const candidates = ["name", "이름", "입금자명", "닉네임", "성명", "참가자명"];
  for (const key of Object.keys(row)) {
    if (candidates.includes(key.toLowerCase())) return key;
  }
  return null;
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const campaign = await prisma.emailCampaign.findFirst({
    where: { id, userId },
    include: {
      template: true,
      event: { include: { data: true } },
    },
  });

  if (!campaign) return NextResponse.json({ ok: false, error: "캠페인을 찾을 수 없습니다." }, { status: 404 });
  if (campaign.status === "SENDING" || campaign.status === "COMPLETED") {
    return NextResponse.json({ ok: false, error: "이미 발송됐거나 발송 중인 캠페인입니다." }, { status: 409 });
  }

  const rows: Record<string, string>[] =
    (campaign.event.data?.payload as { rows?: Record<string, string>[] } | null)?.rows ?? [];

  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: "발송할 참가자 데이터가 없습니다. 먼저 Sheets 데이터를 수집하세요." }, { status: 422 });
  }

  // 발송 시작 — 상태 SENDING으로 변경
  await prisma.emailCampaign.update({ where: { id }, data: { status: "SENDING" } });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  let sentCount = 0;
  let failCount = 0;
  const errors: { email: string; reason: string }[] = [];

  for (const row of rows) {
    const emailKey = findEmailKey(row);
    if (!emailKey) {
      failCount++;
      errors.push({ email: "(unknown)", reason: "이메일 컬럼을 찾을 수 없습니다. 컬럼명이 'email' 또는 '이메일'인지 확인하세요." });
      continue;
    }
    const recipientEmail = row[emailKey]?.trim();
    if (!recipientEmail || !recipientEmail.includes("@")) {
      failCount++;
      errors.push({ email: recipientEmail ?? "(비어있음)", reason: "유효하지 않은 이메일 주소입니다." });
      continue;
    }

    const nameKey = findNameKey(row);
    const recipientName = nameKey ? row[nameKey]?.trim() : undefined;

    // 플레이스홀더 치환: 행 데이터 전체를 context로 사용
    const htmlWithTracking =
      renderTemplate(campaign.template.htmlContent, row) +
      `<img src="${baseUrl}/api/track/open/${id}?e=${encodeURIComponent(recipientEmail)}" width="1" height="1" style="display:none" />`;
    const text = renderTemplate(campaign.template.textContent, row);
    const subject = renderTemplate(campaign.template.subject, row);

    // DB에 배달 레코드 생성
    const delivery = await prisma.emailDelivery.create({
      data: { campaignId: id, recipientEmail, recipientName, status: "PENDING" },
    });

    const result = await sendGmail({ userId, to: recipientEmail, subject, html: htmlWithTracking, text });

    const newStatus: DeliveryStatus = result.ok ? "SENT" : "FAILED";
    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: newStatus,
        sentAt: result.ok ? new Date() : null,
        errorMessage: result.error ?? null,
      },
    });

    if (result.ok) sentCount++;
    else {
      failCount++;
      errors.push({ email: recipientEmail, reason: result.error ?? "알 수 없는 오류" });
    }
  }

  // 캠페인 완료 상태 업데이트
  const finalStatus = failCount === rows.length ? "FAILED" : "COMPLETED";
  await prisma.emailCampaign.update({ where: { id }, data: { status: finalStatus } });

  return NextResponse.json({ ok: true, sentCount, failCount, total: rows.length, errors });
}
