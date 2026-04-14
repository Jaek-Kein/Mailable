"use client";

import styled from "@emotion/styled";
import { useEffect, useState, useMemo, useCallback, memo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useParams, useRouter } from "next/navigation";
import { theme } from "@/src/styles/theme";
import EditEventModal from "@/src/components/EditEventModal";
import { useSheetStore } from "@/src/store/useSheetsStore";

interface EventData {
    payload: { rows: Record<string, string>[]; cancelledEmails?: string[]; paidEmails?: string[] };
    version: number;
}

interface Event {
    id: string;
    title: string;
    date: string | null;
    place: string | null;
    sheetUrl: string | null;
    posterUrl?: string | null;
    emailSubject: string | null;
    emailContent: string | null;
    status: "ONGOING" | "CLOSED";
    createdAt: string;
    data: EventData | null;
}

/* ────────── Palette (derived from theme) ────────── */
const C = {
    ink: theme.color.text,
    inkSoft: theme.color.sub,
    inkMuted: theme.color.muted,
    paper: theme.color.bg,
    accent: theme.color.accent,
    accentLight: theme.color.accentLight,
    border: theme.color.border,
    card: theme.color.card,
} as const;

/* ────────── Styles ────────── */
const Page = styled.main`
    max-width: 960px;
    margin: 2rem auto;
    padding: 0 1.25rem;
    display: grid;
    gap: 1.5rem;

    @media (max-width: 480px) {
        margin: 1.25rem auto;
        padding: 0 1rem;
        gap: 1.25rem;
    }
`;

const Card = styled.section`
    background: ${C.card};
    border: 1px solid ${C.border};
    border-radius: 12px;
    padding: 1.5rem;
    display: grid;
    gap: 0.75rem;
    box-shadow: 0 4px 16px rgba(26, 26, 46, 0.06);

    @media (max-width: 480px) {
        padding: 1.1rem 1rem;
        border-radius: 10px;
    }
`;

const PageTitle = styled.h1`
    margin: 0;
    font-family: var(--font-serif, 'DM Serif Display', serif);
    font-size: 1.6rem;
    color: ${C.ink};
    letter-spacing: -0.3px;

    @media (max-width: 480px) {
        font-size: 1.3rem;
    }
`;

const MetaRow = styled.div`
    display: flex;
    gap: 1.25rem;
    flex-wrap: wrap;
    font-size: 0.875rem;
    color: ${C.inkMuted};

    a { color: ${C.accent}; text-decoration: none; &:hover { text-decoration: underline; } }

    @media (max-width: 480px) {
        gap: 0.5rem 1rem;
        font-size: 0.8rem;
    }
`;

const Badge = styled.span<{ status: "ONGOING" | "CLOSED" }>`
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    background: ${({ status }) => status === "ONGOING" ? "#dcfce7" : "#f1f5f0"};
    color: ${({ status }) => status === "ONGOING" ? "#16a34a" : C.inkMuted};
`;

const SectionTitle = styled.h2`
    margin: 0 0 0.25rem;
    font-family: var(--font-serif, 'DM Serif Display', serif);
    font-size: 1.05rem;
    color: ${C.ink};
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;

    th, td {
        text-align: left;
        padding: 8px 12px;
        border-bottom: 1px solid ${C.border};
    }
    th {
        background: ${C.paper};
        color: ${C.inkMuted};
        font-weight: 500;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.4px;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #faf9f7; }

    @media (max-width: 640px) {
        min-width: 540px;

        th, td {
            padding: 8px 10px;
            font-size: 0.82rem;
        }
    }
`;

const FilterInput = styled.input`
    border: 1px solid ${C.border};
    border-radius: 8px;
    padding: 7px 12px;
    font-size: 0.875rem;
    font-family: var(--font-sans, sans-serif);
    width: 220px;
    background: ${C.paper};
    color: ${C.ink};
    outline: none;
    min-height: 40px;

    &:focus {
        border-color: ${C.accent};
        box-shadow: 0 0 0 3px ${C.accentLight};
        background: #fff;
    }

    @media (max-width: 480px) {
        width: 100%;
        font-size: 1rem; /* iOS 줌 방지 */
        box-sizing: border-box;
    }
`;

const Empty = styled.div`
    color: ${C.inkMuted};
    font-size: 0.875rem;
    padding: 1.5rem 0;
    line-height: 1.6;
`;

const BackButton = styled.button`
    appearance: none;
    border: 1px solid ${C.border};
    background: ${C.card};
    border-radius: 8px;
    padding: 6px 14px;
    font-size: 0.875rem;
    cursor: pointer;
    color: ${C.inkSoft};
    width: fit-content;
    transition: background 0.15s;
    min-height: 36px;
    &:hover { background: ${C.paper}; }
`;

const GhostBtn = styled.button`
    appearance: none;
    background: transparent;
    color: ${C.inkSoft};
    border: 1px solid ${C.border};
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 0.82rem;
    cursor: pointer;
    transition: background 0.15s;
    min-height: 36px;
    &:hover { background: ${C.paper}; }

    @media (max-width: 480px) {
        min-height: 40px;
        padding: 8px 14px;
        font-size: 0.85rem;
    }
`;

const PrimaryBtn = styled.button`
    appearance: none;
    background: ${C.ink};
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 7px 14px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    min-height: 36px;

    &:hover { background: #2d2d4a; transform: translateY(-1px); }
    &:active { transform: translateY(0); }
    &:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

    @media (max-width: 480px) {
        min-height: 40px;
        padding: 9px 16px;
        font-size: 0.9rem;
    }
`;

const Toolbar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 0.5rem;

    @media (max-width: 640px) {
        flex-direction: column;
        align-items: stretch;
        gap: 0.6rem;
    }
`;

const ErrorMessage = styled.div`
    color: #dc2626;
    background: #fef2f2;
    border: 1px solid rgba(220, 38, 38, 0.2);
    border-radius: 8px;
    padding: 0.9rem 1rem;
    font-size: 0.875rem;
`;

const SuccessMsg = styled.div`
    color: #15803d;
    background: #f0fdf4;
    border: 1px solid rgba(21, 128, 61, 0.2);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
`;

/* ────────── Template editor styles ────────── */
const TemplateField = styled.div`display: grid; gap: 0.4rem;`;

const TemplateLabel = styled.label`
    font-size: 0.8rem;
    font-weight: 500;
    color: ${C.inkSoft};
`;

const TemplateInput = styled.input`
    border: 1px solid ${C.border};
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 0.875rem;
    font-family: var(--font-sans, sans-serif);
    width: 100%;
    box-sizing: border-box;
    background: ${C.paper};
    color: ${C.ink};
    outline: none;
    min-height: 44px;

    &:focus {
        border-color: ${C.accent};
        box-shadow: 0 0 0 3px ${C.accentLight};
        background: #fff;
    }

    @media (max-width: 480px) {
        font-size: 1rem; /* iOS 줌 방지 */
    }
`;

const TemplateTextarea = styled.textarea`
    border: 1px solid ${C.border};
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 0.875rem;
    font-family: var(--font-sans, sans-serif);
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    min-height: 180px;
    line-height: 1.6;
    background: ${C.paper};
    color: ${C.ink};
    outline: none;

    &:focus {
        border-color: ${C.accent};
        box-shadow: 0 0 0 3px ${C.accentLight};
        background: #fff;
    }

    @media (max-width: 480px) {
        font-size: 1rem; /* iOS 줌 방지 */
    }
`;

const PlaceholderHint = styled.p`
    margin: 0;
    font-size: 0.76rem;
    color: ${C.inkMuted};
`;

/* ────────── Campaign Modal ────────── */
const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(26, 26, 46, 0.5);
    backdrop-filter: blur(3px);
    display: grid;
    place-items: center;
    z-index: 50;
    padding: 1rem;

    @media (max-width: 480px) {
        padding: 0;
        align-items: flex-end;
    }
`;

const Modal = styled.div`
    background: ${C.card};
    border: 1px solid ${C.border};
    border-radius: 16px;
    padding: 1.75rem;
    width: 100%;
    max-width: 480px;
    display: grid;
    gap: 1.25rem;
    box-shadow: 0 16px 48px rgba(26, 26, 46, 0.18);

    @media (max-width: 480px) {
        border-radius: 20px 20px 0 0;
        max-width: 100%;
        padding: 1.5rem 1.25rem 2rem;
        max-height: 85dvh;
        overflow-y: auto;
    }
`;

const ModalTitle = styled.h2`
    margin: 0;
    font-family: var(--font-serif, 'DM Serif Display', serif);
    font-size: 1.2rem;
    color: ${C.ink};
`;


const ModalFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;

    @media (max-width: 480px) {
        flex-direction: column-reverse;
        gap: 0.5rem;

        button {
            width: 100%;
            justify-content: center;
            padding: 0.7rem 1rem;
        }
    }
`;

/* ────────── Tab Bar ────────── */
const TabBar = styled.div`
    display: flex;
    gap: 0;
    border-bottom: 2px solid ${C.border};
    margin-bottom: -1.5rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
`;

const Tab = styled.button<{ active: boolean }>`
    appearance: none;
    background: none;
    border: none;
    border-bottom: 2px solid ${({ active }) => active ? C.accent : "transparent"};
    margin-bottom: -2px;
    padding: 0.65rem 1.25rem;
    font-size: 0.9rem;
    font-family: var(--font-sans, sans-serif);
    font-weight: ${({ active }) => active ? 600 : 400};
    color: ${({ active }) => active ? C.accent : C.inkMuted};
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
    min-height: 44px;

    &:hover { color: ${C.ink}; }
`;

/* ────────── Attendance Check styles ────────── */
const CheckinStats = styled.div`
    display: flex;
    gap: 0.4rem;
    flex-wrap: nowrap;
    align-items: center;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
`;

const StatChip = styled.div<{ variant?: "success" | "muted" }>`
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 500;
    min-width: 0;
    white-space: nowrap;
    flex-shrink: 0;
    background: ${({ variant }) => variant === "success" ? "#dcfce7" : variant === "muted" ? C.paper : C.accentLight};
    color: ${({ variant }) => variant === "success" ? "#16a34a" : variant === "muted" ? C.inkMuted : C.accent};
    border: 1px solid ${({ variant }) => variant === "success" ? "#bbf7d0" : variant === "muted" ? C.border : "#fdd3c8"};
`;

const CheckinRow = styled.div<{ checked: boolean }>`
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-radius: 10px;
    border: 1px solid ${({ checked }) => checked ? "#bbf7d0" : C.border};
    background: ${({ checked }) => checked ? "#f0fdf4" : C.card};
    transition: background 0.15s, border-color 0.15s;
    cursor: pointer;
    user-select: none;
    min-height: 56px;
    min-width: 0;
    overflow: hidden;

    &:hover {
        background: ${({ checked }) => checked ? "#dcfce7" : C.paper};
    }

    @media (max-width: 480px) {
        gap: 0.75rem;
        padding: 0.75rem;
        flex-wrap: wrap;
    }
`;

const CheckinIndicator = styled.div<{ checked: boolean }>`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid ${({ checked }) => checked ? "#16a34a" : C.border};
    background: ${({ checked }) => checked ? "#16a34a" : "transparent"};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.15s;
    color: #fff;
    font-size: 0.8rem;
`;

const CheckinName = styled.span`
    font-size: 0.9rem;
    font-weight: 500;
    color: ${C.ink};
    min-width: 80px;
    flex-shrink: 0;

    @media (max-width: 480px) {
        min-width: 0;
        flex-shrink: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 120px;
    }
`;

const CheckinEmail = styled.span`
    font-size: 0.8rem;
    color: ${C.inkMuted};
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;

    @media (max-width: 480px) {
        font-size: 0.75rem;
    }
`;

const CheckinTime = styled.span`
    font-size: 0.75rem;
    color: #16a34a;
    white-space: nowrap;
    flex-shrink: 0;

    @media (max-width: 480px) {
        width: 100%;
        padding-left: calc(28px + 0.75rem);
        font-size: 0.7rem;
    }
`;

/* ────────── 초성 검색 ────────── */
const CHOSUNG = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];

function getChosung(str: string): string {
    return str.split("").map((ch) => {
        const code = ch.charCodeAt(0) - 0xAC00;
        if (code < 0 || code > 11171) return ch;
        return CHOSUNG[Math.floor(code / 588)];
    }).join("");
}

function isChosungOnly(str: string): boolean {
    return /^[ㄱ-ㅎ]+$/.test(str);
}

function matchesSearch(target: string, query: string): boolean {
    if (!target || !query) return false;
    const t = target.toLowerCase();
    const q = query.toLowerCase();
    if (t.includes(q)) return true;
    // 초성 검색: 쿼리가 초성으로만 이루어진 경우
    if (isChosungOnly(q)) {
        return getChosung(t).includes(q);
    }
    return false;
}

/* ────────── Column detection ────────── */
const EMAIL_KEYS = ["email", "이메일", "연락처", "e-mail", "mail"];
const NAME_KEYS = ["name", "이름", "입금자명", "닉네임", "성명", "참가자명"];
const TIMESTAMP_KEYS = ["타임스탬프", "timestamp", "제출 시간", "응답 날짜", "응답시간", "submitted_at", "created_at"];

function detectCol(keys: string[], colNames: string[]): string | null {
  for (const col of colNames) {
    if (keys.includes(col.toLowerCase())) return col;
  }
  return null;
}

function getDisplayColumns(colNames: string[]): { key: string; label: string }[] {
  const ts = detectCol(TIMESTAMP_KEYS, colNames);
  const name = detectCol(NAME_KEYS, colNames);
  const email = detectCol(EMAIL_KEYS, colNames);
  return [
    ts    && { key: ts,    label: ts },
    name  && { key: name,  label: name },
    email && { key: email, label: email },
  ].filter(Boolean) as { key: string; label: string }[];
}

/* ────────── Utils ────────── */
function formatDate(value: string | null) {
    if (!value) return "—";
    const d = new Date(value);
    return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}`;
}

