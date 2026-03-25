export const EMAIL_KEYS = ["email", "이메일", "연락처", "e-mail", "mail"];
export const NAME_KEYS = ["name", "이름", "입금자명", "닉네임", "성명", "참가자명"];
export const TS_KEYS = ["타임스탬프", "timestamp", "제출 시간", "응답 날짜", "응답시간"];
export const ALLOWED_KEYS = [...EMAIL_KEYS, ...NAME_KEYS, ...TS_KEYS];

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
