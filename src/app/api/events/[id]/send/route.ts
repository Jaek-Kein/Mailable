// /api/events/[id]/send — 이메일 직접 발송 (캠페인 자동 생성)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { sendGmail, renderTemplate } from "@/src/lib/gmail";
import { decryptJson } from "@/src/lib/crypto";
import { DeliveryStatus } from "@prisma/client";
import { findEmailKey, findNameKey } from "@/src/lib/columnDetection";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { id: eventId } = await params;

    const event = await prisma.event.findFirst({
      where: { id: eventId, ownerId: userId },
      include: { data: true },
    });

    if (!event) return NextResponse.json({ ok: false, error: "행사를 찾을 수 없습니다." }, { status: 404 });

    const { emailSubject, emailContent } = event;
    if (!emailSubject || !emailContent) {
      return NextResponse.json({ ok: false, error: "행사에 이메일 템플릿(제목/내용)이 설정되어 있지 않습니다." }, { status: 422 });
    }

    const body = await req.json().catch(() => ({}));
    const rowIndicesRaw = Array.isArray(body.rowIndices) ? body.rowIndices : undefined;
    const rowIndicesSchema = z.array(z.number().int().nonnegative());
    if (rowIndicesRaw !== undefined) {
      const parsed = rowIndicesSchema.safeParse(rowIndicesRaw);
      if (!parsed.success) {
        return NextResponse.json({ ok: false, error: "rowIndices에 유효하지 않은 값이 포함되어 있습니다." }, { status: 400 });
      }
    }
    const rowIndices: number[] | undefined = rowIndicesRaw;
    const idempotencyKey: string | undefined = typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined;

    // 멱등성 검사: 동일 키로 60초 이내 생성된 캠페인이 있으면 중복 발송 차단
    if (idempotencyKey) {
      const since = new Date(Date.now() - 60_000);
      const existing = await prisma.emailCampaign.findFirst({
        where: { eventId, userId, idempotencyKey, createdAt: { gte: since } },
        select: { id: true, status: true },
      });
      if (existing) {
        return NextResponse.json({ ok: false, error: "이미 진행 중인 발송 요청입니다. 잠시 후 다시 시도하세요." }, { status: 409 });
      }
    }

    const allRows: Record<string, string>[] = event.data?.payload
      ? decryptJson<{ rows: Record<string, string>[] }>(event.data.payload).rows ?? []
      : [];

    const rows = rowIndices ? allRows.filter((_, i) => rowIndices.includes(i)) : allRows;

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "발송할 참가자 데이터가 없습니다. 먼저 Sheets 데이터를 수집하세요." }, { status: 422 });
    }

    // 내부 캠페인 자동 생성 (발송 기록 추적용)
    const campaign = await prisma.emailCampaign.create({
      data: {
        name: `${event.title} — ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
        status: "SENDING",
        userId,
        eventId,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
    });

    let sentCount = 0;
    let failCount = 0;
    const errors: { email: string; reason: string }[] = [];

    // concurrency=5 배치 병렬 발송 (순차 루프 타임아웃 방지)
    const CONCURRENCY = 5;
    const sendOne = async (row: Record<string, string>) => {
      try {
        const emailKey = findEmailKey(row);
        if (!emailKey) {
          failCount++;
          errors.push({ email: "(unknown)", reason: "이메일 컬럼을 찾을 수 없습니다. 컬럼명이 'email' 또는 '이메일'인지 확인하세요." });
          return;
        }
        const recipientEmail = row[emailKey]?.trim();
        if (!recipientEmail || !recipientEmail.includes("@")) {
          failCount++;
          errors.push({ email: recipientEmail ?? "(비어있음)", reason: "유효하지 않은 이메일 주소입니다." });
          return;
        }

        const nameKey = findNameKey(row);
        const recipientName = nameKey ? row[nameKey]?.trim() : undefined;

        const context = { ...row, 행사명: event.title };
        const subject = renderTemplate(emailSubject, context);
        const content = renderTemplate(emailContent, context);

        const delivery = await prisma.emailDelivery.create({
          data: { campaignId: campaign.id, recipientEmail, recipientName, status: "PENDING" },
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
      } catch (e: unknown) {
        failCount++;
        const emailKey = findEmailKey(row);
        const email = emailKey ? (row[emailKey]?.trim() ?? "(unknown)") : "(unknown)";
        errors.push({ email, reason: "처리 중 오류가 발생했습니다." });
        console.error("[send] sendOne 예외:", e);
      }
    };

    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      await Promise.allSettled(rows.slice(i, i + CONCURRENCY).map(sendOne));
    }

    const finalStatus = failCount === rows.length ? "FAILED" : "COMPLETED";
    await prisma.emailCampaign.update({ where: { id: campaign.id }, data: { status: finalStatus } });

    return NextResponse.json({ ok: true, sentCount, failCount, total: rows.length, errors });
  } catch (e: unknown) {
    console.error("[events/send] 예기치 않은 오류:", e);
    return NextResponse.json({ ok: false, error: "이메일 발송 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
