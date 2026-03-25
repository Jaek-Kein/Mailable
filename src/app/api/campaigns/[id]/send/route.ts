// /api/campaigns/[id]/send — 캠페인 이메일 발송
// EventData.payload.rows 에서 이메일 컬럼을 추출하여 Gmail API로 발송합니다.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { sendGmail, renderTemplate } from "@/src/lib/gmail";
import { DeliveryStatus } from "@prisma/client";

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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const campaign = await prisma.emailCampaign.findFirst({
    where: { id, userId },
    include: {
      event: { include: { data: true } },
    },
  });

  if (!campaign) return NextResponse.json({ ok: false, error: "캠페인을 찾을 수 없습니다." }, { status: 404 });
  if (campaign.status === "SENDING" || campaign.status === "COMPLETED") {
    return NextResponse.json({ ok: false, error: "이미 발송됐거나 발송 중인 캠페인입니다." }, { status: 409 });
  }

  const { emailSubject, emailContent } = campaign.event;
  if (!emailSubject || !emailContent) {
    return NextResponse.json({ ok: false, error: "행사에 이메일 템플릿(제목/내용)이 설정되어 있지 않습니다." }, { status: 422 });
  }

  const body = await req.json().catch(() => ({}));
  const rowIndices: number[] | undefined = Array.isArray(body.rowIndices) ? body.rowIndices : undefined;

  const allRows: Record<string, string>[] =
    (campaign.event.data?.payload as { rows?: Record<string, string>[] } | null)?.rows ?? [];

  const rows = rowIndices ? allRows.filter((_, i) => rowIndices.includes(i)) : allRows;

  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: "발송할 참가자 데이터가 없습니다. 먼저 Sheets 데이터를 수집하세요." }, { status: 422 });
  }

  // 발송 시작 — 상태 SENDING으로 변경
  await prisma.emailCampaign.update({ where: { id }, data: { status: "SENDING" } });

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

    // 플레이스홀더 치환: 행 데이터 + 행사 제목
    const context = { ...row, 행사명: campaign.event.title };
    const subject = renderTemplate(emailSubject, context);
    const content = renderTemplate(emailContent, context);

    // DB에 배달 레코드 생성
    const delivery = await prisma.emailDelivery.create({
      data: { campaignId: id, recipientEmail, recipientName, status: "PENDING" },
    });

    const result = await sendGmail({ userId, to: recipientEmail, subject, content });

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

  const finalStatus = failCount === rows.length ? "FAILED" : "COMPLETED";
  await prisma.emailCampaign.update({ where: { id }, data: { status: finalStatus } });

  return NextResponse.json({ ok: true, sentCount, failCount, total: rows.length, errors });
}
