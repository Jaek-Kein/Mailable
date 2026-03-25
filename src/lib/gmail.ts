// src/lib/gmail.ts
// Gmail API를 통해 로그인된 Google 계정으로 이메일을 발송합니다.

import { google } from "googleapis";
import { prisma } from "@/src/lib/prisma";

interface SendMailOptions {
  userId: string; // DB User.id
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/**
 * DB에서 유저의 Google 계정 토큰을 조회하여 Gmail API로 메일을 발송합니다.
 * 첫 로그인 시 access_type=offline + prompt=consent 로 refresh_token이 발급되어야 합니다.
 */
export async function sendGmail(opts: SendMailOptions): Promise<SendResult> {
  const { userId, to, subject, html, text } = opts;

  // 유저의 Google OAuth 계정 토큰 조회
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.refresh_token) {
    return {
      ok: false,
      error:
        "Gmail 발송에 필요한 refresh_token이 없습니다. 다시 로그인(Google 재동의)이 필요합니다.",
    };
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!
  );

  oauth2Client.setCredentials({
    refresh_token: account.refresh_token,
    access_token: account.access_token ?? undefined,
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // RFC 2822 메시지 작성
  const bodyText = text ?? html.replace(/<[^>]*>/g, "");
  const boundary = `boundary_${Date.now()}`;
  const message = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(bodyText).toString("base64"),
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(html).toString("base64"),
    "",
    `--${boundary}--`,
  ].join("\r\n");

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  try {
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });

    // 갱신된 access_token 저장
    const newTokens = (await oauth2Client.getAccessToken()).token;
    if (newTokens && newTokens !== account.access_token) {
      await prisma.account.update({
        where: { id: account.id },
        data: { access_token: newTokens },
      });
    }

    return { ok: true, messageId: res.data.id ?? undefined };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/**
 * 플레이스홀더 {{key}} 를 데이터로 치환합니다.
 */
export function renderTemplate(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`);
}
