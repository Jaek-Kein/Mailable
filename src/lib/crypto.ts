// src/lib/crypto.ts
// AES-256-GCM 대칭 암호화 유틸리티
// DB에 저장되는 민감한 토큰(refresh_token, access_token) 암호화에 사용

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

// 암호화된 값 패턴: 24자 IV + 32자 AuthTag + N자 ciphertext (모두 hex, `:` 구분)
const ENCRYPTED_PATTERN = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/i;

function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY 환경 변수가 없거나 형식이 잘못되었습니다. " +
        "64자리 hex 문자열(32바이트)이어야 합니다."
    );
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * JSON 직렬화 가능한 값을 암호화합니다.
 * JSON.stringify → encrypt 순서로 처리합니다.
 */
export function encryptJson(value: unknown): string {
  return encrypt(JSON.stringify(value));
}

/**
 * `encryptJson`으로 암호화된 값을 복호화하여 원래 객체로 반환합니다.
 * 암호화되지 않은 레거시 JSON 문자열도 처리합니다.
 */
export function decryptJson<T>(value: string): T {
  try {
    return JSON.parse(decrypt(value)) as T;
  } catch (e) {
    console.error("[crypto] decryptJson 실패 — 값 길이:", value?.length, e instanceof Error ? e.message : e);
    throw e;
  }
}

/**
 * 평문을 AES-256-GCM으로 암호화합니다.
 * 반환 형식: `hex(iv):hex(authTag):hex(ciphertext)`
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // GCM 권장 96-bit IV
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * 암호화된 값을 복호화합니다.
 * 암호화된 형식이 아닌 경우(기존 평문 토큰 등) 원본 그대로 반환합니다.
 */
export function decrypt(value: string): string {
  if (!ENCRYPTED_PATTERN.test(value)) {
    // 아직 암호화되지 않은 레거시 평문값 — 그대로 반환
    return value;
  }

  const [ivHex, authTagHex, encryptedHex] = value.split(":");
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}