function exportCsv(rows: Record<string, string>[], filename: string) {
    if (rows.length === 0) return;
    const cols = Object.keys(rows[0]);
    const header = cols.join(",");
    const body = rows
        .map((r) => cols.map((c) => `"${(r[c] ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const blob = new Blob(["\uFEFF" + header + "\n" + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    // 브라우저가 다운로드를 시작한 뒤 URL 해제 (즉시 해제 시 일부 브라우저에서 다운로드 실패)
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

/* ────────── Delivery status badge ────────── */
type DeliveryStatus = "PENDING" | "SENT" | "DELIVERED" | "OPENED" | "CLICKED" | "BOUNCED" | "FAILED";

const STATUS_LABEL: Record<DeliveryStatus, string> = {
    PENDING: "대기", SENT: "발송됨", DELIVERED: "수신됨",
    OPENED: "열람됨", CLICKED: "클릭됨", BOUNCED: "반송됨", FAILED: "실패",
};

const STATUS_COLOR: Record<DeliveryStatus, { bg: string; color: string }> = {
    PENDING:   { bg: "#f1f5f0", color: C.inkMuted },
    SENT:      { bg: "#dbeafe", color: "#1d4ed8" },
    DELIVERED: { bg: "#dcfce7", color: "#16a34a" },
    OPENED:    { bg: "#d1fae5", color: "#059669" },
    CLICKED:   { bg: "#a7f3d0", color: "#047857" },
    BOUNCED:   { bg: "#fef3c7", color: "#b45309" },
    FAILED:    { bg: "#fee2e2", color: "#dc2626" },
};

function DeliveryBadge({ info }: { info?: { status: string; sentAt: string | null; openedAt: string | null } }) {
    if (!info) {
        return <span style={{ fontSize: "0.75rem", color: C.inkMuted }}>미발송</span>;
    }
    const s = info.status as DeliveryStatus;
    const { bg, color } = STATUS_COLOR[s] ?? { bg: "#f1f5f0", color: C.inkMuted };
    const label = STATUS_LABEL[s] ?? s;
    const tooltip = info.openedAt
        ? `열람: ${new Date(info.openedAt).toLocaleString("ko-KR")}`
        : info.sentAt
        ? `발송: ${new Date(info.sentAt).toLocaleString("ko-KR")}`
        : undefined;
    return (
        <span
            title={tooltip}
            style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: "999px",
                fontSize: "0.72rem",
                fontWeight: 600,
                background: bg,
                color,
                whiteSpace: "nowrap",
                cursor: tooltip ? "help" : "default",
            }}
        >
            {label}
        </span>
    );
}

/* ────────── Checkbox styles ────────── */
const CheckTh = styled.th`width: 36px; padding: 0 0 0 12px !important;`;
const CheckTd = styled.td`width: 36px; padding: 0 0 0 12px !important; cursor: default !important;`;

const SelectBar = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: ${C.accentLight};
    border-radius: 8px;
    font-size: 0.85rem;
    color: ${C.accent};

    @media (max-width: 640px) {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 40;
        border-radius: 16px 16px 0 0;
        padding: 1rem 1.25rem calc(1rem + env(safe-area-inset-bottom));
        box-shadow: 0 -4px 24px rgba(26,26,46,0.12);
        flex-wrap: wrap;
        gap: 0.5rem;
        border-top: 1px solid #fdd3c8;
    }
`;

const SelectBarBtn = styled.button<{ variant?: "primary" | "danger" | "muted" }>`
    appearance: none;
    border: 1.5px solid ${({ variant }) =>
        variant === "primary" ? "#bfdbfe" :
        variant === "danger" ? "#fdd3c8" :
        C.border};
    background: ${({ variant }) =>
        variant === "primary" ? "#eff6ff" :
        variant === "danger" ? C.accentLight :
        C.card};
    color: ${({ variant }) =>
        variant === "primary" ? "#1d4ed8" :
        variant === "danger" ? C.accent :
        C.inkSoft};
    border-radius: 8px;
    padding: 5px 12px;
    font-size: 0.8rem;
    font-weight: 600;
    font-family: var(--font-sans, sans-serif);
    cursor: pointer;
    white-space: nowrap;
    min-height: 32px;
    transition: opacity 0.15s, background 0.15s;
    &:hover { opacity: 0.8; }
    &:active { opacity: 0.6; transform: scale(0.97); }

    @media (max-width: 640px) {
        min-height: 36px;
        padding: 6px 14px;
        font-size: 0.82rem;
    }
`;


const CancelBtn = styled.button<{ cancelled: boolean }>`
    appearance: none;
    border: 1px solid ${({ cancelled }) => cancelled ? "#bbf7d0" : "#fdd3c8"};
    background: ${({ cancelled }) => cancelled ? "#f0fdf4" : C.accentLight};
    color: ${({ cancelled }) => cancelled ? "#16a34a" : C.accent};
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 0.72rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.15s;
    &:hover { opacity: 0.75; }
`;

const PaidBtn = styled.button<{ paid: boolean }>`
    appearance: none;
    border: 1px solid ${({ paid }) => paid ? "#bfdbfe" : C.border};
    background: ${({ paid }) => paid ? "#eff6ff" : "transparent"};
    color: ${({ paid }) => paid ? "#1d4ed8" : C.inkMuted};
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 0.72rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.15s, background 0.15s, border-color 0.15s, color 0.15s;
    &:hover { opacity: 0.75; }
`;

/* ────────── Mobile card list (≤640px) ────────── */
const MobileList = styled.div<{ hasSelection: boolean }>`
    display: none;
    flex-direction: column;
    gap: 0.5rem;

    @media (max-width: 640px) {
        display: flex;
        padding-bottom: ${({ hasSelection }) => hasSelection ? "110px" : "0"};
        transition: padding-bottom 0.2s ease;
    }
`;

const DesktopTable = styled.div`
    @media (max-width: 640px) {
        display: none;
    }
`;

const MobileCard = styled.div<{ cancelled: boolean; checked: boolean }>`
    background: ${({ checked }) => checked ? C.accentLight : C.card};
    border: 1.5px solid ${({ checked, cancelled }) => checked ? C.accent : cancelled ? C.border : C.border};
    border-left-width: ${({ checked }) => checked ? "3.5px" : "1.5px"};
    border-radius: 12px;
    transition: background 0.12s, border-color 0.12s;
    padding: 0.85rem 1rem;
    display: grid;
    gap: 0.5rem;
    opacity: ${({ cancelled }) => cancelled ? 0.55 : 1};
    transition: border-color 0.15s, box-shadow 0.15s;
    box-shadow: ${({ checked }) => checked ? `0 0 0 3px ${C.accentLight}` : "none"};
    position: relative;
    cursor: ${({ cancelled }) => cancelled ? "default" : "pointer"};
    user-select: none;
`;

const MobileCardTop = styled.div`
    display: flex;
    align-items: center;
    gap: 0.6rem;
`;

const MobileCardName = styled.span`
    font-size: 0.95rem;
    font-weight: 600;
    color: ${C.ink};
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const MobileCardEmail = styled.span`
    font-size: 0.78rem;
    color: ${C.inkMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const MobileCardMeta = styled.div`
    font-size: 0.75rem;
    color: ${C.inkMuted};
`;

const MobileCardActions = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.1rem;
    flex-wrap: wrap;
`;

const MobilePaidBtn = styled.button<{ paid: boolean }>`
    appearance: none;
    border: 1.5px solid ${({ paid }) => paid ? "#bfdbfe" : C.border};
    background: ${({ paid }) => paid ? "#eff6ff" : C.paper};
    color: ${({ paid }) => paid ? "#1d4ed8" : C.inkMuted};
    border-radius: 8px;
    padding: 5px 12px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    min-height: 34px;
    transition: opacity 0.15s, background 0.15s, border-color 0.15s;
    &:active { opacity: 0.7; transform: scale(0.97); }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const MobileCancelBtn = styled.button<{ cancelled: boolean }>`
    appearance: none;
    border: 1.5px solid ${({ cancelled }) => cancelled ? "#bbf7d0" : "#fdd3c8"};
    background: ${({ cancelled }) => cancelled ? "#f0fdf4" : C.accentLight};
    color: ${({ cancelled }) => cancelled ? "#16a34a" : C.accent};
    border-radius: 8px;
    padding: 5px 12px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    min-height: 34px;
    transition: opacity 0.15s;
    &:active { opacity: 0.7; transform: scale(0.97); }
`;

const MobileCheckbox = styled.input`
    display: none;
`;

const MobileSelectAllRow = styled.div`
    display: none;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
    font-size: 0.85rem;
    color: ${C.inkMuted};
    border-bottom: 1px solid ${C.border};
    margin-bottom: 0.25rem;

    @media (max-width: 640px) {
        display: flex;
    }
`;

const MobileOnly = styled.div`
    display: none;
    @media (max-width: 640px) { display: contents; }
`;

const MobileToolbar = styled.div`
    display: none;

    @media (max-width: 640px) {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 0.25rem;
    }
`;

const DesktopToolbarActions = styled.div`
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;

    @media (max-width: 640px) {
        display: none;
    }
`;

const MobileToolbarRow = styled.div`
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
`;

/* ────────── AttendanceTab ────────── */
interface AttendanceTabProps {
    eventId: string;
    rows: Record<string, string>[];
    emailColKey: string | null;
    nameColKey: string | null;
    checkinMap: Record<string, string | null>;
    paidRids: Set<string>;
    onCheckinMapChange: (map: Record<string, string | null>) => void;
    onWalkInAdded: (row: Record<string, string>, paidRids: string[]) => void;
}

const AttendanceTab = memo(function AttendanceTab({ eventId, rows, emailColKey, nameColKey, checkinMap, paidRids, onCheckinMapChange, onWalkInAdded }: AttendanceTabProps) {
    const [filter, setFilter] = useState("");
    const [resetting, setResetting] = useState(false);
    const [walkInName, setWalkInName] = useState("");
    const [walkInAdding, setWalkInAdding] = useState(false);
    const [showWalkInInput, setShowWalkInInput] = useState(false);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingMapRef = useRef<Record<string, string | null> | null>(null);

    // 전체 맵을 서버에 저장 (bulk save)
    const flushCheckinMap = useCallback((map: Record<string, string | null>) => {
        fetch(`/api/events/${eventId}/checkin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ checkinMap: map }),
        });
    }, [eventId]);

    // 페이지 이탈 시 미전송 변경사항 sendBeacon으로 강제 전송
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (pendingMapRef.current === null) return;
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            navigator.sendBeacon(
                `/api/events/${eventId}/checkin`,
                new Blob([JSON.stringify({ checkinMap: pendingMapRef.current })], { type: "application/json" })
            );
            pendingMapRef.current = null;
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [eventId]);

    // 입금자만 표시, 기본 이름순 정렬 [A-Z, ㄱ-ㅎ]
    const paidFilteredRows = useMemo(() => {
        const arr = rows.map((r, i) => ({ row: r, i })).filter(({ row }) => row._rid && paidRids.has(row._rid));
        if (nameColKey) {
            arr.sort((a, b) => (a.row[nameColKey] ?? "").localeCompare(b.row[nameColKey] ?? "", "ko"));
        }
        return arr;
    }, [rows, paidRids, nameColKey]);

    const filtered = useMemo(() => {
        if (!filter.trim()) return paidFilteredRows;
        const q = filter.trim();
        return paidFilteredRows.filter(({ row }) => {
            const name = nameColKey ? (row[nameColKey] ?? "") : "";
            const email = emailColKey ? (row[emailColKey] ?? "") : "";
            return matchesSearch(name, q) || matchesSearch(email, q);
        });
    }, [paidFilteredRows, filter, emailColKey, nameColKey]);

    const paidCount = useMemo(
        () => rows.filter((r) => r._rid && paidRids.has(r._rid)).length,
        [rows, paidRids]
    );

    // 입금자 중 체크인된 수
    const checkedInCount = useMemo(
        () => rows.filter((r) => r._rid && paidRids.has(r._rid) && checkinMap[r._rid]).length,
        [checkinMap, rows, paidRids]
    );

    function toggleCheckin(rowId: string, current: boolean) {
        const next = !current;
        const updated = { ...checkinMap, [rowId]: next ? new Date().toISOString() : null };
        // 즉시 UI 반영
        onCheckinMapChange(updated);
        // 미전송 맵 갱신
        pendingMapRef.current = updated;
        // 디바운스: 마지막 토글 후 800ms 뒤에 bulk save
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            flushCheckinMap(updated);
            pendingMapRef.current = null;
            debounceTimerRef.current = null;
        }, 800);
    }

    async function resetAll() {
        if (!confirm("전체 입장 체크를 초기화하시겠습니까?")) return;
        // 진행 중인 디바운스 취소
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        pendingMapRef.current = null;
        setResetting(true);
        await fetch(`/api/events/${eventId}/checkin`, { method: "DELETE" });
        onCheckinMapChange({});
        setResetting(false);
    }

    async function addWalkIn() {
        const name = walkInName.trim();
        if (!name || walkInAdding) return;
        setWalkInAdding(true);
        try {
            const res = await fetch(`/api/events/${eventId}/walk-in`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            const data = await res.json();
            if (data.ok) {
                onWalkInAdded(data.row, data.paidRids);
                setWalkInName("");
                setShowWalkInInput(false);
            }
        } finally {
            setWalkInAdding(false);
        }
    }

    if (rows.length === 0) {
        return (
            <div style={{ display: "grid", gap: "1rem" }}>
                <Empty>수집된 참가자 데이터가 없습니다. 먼저 Sheets URL로 데이터를 수집하세요.</Empty>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {showWalkInInput ? (
                        <>
                            <FilterInput
                                type="text"
                                placeholder="현장예매 참가자 이름"
                                value={walkInName}
                                onChange={(e) => setWalkInName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") addWalkIn(); if (e.key === "Escape") { setShowWalkInInput(false); setWalkInName(""); } }}
                                autoFocus
                                style={{ width: 200 }}
                            />
                            <GhostBtn onClick={addWalkIn} disabled={walkInAdding || !walkInName.trim()}>
                                {walkInAdding ? "추가 중..." : "추가"}
                            </GhostBtn>
                            <GhostBtn onClick={() => { setShowWalkInInput(false); setWalkInName(""); }}>취소</GhostBtn>
                        </>
                    ) : (
                        <GhostBtn onClick={() => setShowWalkInInput(true)}>+ 현장예매 추가</GhostBtn>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: "grid", gap: "1rem" }}>
            {/* 통계 */}
            <CheckinStats>
                <StatChip variant="success">
                    ✓ 입장 완료 {checkedInCount}명
                </StatChip>
                <StatChip variant="muted">
                    미입장 {paidCount - checkedInCount}명
                </StatChip>
                <StatChip>
                    전체 {rows.length}명
                </StatChip>
            </CheckinStats>

            {/* 진행 바 */}
            <div style={{ background: C.border, borderRadius: "999px", height: "6px", overflow: "hidden" }}>
                <div
                    style={{
                        height: "100%",
                        width: `${paidCount > 0 ? (checkedInCount / paidCount) * 100 : 0}%`,
                        background: "#16a34a",
                        borderRadius: "999px",
                        transition: "width 0.3s ease",
                    }}
                />
            </div>

            {/* 툴바 */}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <FilterInput
                    type="search"
                    placeholder="이름 또는 이메일 검색..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{ width: 200 }}
                />
                {showWalkInInput ? (
                    <>
                        <FilterInput
                            type="text"
                            placeholder="현장예매 참가자 이름"
                            value={walkInName}
                            onChange={(e) => setWalkInName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") addWalkIn(); if (e.key === "Escape") { setShowWalkInInput(false); setWalkInName(""); } }}
                            autoFocus
                            style={{ width: 180 }}
                        />
                        <GhostBtn onClick={addWalkIn} disabled={walkInAdding || !walkInName.trim()}>
                            {walkInAdding ? "추가 중..." : "추가"}
                        </GhostBtn>
                        <GhostBtn onClick={() => { setShowWalkInInput(false); setWalkInName(""); }}>취소</GhostBtn>
                    </>
                ) : (
                    <GhostBtn onClick={() => setShowWalkInInput(true)}>+ 현장예매</GhostBtn>
                )}
                <GhostBtn onClick={resetAll} disabled={resetting} style={{ marginLeft: "auto" }}>
                    {resetting ? "초기화 중..." : "전체 초기화"}
                </GhostBtn>
            </div>

            {/* 참가자 목록 */}
            <div style={{ display: "grid", gap: "0.4rem" }}>
                {filtered.length === 0 ? (
                    <Empty>검색 결과가 없습니다.</Empty>
                ) : (
                    filtered.map(({ row, i }) => {
                        const email = emailColKey ? (row[emailColKey] ?? "") : "";
                        const name = nameColKey ? (row[nameColKey] ?? "") : `참가자 ${i + 1}`;
                        const rid = row._rid ?? "";
                        const checkedInAt = rid ? checkinMap[rid] : null;
                        const isCheckedIn = !!checkedInAt;
                        return (
                            <CheckinRow
                                key={rid || i}
                                checked={isCheckedIn}
                                onClick={() => rid && toggleCheckin(rid, isCheckedIn)}
                                role="button"
                                aria-pressed={isCheckedIn}
                            >
                                <CheckinIndicator checked={isCheckedIn}>
                                    {isCheckedIn && "✓"}
                                </CheckinIndicator>
                                <CheckinName>{name || "—"}</CheckinName>
                                <CheckinEmail>{email || "이메일 없음"}</CheckinEmail>
                                {isCheckedIn && checkedInAt && (
                                    <CheckinTime>
                                        {new Date(checkedInAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 입장
                                    </CheckinTime>
                                )}
                                {!rid && (
                                    <span style={{ fontSize: "0.72rem", color: C.inkMuted }}>ID 없음 (재수집 필요)</span>
                                )}
                            </CheckinRow>
                        );
                    })
                )}
            </div>
        </div>
    );
});

/* ────────── TemplateEditor ────────── */
interface TemplateEditorProps {
    eventId: string;
    initialSubject: string;
    initialContent: string;
    hasTemplate: boolean;
    onSaved: (subject: string, content: string) => void;
}

const TemplateEditor = memo(function TemplateEditor({ eventId, initialSubject, initialContent, hasTemplate, onSaved }: TemplateEditorProps) {
    const [subject, setSubject] = useState(initialSubject);
    const [content, setContent] = useState(initialContent);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    async function handleSave() {
        setSaving(true);
        setSaved(false);
        const res = await fetch(`/api/events/${eventId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emailSubject: subject, emailContent: content }),
        });
        const data = await res.json();
        setSaving(false);
        if (data.ok) {
            onSaved(subject, content);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        }
    }

    return (
        <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                <SectionTitle style={{ margin: 0 }}>
                    이메일 템플릿
                    {!hasTemplate && (
                        <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: C.accent, fontWeight: 400 }}>
                            (미설정 — 발송 전 반드시 설정하세요)
                        </span>
                    )}
                </SectionTitle>
                <PrimaryBtn type="button" onClick={handleSave} disabled={saving} style={{ padding: "6px 14px", fontSize: "0.82rem" }}>
                    {saving ? "저장 중..." : saved ? "저장됨 ✓" : "저장"}
                </PrimaryBtn>
            </div>
            <TemplateField>
                <TemplateLabel htmlFor="email-subject">제목</TemplateLabel>
                <TemplateInput
                    id="email-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="예) {{행사명}} 참가 안내드립니다"
                />
            </TemplateField>
            <TemplateField>
                <TemplateLabel htmlFor="email-content">내용</TemplateLabel>
                <TemplateTextarea
                    id="email-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={"안녕하세요, {{이름}}님!\n\n{{행사명}} 행사에 참가 신청해 주셔서 감사합니다.\n\n..."}
                />
            </TemplateField>
            <PlaceholderHint>
                플레이스홀더: <code style={{ background: C.paper, padding: "1px 5px", borderRadius: 4, fontSize: "0.82em" }}>{"{{컬럼명}}"}</code> 형식으로 참가자 데이터가 치환됩니다.
                기본 제공: <code style={{ background: C.paper, padding: "1px 5px", borderRadius: 4, fontSize: "0.82em" }}>{"{{행사명}}"}</code>
            </PlaceholderHint>
        </Card>
    );
});

