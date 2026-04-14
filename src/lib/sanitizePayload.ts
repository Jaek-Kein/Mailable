import { EMAIL_KEYS } from "./columnDetection";

export interface EventPayload {
    rows?: Record<string, string>[];
    cancelledRids?: string[];
    checkinMap?: Record<string, string | null>;
    paidRids?: string[];
    [key: string]: unknown;
}

export interface SanitizedEventPayload extends EventPayload {
    rows: Record<string, string>[];
    cancelledRids: string[];
    checkinMap: Record<string, string | null>;
    paidRids: string[];
}

/** 이메일이 없는 빈 행과 그에 연관된 stale rid를 payload에서 제거 */
export function sanitizePayload(payload: Record<string, unknown>): SanitizedEventPayload {
    const rows = Array.isArray(payload.rows) ? (payload.rows as Record<string, string>[]) : [];

    const validRidSet = new Set<string>();
    const cleanRows = rows.filter((row) => {
        // 모든 값이 비어있는 행 제거 (_rid 제외)
        const nonRidEntries = Object.entries(row).filter(([k]) => k !== "_rid");
        if (nonRidEntries.every(([, v]) => !v || v.trim() === "")) return false;
        // 이메일 컬럼이 없거나 값이 없는 행 제거
        const emailKey = Object.keys(row).find((k) =>
            EMAIL_KEYS.some((e) => k.toLowerCase() === e.toLowerCase())
        );
        if (!emailKey) return false;
        const emailVal = row[emailKey]?.trim();
        if (!emailVal) return false;
        if (row._rid) validRidSet.add(row._rid);
        return true;
    });

    const cancelledRids = (Array.isArray(payload.cancelledRids) ? payload.cancelledRids as string[] : []).filter((rid) => validRidSet.has(rid));
    const paidRids = (Array.isArray(payload.paidRids) ? payload.paidRids as string[] : []).filter((rid) => validRidSet.has(rid));
    const rawCheckinMap = (payload.checkinMap && typeof payload.checkinMap === "object" && !Array.isArray(payload.checkinMap))
        ? payload.checkinMap as Record<string, string | null>
        : {};
    const checkinMap = Object.fromEntries(
        Object.entries(rawCheckinMap).filter(([rid]) => validRidSet.has(rid))
    );

    return { ...payload, rows: cleanRows, cancelledRids, paidRids, checkinMap };
}
