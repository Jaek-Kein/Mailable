export const EMAIL_KEYS = ["email", "이메일", "연락처", "e-mail", "mail"];
export const NAME_KEYS = ["name", "이름", "입금자명", "닉네임", "성명", "참가자명"];
export const TS_KEYS = ["타임스탬프", "timestamp", "제출 시간", "응답 날짜", "응답시간"];
export const PAID_KEYS = [
    // 입금 계열
    "입금확인", "입금 확인", "입금여부", "입금 여부", "입금", "입금완료", "입금상태",
    "입금 완료", "입금 상태", "입금체크", "입금 체크",
    // 결제 계열
    "결제확인", "결제 확인", "결제여부", "결제 여부", "결제완료", "결제 완료",
    "결제상태", "결제 상태", "결제",
    // 참가비 계열
    "참가비", "참가비확인", "참가비 확인", "참가비여부", "참가비 여부",
    "참가비납부", "참가비 납부", "참가비입금", "참가비 입금",
    // 납부 계열
    "납부", "납부확인", "납부 확인", "납부여부", "납부 여부",
    "납부완료", "납부 완료", "납부상태", "납부 상태",
    // 영어 계열
    "paid", "payment", "payment_status", "payment status",
    "is_paid", "is paid", "ispaid",
    "deposit", "deposit_confirmed", "deposit confirmed",
];
export const ALLOWED_KEYS = [...EMAIL_KEYS, ...NAME_KEYS, ...TS_KEYS, ...PAID_KEYS];

/** boolean으로 간주되는 truthy 문자열 값 */
const BOOLEAN_TRUE_VALUES = new Set([
    // 영어
    "true", "yes", "y", "1", "o", "ok", "done", "confirmed", "paid", "complete", "completed",
    // 한국어
    "완료", "확인", "입금완료", "입금확인", "결제완료", "결제확인", "납부완료", "납부확인",
    "참가비완료", "참가비확인", "○", "✓", "✔",
]);

/** 컬럼 값이 boolean true로 간주되는지 확인 */
export function isTrueValue(value: string): boolean {
    return BOOLEAN_TRUE_VALUES.has(value.trim().toLowerCase());
}

export function findEmailKey(row: Record<string, string>): string | null {
    for (const key of Object.keys(row)) {
        if (EMAIL_KEYS.includes(key.toLowerCase())) return key;
    }
    return null;
}

export function findNameKey(row: Record<string, string>): string | null {
    for (const key of Object.keys(row)) {
        if (NAME_KEYS.includes(key.toLowerCase())) return key;
    }
    return null;
}
