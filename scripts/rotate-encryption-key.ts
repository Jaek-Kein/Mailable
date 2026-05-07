/**
 * 암호화 키 로테이션 마이그레이션 스크립트
 *
 * 사용법:
 *   OLD_ENCRYPTION_KEY=<기존 64자리 hex> NEW_ENCRYPTION_KEY=<새 64자리 hex> npx tsx scripts/rotate-encryption-key.ts
 *
 * 멱등성 보장:
 *   - 각 값을 OLD_KEY로 복호화 시도, 실패하면 NEW_KEY로 시도
 *   - NEW_KEY로 복호화 성공 = 이미 로테이션 완료된 레코드 → 건너뜀
 *   - 중단 후 재실행해도 안전
 *
 * 암호화 대상 필드:
 *   - Account: refresh_token, access_token, id_token
 *   - Event: sheetUrl
 *   - EventData: payload
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env") });

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ALGORITHM = "aes-256-gcm";
const ENCRYPTED_PATTERN = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/i;

function getKey(keyHex: string | undefined, label: string): Buffer {
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(`${label}가 없거나 형식이 잘못되었습니다. 64자리 hex 문자열이어야 합니다.`);
  }
  return Buffer.from(keyHex, "hex");
}

function encryptWith(key: Buffer, plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function tryDecryptWith(key: Buffer, value: string): string | null {
  if (!ENCRYPTED_PATTERN.test(value)) {
    // 평문 레거시값
    return value;
  }
  try {
    const [ivHex, authTagHex, encryptedHex] = value.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
  } catch {
    return null; // 키 불일치
  }
}

/**
 * 멱등 로테이션:
 *   - OLD_KEY로 복호화 성공 → NEW_KEY로 재암호화 (로테이션 대상)
 *   - NEW_KEY로 복호화 성공 → 이미 완료, 그대로 반환
 *   - 둘 다 실패 → 예외 (데이터 손상 가능성)
 */
function rotateValue(
  oldKey: Buffer,
  newKey: Buffer,
  value: string | null
): { result: string | null; skipped: boolean } {
  if (!value) return { result: value, skipped: true };

  // 이미 NEW_KEY로 암호화된 경우 → 건너뜀
  const alreadyNew = tryDecryptWith(newKey, value);
  if (alreadyNew !== null) {
    // 평문이거나 NEW_KEY로 복호화 성공
    // 단, OLD_KEY로도 복호화되는 경우(우연한 충돌)를 구분하기 위해 OLD_KEY 먼저 시도
    const withOld = tryDecryptWith(oldKey, value);
    if (withOld !== null) {
      // OLD_KEY로 복호화 가능 → 아직 로테이션 안 된 것
      return { result: encryptWith(newKey, withOld), skipped: false };
    }
    // OLD_KEY 실패, NEW_KEY 성공 → 이미 완료
    return { result: value, skipped: true };
  }

  // NEW_KEY 실패 → OLD_KEY 시도
  const withOld = tryDecryptWith(oldKey, value);
  if (withOld !== null) {
    return { result: encryptWith(newKey, withOld), skipped: false };
  }

  throw new Error(`복호화 실패: OLD/NEW 키 모두 실패. 값 앞 20자: ${value.slice(0, 20)}`);
}

async function main() {
  const oldKeyHex = process.env.OLD_ENCRYPTION_KEY;
  const newKeyHex = process.env.NEW_ENCRYPTION_KEY;

  const oldKey = getKey(oldKeyHex, "OLD_ENCRYPTION_KEY");
  const newKey = getKey(newKeyHex, "NEW_ENCRYPTION_KEY");

  if (oldKeyHex === newKeyHex) {
    throw new Error("OLD_ENCRYPTION_KEY와 NEW_ENCRYPTION_KEY가 동일합니다.");
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("=== 암호화 키 로테이션 시작 ===\n");

    // ── Account ──────────────────────────────────────────────
    const accounts = await prisma.account.findMany({
      select: { id: true, refresh_token: true, access_token: true, id_token: true },
    });
    console.log(`Account 레코드: ${accounts.length}건`);

    let accountUpdated = 0;
    let accountSkipped = 0;
    for (const acc of accounts) {
      const r = rotateValue(oldKey, newKey, acc.refresh_token ?? null);
      const a = rotateValue(oldKey, newKey, acc.access_token ?? null);
      const i = rotateValue(oldKey, newKey, acc.id_token ?? null);

      if (r.skipped && a.skipped && i.skipped) {
        accountSkipped++;
        continue;
      }

      await prisma.account.update({
        where: { id: acc.id },
        data: { refresh_token: r.result, access_token: a.result, id_token: i.result },
      });
      accountUpdated++;
    }
    console.log(`  → ${accountUpdated}건 업데이트, ${accountSkipped}건 스킵(이미 완료)`);

    // ── Event.sheetUrl ────────────────────────────────────────
    const events = await prisma.event.findMany({
      where: { sheetUrl: { not: null } },
      select: { id: true, sheetUrl: true },
    });
    console.log(`Event.sheetUrl 레코드: ${events.length}건`);

    let eventUpdated = 0;
    let eventSkipped = 0;
    for (const ev of events) {
      const r = rotateValue(oldKey, newKey, ev.sheetUrl ?? null);
      if (r.skipped) { eventSkipped++; continue; }
      await prisma.event.update({ where: { id: ev.id }, data: { sheetUrl: r.result } });
      eventUpdated++;
    }
    console.log(`  → ${eventUpdated}건 업데이트, ${eventSkipped}건 스킵(이미 완료)`);

    // ── EventData.payload ─────────────────────────────────────
    const eventDataList = await prisma.eventData.findMany({
      select: { eventId: true, payload: true },
    });
    console.log(`EventData.payload 레코드: ${eventDataList.length}건`);

    let eventDataUpdated = 0;
    let eventDataSkipped = 0;
    for (const ed of eventDataList) {
      const r = rotateValue(oldKey, newKey, ed.payload);
      if (r.skipped) { eventDataSkipped++; continue; }
      await prisma.eventData.update({
        where: { eventId: ed.eventId },
        data: { payload: r.result! },
      });
      eventDataUpdated++;
    }
    console.log(`  → ${eventDataUpdated}건 업데이트, ${eventDataSkipped}건 스킵(이미 완료)`);

    console.log("\n=== 로테이션 완료 ===");
    console.log("Vercel 환경변수 ENCRYPTION_KEY를 NEW_ENCRYPTION_KEY 값으로 교체 후 재배포하세요.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("\n로테이션 실패:", e.message);
  process.exit(1);
});