/* ────────── SendConfirmModal ────────── */
interface SendConfirmModalProps {
    eventTitle: string;
    emailSubject: string | null;
    emailContent: string | null;
    checkedCount: number;
    totalRows: number;
    onClose: () => void;
    onSend: () => Promise<void>;
}

const SendConfirmModal = memo(function SendConfirmModal({ eventTitle, emailSubject, emailContent, checkedCount, totalRows, onClose, onSend }: SendConfirmModalProps) {
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: { preventDefault(): void }) {
        e.preventDefault();
        setSending(true);
        setError(null);
        try {
            await onSend();
        } catch (err) {
            setError(err instanceof Error ? err.message : "이메일 발송에 실패했습니다.");
        } finally {
            setSending(false);
        }
    }

    return (
        <Overlay onClick={(e) => e.target === e.currentTarget && onClose()}>
            <Modal>
                <ModalTitle>이메일 발송</ModalTitle>
                <p style={{ margin: 0, fontSize: "0.875rem", color: C.inkSoft }}>
                    <strong>{eventTitle}</strong> 행사의 선택된 참가자{" "}
                    <strong style={{ color: C.accent }}>{checkedCount}명</strong>
                    에게 이메일을 발송합니다.
                    {checkedCount < totalRows && (
                        <span style={{ color: C.inkMuted, marginLeft: "0.25rem" }}>
                            (전체 {totalRows}명 중)
                        </span>
                    )}
                </p>
                <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: "0.75rem 1rem", fontSize: "0.82rem", color: C.inkSoft }}>
                    <strong>제목:</strong> {emailSubject}<br />
                    <strong>내용:</strong> {(emailContent ?? "").slice(0, 80)}{(emailContent ?? "").length > 80 ? "…" : ""}
                </div>
                <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
                    {error && <ErrorMessage>{error}</ErrorMessage>}
                    <ModalFooter>
                        <GhostBtn type="button" onClick={onClose}>취소</GhostBtn>
                        <PrimaryBtn type="submit" disabled={sending}>
                            {sending ? "발송 중..." : `${checkedCount}명에게 발송`}
                        </PrimaryBtn>
                    </ModalFooter>
                </form>
            </Modal>
        </Overlay>
    );
});

