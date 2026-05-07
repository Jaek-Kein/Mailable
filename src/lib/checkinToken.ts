// src/lib/checkinToken.ts
// 참가자 체크인용 서명된 토큰 생성 · 검증
// 알고리즘: HMAC-SHA256, base64url 인코딩 (외부 JWT 라이브러리 불필요)

import { createHmac, timingSafeEqual } from "crypto";

export interface CheckinPayload {
  eventId: string;
  rid: string; // 참가자 _rid
}

function getSecret(): string {
  const s = process.env.CHECKIN_SECRET;
  if (!s || s.length < 16)
    throw new Error("CHECKIN_SECRET 환경 변수가 없거나 너무 짧습니다 (최소 16자).");
  return s;
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(data: string): string {
  return b64url(createHmac("sha256", getSecret()).update(data).digest());
}

/** 토큰 생성: `<payload_b64url>.<sig>` */
export function createCheckinToken(payload: CheckinPayload): string {
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

/** 토큰 검증. 유효하면 payload 반환, 실패 시 null */
export function verifyCheckinToken(token: string): CheckinPayload | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot < 0) return null;
    const payloadB64 = token.slice(0, dot);
    const receivedSig = token.slice(dot + 1);
    const expectedSig = sign(payloadB64);

    const a = Buffer.from(receivedSig, "utf8");
    const b = Buffer.from(expectedSig, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const json = Buffer.from(payloadB64, "base64").toString("utf8");
    return JSON.parse(json) as CheckinPayload;
  } catch {
    return null;
  }
}