/* ────────── Component ────────── */
export default function EventDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState("");
    const [sortBy, setSortBy] = useState<{ key: "name" | "timestamp" | null; dir: "asc" | "desc" }>({ key: null, dir: "desc" });
    const [deliveryMap, setDeliveryMap] = useState<Record<string, { status: string; sentAt: string | null; openedAt: string | null }>>({});

    const [localRows, setLocalRows] = useState<Record<string, string>[]>([]);
    const [checkedIndices, setCheckedIndices] = useState<Set<number>>(new Set());

    const [modalOpen, setModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [sendResult, setSendResult] = useState<{ sentCount: number; failCount: number; total: number; errors: { email: string; reason: string }[] } | null>(null);
    const [activeTab, setActiveTab] = useState<"email" | "checkin">("email");
    const [checkinMap, setCheckinMap] = useState<Record<string, string | null>>({});
    const [cancelledRids, setCancelledRids] = useState<Set<string>>(new Set());
    const [showCancelled, setShowCancelled] = useState(false);
    const [paidRids, setPaidRids] = useState<Set<string>>(new Set());
    const [pendingRowIds, setPendingRowIds] = useState<Set<string>>(new Set());
    const [refreshing, setRefreshing] = useState(false);
    const ingestFromSheetUrl = useSheetStore((s) => s.ingestFromSheetUrl);

    const handleRefresh = useCallback(async () => {
        if (!event?.sheetUrl || refreshing) return;
        setRefreshing(true);
        const result = await ingestFromSheetUrl(event.sheetUrl, id);
        if (!result) {
            // ingest 성공 시 DB에서 최신 데이터 다시 로드
            const res = await fetch(`/api/events/${id}`);
            const data = await res.json();
            if (data.ok) {
                const loaded: Record<string, string>[] = data.event?.data?.payload?.rows ?? [];
                const dMap = data.deliveryMap ?? {};
                const cMap = data.event?.data?.payload?.checkinMap ?? {};
                const cancelledRidsArr: string[] = data.event?.data?.payload?.cancelledRids ?? [];
                const paidRidsArr: string[] = data.event?.data?.payload?.paidRids ?? [];
                setLocalRows(loaded);
                setDeliveryMap(dMap);
                setCheckinMap(cMap);
                setCancelledRids(new Set(cancelledRidsArr));
                setPaidRids(new Set(paidRidsArr));
                setEvent((prev) => prev ? { ...prev, data: data.event.data } : prev);
            }
        }
        setRefreshing(false);
    }, [event?.sheetUrl, id, ingestFromSheetUrl, refreshing]);


    useEffect(() => {
        const controller = new AbortController();

        fetch(`/api/events/${id}`, { signal: controller.signal })
            .then((r) => r.json())
            .then((data) => {
                if (!data.ok) throw new Error(data.error ?? "행사를 불러오지 못했습니다.");
                setEvent(data.event);
                const loaded: Record<string, string>[] = data.event?.data?.payload?.rows ?? [];
                const dMap: Record<string, { status: string; sentAt: string | null; openedAt: string | null }> = data.deliveryMap ?? {};
                const cMap: Record<string, string | null> = data.event?.data?.payload?.checkinMap ?? {};
                const cancelledRidsArr: string[] = data.event?.data?.payload?.cancelledRids ?? [];
                const paidRidsArr: string[] = data.event?.data?.payload?.paidRids ?? [];
                setLocalRows(loaded);
                setDeliveryMap(dMap);
                setCheckinMap(cMap);
                setCancelledRids(new Set(cancelledRidsArr));
                setPaidRids(new Set(paidRidsArr));

                const SENT_STATUSES = new Set(["SENT", "DELIVERED", "OPENED", "CLICKED"]);
                const allCols = loaded.length > 0 ? Object.keys(loaded[0]) : [];
                const emailKey = detectCol(EMAIL_KEYS, allCols);
                const cancelledRidSet = new Set(cancelledRidsArr);
                setCheckedIndices(new Set());
            })
            .catch((e) => {
                if (e.name === "AbortError") return;
                setError(e.message);
            })
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, [id]);

    const activeCancelledCount = useMemo(
        () => localRows.filter(r => r._rid && cancelledRids.has(r._rid)).length,
        [localRows, cancelledRids]
    );

    const allColumns = useMemo(() => localRows.length > 0 ? Object.keys(localRows[0]) : [], [localRows]);
    const displayColumns = useMemo(() => getDisplayColumns(allColumns), [allColumns]);
    const emailColKey = useMemo(() => detectCol(EMAIL_KEYS, allColumns), [allColumns]);
    const nameColKey = useMemo(() => detectCol(NAME_KEYS, allColumns), [allColumns]);
    const timestampColKey = useMemo(() => displayColumns.find(c => TIMESTAMP_KEYS.includes(c.key.toLowerCase()))?.key ?? null, [displayColumns]);

    const filteredIndexed = useMemo(() => {
        const filtered = localRows
            .map((r, i) => ({ row: r, origIdx: i }))
            .filter(({ row }) => {
                const isCancelled = row._rid ? cancelledRids.has(row._rid) : false;
                if (isCancelled && !showCancelled) return false;
                if (!filter.trim()) return true;
                return displayColumns.some(({ key }) => row[key]?.toLowerCase().includes(filter.toLowerCase()));
            });

        if (sortBy.key === "name" && nameColKey) {
            filtered.sort((a, b) => {
                const cmp = (a.row[nameColKey] ?? "").localeCompare(b.row[nameColKey] ?? "", "ko");
                return sortBy.dir === "asc" ? cmp : -cmp;
            });
        } else if (sortBy.key === "timestamp" && timestampColKey) {
            const parseTs = (s: string) => {
                // "2025. 2. 28 오전 11:13:10" 형태 파싱
                const m = s.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\s*(오전|오후)\s*(\d{1,2}):(\d{2}):(\d{2})/);
                if (m) {
                    let h = parseInt(m[5], 10);
                    if (m[4] === "오후" && h !== 12) h += 12;
                    if (m[4] === "오전" && h === 12) h = 0;
                    return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]), h, parseInt(m[6]), parseInt(m[7])).getTime();
                }
                return new Date(s).getTime() || 0;
            };
            filtered.sort((a, b) => {
                const cmp = parseTs(a.row[timestampColKey] ?? "") - parseTs(b.row[timestampColKey] ?? "");
                return sortBy.dir === "asc" ? cmp : -cmp;
            });
        }

        return filtered;
    }, [localRows, filter, displayColumns, cancelledRids, showCancelled, sortBy, nameColKey, timestampColKey]);

    const tableContainerRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: filteredIndexed.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 37,
        overscan: 5,
    });

    const handleSend = useCallback(async () => {
        const idempotencyKey = crypto.randomUUID();
        const res = await fetch(`/api/events/${id}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rowIndices: Array.from(checkedIndices), idempotencyKey }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error ?? "이메일 발송에 실패했습니다.");

        setSendResult(data);
        setModalOpen(false);
        if (emailColKey) {
            const failedEmails = new Set((data.errors as { email: string; reason: string }[]).map((e) => e.email));
            const sentAt = new Date().toISOString();
            setDeliveryMap((prev) => {
                const next = { ...prev };
                for (const origIdx of checkedIndices) {
                    const email = localRows[origIdx]?.[emailColKey]?.trim();
                    if (!email) continue;
                    next[email] = failedEmails.has(email)
                        ? { status: "FAILED", sentAt: null, openedAt: null }
                        : { status: "SENT", sentAt, openedAt: null };
                }
                return next;
            });
        }
    }, [checkedIndices, emailColKey, localRows, id]);

    if (loading) return <Page><Empty>불러오는 중...</Empty></Page>;
    if (error || !event) return <Page><ErrorMessage>{error ?? "행사를 찾을 수 없습니다."}</ErrorMessage></Page>;

    const rows = localRows;

    const visibleOrigIndices = filteredIndexed.map(({ origIdx }) => origIdx);
    const allVisibleChecked = visibleOrigIndices.length > 0 && visibleOrigIndices.every((i) => checkedIndices.has(i));
    const someVisibleChecked = visibleOrigIndices.some((i) => checkedIndices.has(i));

    function toggleRow(origIdx: number) {
        setCheckedIndices((prev) => {
            const next = new Set(prev);
            next.has(origIdx) ? next.delete(origIdx) : next.add(origIdx);
            return next;
        });
    }

    function toggleAllVisible(visibleIndices: number[]) {
        const allChecked = visibleIndices.every((i) => checkedIndices.has(i));
        setCheckedIndices((prev) => {
            const next = new Set(prev);
            if (allChecked) visibleIndices.forEach((i) => next.delete(i));
            else visibleIndices.forEach((i) => next.add(i));
            return next;
        });
    }

    async function handlePaymentToggle(origIdx: number) {
        const rowId = localRows[origIdx]?._rid;
        console.log("[paymentToggle] origIdx:", origIdx, "rowId:", rowId, "row:", localRows[origIdx]);
        if (!rowId || pendingRowIds.has(rowId)) return;
        const isPaid = paidRids.has(rowId);
        const next = !isPaid;

        // 낙관적 업데이트
        setPaidRids((prev) => {
            const s = new Set(prev);
            next ? s.add(rowId) : s.delete(rowId);
            return s;
        });
        setPendingRowIds((prev) => new Set(prev).add(rowId));

        try {
            const res = await fetch(`/api/events/${id}/payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rowId, paid: next }),
            });
            const data = await res.json();
            if (!data.ok) {
                // 실패 시 롤백
                setPaidRids((prev) => {
                    const s = new Set(prev);
                    isPaid ? s.add(rowId) : s.delete(rowId);
                    return s;
                });
            }
        } finally {
            setPendingRowIds((prev) => { const s = new Set(prev); s.delete(rowId); return s; });
        }
    }

    function handleWalkInAdded(row: Record<string, string>, newPaidRids: string[]) {
        setLocalRows((prev) => [...prev, row]);
        setPaidRids(new Set(newPaidRids));
    }

    async function handleBulkPayment(paid: boolean) {
        const rowIds = Array.from(checkedIndices)
            .map((i) => localRows[i]?._rid)
            .filter((r): r is string => !!r);
        if (rowIds.length === 0) return;

        // 낙관적 업데이트
        setPaidRids((prev) => {
            const s = new Set(prev);
            if (paid) rowIds.forEach((r) => s.add(r));
            else rowIds.forEach((r) => s.delete(r));
            return s;
        });

        const res = await fetch(`/api/events/${id}/payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rowIds, paid }),
        });
        const data = await res.json();
        if (!data.ok) {
            // 실패 시 롤백
            setPaidRids((prev) => {
                const s = new Set(prev);
                if (paid) rowIds.forEach((r) => s.delete(r));
                else rowIds.forEach((r) => s.add(r));
                return s;
            });
        }
    }

    async function handleCancelToggle(origIdx: number) {
        const rowId = localRows[origIdx]?._rid;
        console.log("[cancelToggle] origIdx:", origIdx, "rowId:", rowId, "row:", localRows[origIdx]);
        if (!rowId || pendingRowIds.has(rowId)) return;
        const isCancelled = cancelledRids.has(rowId);
        const next = !isCancelled;

        // 낙관적 업데이트
        setCancelledRids((prev) => {
            const s = new Set(prev);
            next ? s.add(rowId) : s.delete(rowId);
            return s;
        });
        // 취소 시 체크 해제
        if (next) setCheckedIndices((prev) => { const s = new Set(prev); s.delete(origIdx); return s; });
        setPendingRowIds((prev) => new Set(prev).add(rowId));

        try {
            const res = await fetch(`/api/events/${id}/cancel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rowId, cancelled: next }),
            });
            const data = await res.json();
            if (!data.ok) {
                // 실패 시 롤백
                setCancelledRids((prev) => {
                    const s = new Set(prev);
                    isCancelled ? s.add(rowId) : s.delete(rowId);
                    return s;
                });
            }
        } finally {
            setPendingRowIds((prev) => { const s = new Set(prev); s.delete(rowId); return s; });
        }
    }

    const hasTemplate = !!(event.emailSubject && event.emailContent);

    return (
        <Page>
            <BackButton onClick={() => router.back()}>← 뒤로</BackButton>

            {sendResult && sendResult.sentCount > 0 && (
                <SuccessMsg>
                    발송 완료: {sendResult.sentCount}/{sendResult.total}명 성공
                    {sendResult.failCount > 0 && ` · 실패 ${sendResult.failCount}명`}
                </SuccessMsg>
            )}
            {sendResult && sendResult.errors.length > 0 && (
                <ErrorMessage>
                    <strong>발송 실패 ({sendResult.errors.length}건)</strong>
                    <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", fontSize: "0.85rem", display: "grid", gap: "0.25rem" }}>
                        {sendResult.errors.map((e, i) => (
                            <li key={i}><span style={{ fontWeight: 600 }}>{e.email}</span> — {e.reason}</li>
                        ))}
                    </ul>
                </ErrorMessage>
            )}

            {/* 행사 정보 */}
            <Card>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <PageTitle>{event.title}</PageTitle>
                    <Badge status={event.status}>
                        {event.status === "ONGOING" ? "진행 중" : "종료"}
                    </Badge>
                    <GhostBtn
                        style={{ marginLeft: "auto", fontSize: "0.8rem" }}
                        onClick={() => setEditModalOpen(true)}
                    >
                        행사 정보 수정
                    </GhostBtn>
                </div>
                <MetaRow>
                    <span>📅 {formatDate(event.date)}</span>
                    {event.place && <span>📍 {event.place}</span>}
                    {event.sheetUrl && (
                        <a href={event.sheetUrl} target="_blank" rel="noreferrer">
                            Google Sheets 열기
                        </a>
                    )}
                </MetaRow>
            </Card>

            {/* 탭 바 */}
            <TabBar>
                <Tab active={activeTab === "email"} onClick={() => setActiveTab("email")}>
                    이메일 발송
                </Tab>
                <Tab active={activeTab === "checkin"} onClick={() => setActiveTab("checkin")}>
                    입장 체크
                    {Object.values(checkinMap).filter(Boolean).length > 0 && (
                        <span style={{ marginLeft: "0.4rem", fontSize: "0.75rem", background: "#dcfce7", color: "#16a34a", padding: "1px 6px", borderRadius: "999px" }}>
                            {Object.values(checkinMap).filter(Boolean).length}
                        </span>
                    )}
                </Tab>
            </TabBar>

            {activeTab === "email" && (
                <>
            {/* 이메일 템플릿 편집 */}
            <TemplateEditor
                eventId={id}
                initialSubject={event.emailSubject ?? ""}
                initialContent={event.emailContent ?? ""}
                hasTemplate={hasTemplate}
                onSaved={(s, c) => setEvent((prev) => prev ? { ...prev, emailSubject: s, emailContent: c } : prev)}
            />
            </>
            )}

            {/* 참가자 데이터 / 입장 체크 */}
            <Card>
                <Toolbar>
                    <SectionTitle style={{ margin: 0 }}>
                        {activeTab === "checkin" ? "입장 체크" : "참가자 데이터"}{" "}
                        {rows.length > 0 && (
                            activeCancelledCount > 0
                                ? `(${rows.length - activeCancelledCount}명 활성 / 전체 ${rows.length}명)`
                                : `(${rows.length}명)`
                        )}
                        {event.data && (
                            <span style={{ fontWeight: 400, fontSize: "0.78rem", color: C.inkMuted, marginLeft: "0.5rem", fontFamily: "var(--font-sans, sans-serif)" }}>
                                v{event.data.version}
                            </span>
                        )}
                    </SectionTitle>
                    {event.sheetUrl && (
                        <GhostBtn
                            onClick={handleRefresh}
                            disabled={refreshing}
                            style={{ fontSize: "0.8rem" }}
                            title="Google Sheets에서 최신 데이터를 다시 가져옵니다"
                        >
                            {refreshing ? "새로고침 중..." : "↻ 새로고침"}
                        </GhostBtn>
                    )}
                    {activeTab === "email" && (
                    <DesktopToolbarActions>
                        {rows.length > 0 && (
                            <>
                                <FilterInput
                                    type="search"
                                    placeholder="검색..."
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                />
                                {activeCancelledCount > 0 && (
                                    <GhostBtn onClick={() => setShowCancelled((v) => !v)} style={{ fontSize: "0.8rem" }}>
                                        {showCancelled ? `취소자 숨기기 (${activeCancelledCount})` : `취소자 보기 (${activeCancelledCount})`}
                                    </GhostBtn>
                                )}
                                <GhostBtn onClick={() => exportCsv(localRows, `${event.title}_participants.csv`)}>
                                    CSV 내보내기
                                </GhostBtn>
                                <PrimaryBtn
                                    disabled={checkedIndices.size === 0 || !hasTemplate}
                                    title={!hasTemplate ? "이메일 템플릿을 먼저 설정하세요" : undefined}
                                    onClick={() => { setModalOpen(true); setSendResult(null); }}
                                    style={{ minWidth: "140px" }}
                                >
                                    이메일 발송 ({checkedIndices.size}명)
                                </PrimaryBtn>
                            </>
                        )}
                    </DesktopToolbarActions>
                    )}
                </Toolbar>

                {activeTab === "checkin" ? (
                    <AttendanceTab
                        eventId={id}
                        rows={localRows}
                        emailColKey={emailColKey}
                        nameColKey={nameColKey}
                        checkinMap={checkinMap}
                        paidRids={paidRids}
                        onCheckinMapChange={setCheckinMap}
                        onWalkInAdded={handleWalkInAdded}
                    />
                ) : rows.length === 0 ? (
                    <Empty>수집된 참가자 데이터가 없습니다. 행사 카드에서 Sheets URL로 데이터를 수집하세요.</Empty>
                ) : (
                    <>
                        {/* ── 모바일 툴바 (≤640px) ── */}
                        <MobileToolbar>
                            <FilterInput
                                type="search"
                                placeholder="검색..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                style={{ width: "100%", fontSize: "1rem" }}
                            />
                            <MobileToolbarRow>
                                <GhostBtn
                                    onClick={() => setSortBy({ key: null, dir: "desc" })}
                                    style={{ fontSize: "0.8rem", fontWeight: sortBy.key === null ? 700 : 400, opacity: sortBy.key === null ? 1 : 0.6 }}
                                >기본</GhostBtn>
                                {nameColKey && (
                                    <GhostBtn
                                        onClick={() => setSortBy((prev) => prev.key === "name" ? { key: "name", dir: prev.dir === "desc" ? "asc" : "desc" } : { key: "name", dir: "desc" })}
                                        style={{ fontSize: "0.8rem", fontWeight: sortBy.key === "name" ? 700 : 400, opacity: sortBy.key === "name" ? 1 : 0.6 }}
                                    >이름순 {sortBy.key === "name" ? (sortBy.dir === "desc" ? "▼" : "▲") : ""}</GhostBtn>
                                )}
                                {timestampColKey && (
                                    <GhostBtn
                                        onClick={() => setSortBy((prev) => prev.key === "timestamp" ? { key: "timestamp", dir: prev.dir === "desc" ? "asc" : "desc" } : { key: "timestamp", dir: "desc" })}
                                        style={{ fontSize: "0.8rem", fontWeight: sortBy.key === "timestamp" ? 700 : 400, opacity: sortBy.key === "timestamp" ? 1 : 0.6 }}
                                    >시간순 {sortBy.key === "timestamp" ? (sortBy.dir === "desc" ? "▼" : "▲") : ""}</GhostBtn>
                                )}
                            </MobileToolbarRow>
                            <MobileToolbarRow>
                                {activeCancelledCount > 0 && (
                                    <GhostBtn onClick={() => setShowCancelled((v) => !v)} style={{ fontSize: "0.8rem", flex: 1 }}>
                                        {showCancelled ? `취소자 숨기기 (${activeCancelledCount})` : `취소자 보기 (${activeCancelledCount})`}
                                    </GhostBtn>
                                )}
                                <GhostBtn onClick={() => exportCsv(localRows, `${event.title}_participants.csv`)} style={{ flex: 1 }}>
                                    CSV 내보내기
                                </GhostBtn>
                            </MobileToolbarRow>
                            <PrimaryBtn
                                disabled={checkedIndices.size === 0 || !hasTemplate}
                                title={!hasTemplate ? "이메일 템플릿을 먼저 설정하세요" : undefined}
                                onClick={() => { setModalOpen(true); setSendResult(null); }}
                                style={{ width: "100%" }}
                            >
                                이메일 발송 ({checkedIndices.size}명)
                            </PrimaryBtn>
                        </MobileToolbar>

                        {/* ── 데스크톱 필터/상태 행 ── */}
                        <DesktopTable>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                                {filter ? (
                                    <p style={{ margin: 0, fontSize: "0.8rem", color: C.inkMuted }}>
                                        {filteredIndexed.length}명 표시 중 (전체 {rows.length}명)
                                    </p>
                                ) : <span />}
                                <SelectBar style={{ opacity: checkedIndices.size === 0 ? 0.45 : 1 }}>
                                    <strong>{checkedIndices.size}명</strong> 선택됨
                                    <SelectBarBtn type="button" disabled={checkedIndices.size === 0} onClick={() => setCheckedIndices(new Set())}>전체 해제</SelectBarBtn>
                                    <SelectBarBtn type="button" onClick={() => setCheckedIndices(new Set(rows.map((_, i) => i)))}>전체 선택</SelectBarBtn>
                                    {emailColKey && (
                                        <>
                                            <span style={{ width: "1px", height: "14px", background: C.border, display: "inline-block", margin: "0 0.1rem" }} />
                                            <SelectBarBtn type="button" variant="primary" disabled={checkedIndices.size === 0} onClick={() => handleBulkPayment(true)}>일괄 입금</SelectBarBtn>
                                            <SelectBarBtn type="button" variant="muted" disabled={checkedIndices.size === 0} onClick={() => handleBulkPayment(false)}>일괄 미입금</SelectBarBtn>
                                        </>
                                    )}
                                </SelectBar>
                            </div>
                        </DesktopTable>

{/* ── 모바일 선택 바 (bottom sheet, ≤640px) ── */}
                        <MobileOnly>
                        {checkedIndices.size > 0 && (
                            <SelectBar>
                                <strong style={{ fontSize: "0.9rem" }}>{checkedIndices.size}명</strong>
                                <span style={{ color: C.inkMuted, fontSize: "0.82rem" }}>선택됨</span>
                                <div style={{ display: "flex", gap: "0.4rem", marginLeft: "auto", flexWrap: "wrap" }}>
                                    <SelectBarBtn type="button" onClick={() => setCheckedIndices(new Set())}>해제</SelectBarBtn>
                                    <SelectBarBtn type="button" onClick={() => setCheckedIndices(new Set(rows.map((_, i) => i)))}>전체</SelectBarBtn>
                                    {emailColKey && (
                                        <>
                                            <SelectBarBtn type="button" variant="primary" onClick={() => handleBulkPayment(true)}>일괄 입금</SelectBarBtn>
                                            <SelectBarBtn type="button" variant="muted" onClick={() => handleBulkPayment(false)}>일괄 미입금</SelectBarBtn>
                                        </>
                                    )}
                                </div>
                            </SelectBar>
                        )}
                        </MobileOnly>

                        {/* ── 모바일 카드 리스트 (≤640px) ── */}
                        <MobileList hasSelection={checkedIndices.size > 0}>
                            {filter && (
                                <p style={{ margin: "0 0 0.25rem", fontSize: "0.8rem", color: C.inkMuted }}>
                                    {filteredIndexed.length}명 표시 중 (전체 {rows.length}명)
                                </p>
                            )}
                            <MobileSelectAllRow>
                                <button
                                    type="button"
                                    onClick={() => toggleAllVisible(visibleOrigIndices)}
                                    style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, padding: 0 }}
                                >
                                    {allVisibleChecked ? "전체 해제" : "전체 선택"}
                                </button>
                                {checkedIndices.size > 0 && (
                                    <span style={{ marginLeft: "auto", color: C.accent, fontWeight: 600, fontSize: "0.85rem" }}>
                                        {checkedIndices.size}명 선택됨
                                    </span>
                                )}
                            </MobileSelectAllRow>
                            {filteredIndexed.map(({ row, origIdx }) => {
                                const isCancelled = row._rid ? cancelledRids.has(row._rid) : false;
                                const isPaid = row._rid ? paidRids.has(row._rid) : false;
                                const isChecked = checkedIndices.has(origIdx);
                                const name = nameColKey ? (row[nameColKey] ?? "") : "";
                                const email = emailColKey ? (row[emailColKey] ?? "") : "";
                                const timestamp = timestampColKey ? (row[timestampColKey] ?? "") : "";
                                return (
                                    <MobileCard key={origIdx} cancelled={isCancelled} checked={isChecked} onClick={() => !isCancelled && toggleRow(origIdx)}>
                                        <MobileCardTop>
                                            <MobileCheckbox
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {}}
                                                onClick={(e) => e.stopPropagation()}
                                                disabled={isCancelled}
                                                aria-label={`${name || "참가자"} 선택`}
                                            />
                                            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                                                <MobileCardName style={{ textDecoration: isCancelled ? "line-through" : "none" }}>
                                                    {name || `참가자 ${origIdx + 1}`}
                                                </MobileCardName>
                                                <MobileCardEmail>{email || "이메일 없음"}</MobileCardEmail>
                                            </div>
                                            <DeliveryBadge
                                                info={emailColKey ? deliveryMap[row[emailColKey]?.trim()] : undefined}
                                            />
                                        </MobileCardTop>
                                        {timestamp && (
                                            <MobileCardMeta>{timestamp}</MobileCardMeta>
                                        )}
                                        <MobileCardActions>
                                            <MobilePaidBtn
                                                paid={isPaid}
                                                onClick={(e) => { e.stopPropagation(); handlePaymentToggle(origIdx); }}
                                                disabled={isCancelled}
                                                title={isPaid ? "입금 취소" : "입금 확인"}
                                            >
                                                {isPaid ? "입금 ✓" : "미입금"}
                                            </MobilePaidBtn>
                                            <MobileCancelBtn
                                                cancelled={isCancelled}
                                                onClick={(e) => { e.stopPropagation(); handleCancelToggle(origIdx); }}
                                                title={isCancelled ? "참여 복원" : "참여 취소"}
                                            >
                                                {isCancelled ? "재참여" : "참여 취소"}
                                            </MobileCancelBtn>
                                        </MobileCardActions>
                                    </MobileCard>
                                );
                            })}
                        </MobileList>

                        {/* ── 데스크톱 테이블 (>640px) ── */}
                        <DesktopTable>
                            <div ref={tableContainerRef} style={{ overflowX: "auto", overflowY: "auto", maxHeight: "520px" }}>
                                <Table>
                                    <thead>
                                        <tr>
                                            <CheckTh>
                                                <input
                                                    type="checkbox"
                                                    checked={allVisibleChecked}
                                                    ref={(el) => { if (el) el.indeterminate = !allVisibleChecked && someVisibleChecked; }}
                                                    onChange={() => toggleAllVisible(visibleOrigIndices)}
                                                    aria-label="전체 선택"
                                                />
                                            </CheckTh>
                                            {displayColumns.map(({ key, label }) => {
                                                const isSortableKey = (nameColKey && key === nameColKey) ? "name" : (timestampColKey && key === timestampColKey) ? "timestamp" : null;
                                                const isActive = isSortableKey && sortBy.key === isSortableKey;
                                                return isSortableKey ? (
                                                    <th
                                                        key={key}
                                                        onClick={() => setSortBy((prev) => prev.key === isSortableKey ? { key: isSortableKey, dir: prev.dir === "desc" ? "asc" : "desc" } : { key: isSortableKey, dir: "desc" })}
                                                        style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                                                    >
                                                        {label}
                                                        <span style={{ marginLeft: "0.3rem", fontSize: "0.7rem", opacity: isActive ? 1 : 0.3 }}>
                                                            {isActive ? (sortBy.dir === "desc" ? "▼" : "▲") : "▼"}
                                                        </span>
                                                    </th>
                                                ) : (
                                                    <th key={key}>{label}</th>
                                                );
                                            })}
                                            <th style={{ whiteSpace: "nowrap" }}>입금</th>
                                            <th style={{ whiteSpace: "nowrap" }}>발송 상태</th>
                                            <th style={{ whiteSpace: "nowrap" }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rowVirtualizer.getVirtualItems().length > 0 && (
                                            <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}>
                                                <td colSpan={displayColumns.length + 4} style={{ padding: 0, border: "none" }} />
                                            </tr>
                                        )}
                                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                            const { row, origIdx } = filteredIndexed[virtualRow.index];
                                            const isCancelled = row._rid ? cancelledRids.has(row._rid) : false;
                                            return (
                                                <tr key={origIdx} style={{ opacity: isCancelled ? 0.5 : 1, cursor: isCancelled ? "default" : "pointer", background: checkedIndices.has(origIdx) ? C.accentLight : undefined, boxShadow: checkedIndices.has(origIdx) ? `inset 3px 0 0 ${C.accent}` : undefined, transition: "background 0.12s" }} onClick={() => !isCancelled && toggleRow(origIdx)}>
                                                    <CheckTd onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={checkedIndices.has(origIdx)}
                                                            onChange={() => toggleRow(origIdx)}
                                                            disabled={isCancelled}
                                                            aria-label={`행 ${origIdx + 1} 선택`}
                                                        />
                                                    </CheckTd>
                                                    {displayColumns.map(({ key }) => {
                                                        return (
                                                            <td
                                                                key={key}
                                                                style={{
                                                                    minWidth: "80px",
                                                                    textDecoration: isCancelled ? "line-through" : "none",
                                                                    color: isCancelled ? C.inkMuted : undefined,
                                                                }}
                                                            >
                                                                {row[key] ?? "—"}
                                                            </td>
                                                        );
                                                    })}
                                                    <td style={{ whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                                                        {(() => {
                                                            const isPaid = row._rid ? paidRids.has(row._rid) : false;
                                                            return (
                                                                <PaidBtn
                                                                    paid={isPaid}
                                                                    onClick={() => handlePaymentToggle(origIdx)}
                                                                    title={isPaid ? "입금 취소" : "입금 확인"}
                                                                    disabled={isCancelled}
                                                                >
                                                                    {isPaid ? "입금 ✓" : "미입금"}
                                                                </PaidBtn>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td style={{ whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                                                        <DeliveryBadge
                                                            info={emailColKey ? deliveryMap[row[emailColKey]?.trim()] : undefined}
                                                        />
                                                    </td>
                                                    <td style={{ whiteSpace: "nowrap", paddingRight: "8px" }} onClick={(e) => e.stopPropagation()}>
                                                        <CancelBtn
                                                            cancelled={isCancelled}
                                                            onClick={() => handleCancelToggle(origIdx)}
                                                            title={isCancelled ? "참여 복원" : "참여 취소"}
                                                        >
                                                            {isCancelled ? "재참여" : "참여 취소"}
                                                        </CancelBtn>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {rowVirtualizer.getVirtualItems().length > 0 && (() => {
                                            const last = rowVirtualizer.getVirtualItems().at(-1)!;
                                            const paddingBottom = rowVirtualizer.getTotalSize() - last.end;
                                            return paddingBottom > 0 ? (
                                                <tr style={{ height: `${paddingBottom}px` }}>
                                                    <td colSpan={displayColumns.length + 4} style={{ padding: 0, border: "none" }} />
                                                </tr>
                                            ) : null;
                                        })()}
                                    </tbody>
                                </Table>
                            </div>
                        </DesktopTable>
                    </>
                )}
            </Card>

            {/* 행사 정보 수정 모달 */}
            {editModalOpen && (
                <EditEventModal
                    event={event}
                    onClose={() => setEditModalOpen(false)}
                    onSaved={(updated) => setEvent((prev) => prev ? { ...prev, ...updated } : prev)}
                />
            )}

            {/* 이메일 발송 모달 */}
            {modalOpen && (
                <SendConfirmModal
                    eventTitle={event.title}
                    emailSubject={event.emailSubject}
                    emailContent={event.emailContent}
                    checkedCount={checkedIndices.size}
                    totalRows={rows.length}
                    onClose={() => setModalOpen(false)}
                    onSend={handleSend}
                />
            )}
        </Page>
    );
}
