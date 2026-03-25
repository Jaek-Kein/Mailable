"use client";

import styled from "@emotion/styled";
import { useEffect, useState, useMemo, useCallback, memo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useParams, useRouter } from "next/navigation";

interface EventData {
    payload: { rows: Record<string, string>[]; cancelledEmails?: string[] };
    version: number;
}

interface Event {
    id: string;
    title: string;
    date: string | null;
    place: string | null;
    sheetUrl: string | null;
    emailSubject: string | null;
    emailContent: string | null;
    status: "ONGOING" | "CLOSED";
    createdAt: string;
    data: EventData | null;
}

/* ────────── Palette (mirrors Login design tokens) ────────── */
const C = {
    ink: "#1a1a2e",
    inkSoft: "#3d3d5c",
    inkMuted: "#8888a8",
    paper: "#faf9f7",
    accent: "#e8533a",
    accentLight: "#fdf1ee",
    border: "#e2dfd8",
    card: "#ffffff",
} as const;

/* ────────── Styles ────────── */
const Page = styled.main`
    max-width: 960px;
    margin: 2rem auto;
    padding: 0 1.25rem;
    display: grid;
    gap: 1.5rem;
`;

const Card = styled.section`
    background: ${C.card};
    border: 1px solid ${C.border};
    border-radius: 12px;
    padding: 1.5rem;
    display: grid;
    gap: 0.75rem;
    box-shadow: 0 4px 16px rgba(26, 26, 46, 0.06);
`;

const PageTitle = styled.h1`
    margin: 0;
    font-family: var(--font-serif, 'DM Serif Display', serif);
    font-size: 1.6rem;
    color: ${C.ink};
    letter-spacing: -0.3px;
`;

const MetaRow = styled.div`
    display: flex;
    gap: 1.25rem;
    flex-wrap: wrap;
    font-size: 0.875rem;
    color: ${C.inkMuted};

    a { color: ${C.accent}; text-decoration: none; &:hover { text-decoration: underline; } }
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

    &:focus {
        border-color: ${C.accent};
        box-shadow: 0 0 0 3px ${C.accentLight};
        background: #fff;
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
    &:hover { background: ${C.paper}; }
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

    &:hover { background: #2d2d4a; transform: translateY(-1px); }
    &:active { transform: translateY(0); }
    &:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
`;

const Toolbar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
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

    &:focus {
        border-color: ${C.accent};
        box-shadow: 0 0 0 3px ${C.accentLight};
        background: #fff;
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
`;

/* ────────── Tab Bar ────────── */
const TabBar = styled.div`
    display: flex;
    gap: 0;
    border-bottom: 2px solid ${C.border};
    margin-bottom: -1.5rem;
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

    &:hover { color: ${C.ink}; }
`;

/* ────────── Attendance Check styles ────────── */
const CheckinStats = styled.div`
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
`;

const StatChip = styled.div<{ variant?: "success" | "muted" }>`
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.9rem;
    border-radius: 999px;
    font-size: 0.85rem;
    font-weight: 500;
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

    &:hover {
        background: ${({ checked }) => checked ? "#dcfce7" : C.paper};
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
    min-width: 100px;
`;

const CheckinEmail = styled.span`
    font-size: 0.8rem;
    color: ${C.inkMuted};
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const CheckinTime = styled.span`
    font-size: 0.75rem;
    color: #16a34a;
    white-space: nowrap;
    flex-shrink: 0;
`;

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
    URL.revokeObjectURL(url);
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
`;

/* ────────── Inline edit styles ────────── */
const CellInput = styled.input`
    width: 100%;
    border: 1px solid ${C.accent};
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 0.875rem;
    font-family: var(--font-sans, sans-serif);
    box-sizing: border-box;
    outline: none;
    background: ${C.accentLight};
`;

const EditHint = styled.span`
    font-size: 0.72rem;
    color: ${C.inkMuted};
    margin-left: 0.5rem;
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

/* ────────── AttendanceTab ────────── */
interface AttendanceTabProps {
    eventId: string;
    rows: Record<string, string>[];
    emailColKey: string | null;
    nameColKey: string | null;
    initialCheckinMap: Record<string, string | null>;
    onCheckinMapChange?: (map: Record<string, string | null>) => void;
}

const AttendanceTab = memo(function AttendanceTab({ eventId, rows, emailColKey, nameColKey, initialCheckinMap, onCheckinMapChange }: AttendanceTabProps) {
    const [checkinMap, setCheckinMap] = useState<Record<string, string | null>>(initialCheckinMap);

    useEffect(() => {
        setCheckinMap(initialCheckinMap);
    // initialCheckinMap 레퍼런스가 바뀔 때만 동기화 (최초 로드 시)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [filter, setFilter] = useState("");
    const [resetting, setResetting] = useState(false);

    const filtered = useMemo(() => {
        if (!filter.trim()) return rows.map((r, i) => ({ row: r, i }));
        const q = filter.toLowerCase();
        return rows
            .map((r, i) => ({ row: r, i }))
            .filter(({ row }) => {
                const name = nameColKey ? row[nameColKey] : "";
                const email = emailColKey ? row[emailColKey] : "";
                return (name ?? "").toLowerCase().includes(q) || (email ?? "").toLowerCase().includes(q);
            });
    }, [rows, filter, emailColKey, nameColKey]);

    const checkedInCount = useMemo(
        () => Object.values(checkinMap).filter(Boolean).length,
        [checkinMap]
    );

    async function toggleCheckin(email: string, current: boolean) {
        const next = !current;
        // 낙관적 업데이트
        setCheckinMap((prev) => {
            const updated = { ...prev, [email]: next ? new Date().toISOString() : null };
            onCheckinMapChange?.(updated);
            return updated;
        });
        const res = await fetch(`/api/events/${eventId}/checkin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, checkedIn: next }),
        });
        const data = await res.json();
        if (!data.ok) {
            // 실패 시 롤백
            setCheckinMap((prev) => {
                const rolled = { ...prev, [email]: current ? new Date().toISOString() : null };
                onCheckinMapChange?.(rolled);
                return rolled;
            });
        }
    }

    async function resetAll() {
        if (!confirm("전체 입장 체크를 초기화하시겠습니까?")) return;
        setResetting(true);
        await fetch(`/api/events/${eventId}/checkin`, { method: "DELETE" });
        setCheckinMap({});
        onCheckinMapChange?.({});
        setResetting(false);
    }

    if (rows.length === 0) {
        return <Empty>수집된 참가자 데이터가 없습니다. 먼저 Sheets URL로 데이터를 수집하세요.</Empty>;
    }

    return (
        <div style={{ display: "grid", gap: "1rem" }}>
            {/* 통계 */}
            <CheckinStats>
                <StatChip variant="success">
                    ✓ 입장 완료 {checkedInCount}명
                </StatChip>
                <StatChip variant="muted">
                    미입장 {rows.length - checkedInCount}명
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
                        width: `${rows.length > 0 ? (checkedInCount / rows.length) * 100 : 0}%`,
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
                    style={{ width: 240 }}
                />
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
                        const checkedInAt = email ? checkinMap[email] : null;
                        const isCheckedIn = !!checkedInAt;
                        return (
                            <CheckinRow
                                key={i}
                                checked={isCheckedIn}
                                onClick={() => email && toggleCheckin(email, isCheckedIn)}
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
                                {!email && (
                                    <span style={{ fontSize: "0.72rem", color: C.inkMuted }}>이메일 없음 (체크 불가)</span>
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
    const [deliveryMap, setDeliveryMap] = useState<Record<string, { status: string; sentAt: string | null; openedAt: string | null }>>({});

    const [localRows, setLocalRows] = useState<Record<string, string>[]>([]);
    const [editingCell, setEditingCell] = useState<{ rowIndex: number; col: string } | null>(null);
    const [editValue, setEditValue] = useState("");
    const [checkedIndices, setCheckedIndices] = useState<Set<number>>(new Set());

    const [modalOpen, setModalOpen] = useState(false);
    const [sendResult, setSendResult] = useState<{ sentCount: number; failCount: number; total: number; errors: { email: string; reason: string }[] } | null>(null);
    const [activeTab, setActiveTab] = useState<"email" | "checkin">("email");
    const [checkinMap, setCheckinMap] = useState<Record<string, string | null>>({});
    const [cancelledEmails, setCancelledEmails] = useState<Set<string>>(new Set());
    const [showCancelled, setShowCancelled] = useState(false);


    useEffect(() => {
        fetch(`/api/events/${id}`)
            .then((r) => r.json())
            .then((data) => {
                if (!data.ok) throw new Error(data.error ?? "행사를 불러오지 못했습니다.");
                setEvent(data.event);
                const loaded: Record<string, string>[] = data.event?.data?.payload?.rows ?? [];
                const dMap: Record<string, { status: string; sentAt: string | null; openedAt: string | null }> = data.deliveryMap ?? {};
                const cMap: Record<string, string | null> = data.event?.data?.payload?.checkinMap ?? {};
                const cancelledArr: string[] = data.event?.data?.payload?.cancelledEmails ?? [];
                setLocalRows(loaded);
                setDeliveryMap(dMap);
                setCheckinMap(cMap);
                setCancelledEmails(new Set(cancelledArr.map((e: string) => e.toLowerCase())));

                const SENT_STATUSES = new Set(["SENT", "DELIVERED", "OPENED", "CLICKED"]);
                const allCols = loaded.length > 0 ? Object.keys(loaded[0]) : [];
                const emailKey = detectCol(EMAIL_KEYS, allCols);
                const cancelledSet = new Set(cancelledArr.map((e: string) => e.toLowerCase()));
                const defaultSelected = new Set(
                    loaded
                        .map((row, i) => ({ row, i }))
                        .filter(({ row }) => {
                            if (!emailKey) return true;
                            const email = row[emailKey]?.trim();
                            if (!email) return true;
                            if (cancelledSet.has(email.toLowerCase())) return false;
                            const delivery = dMap[email];
                            return !delivery || !SENT_STATUSES.has(delivery.status);
                        })
                        .map(({ i }) => i)
                );
                setCheckedIndices(defaultSelected);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [id]);

    const allColumns = useMemo(() => localRows.length > 0 ? Object.keys(localRows[0]) : [], [localRows]);
    const displayColumns = useMemo(() => getDisplayColumns(allColumns), [allColumns]);
    const emailColKey = useMemo(() => detectCol(EMAIL_KEYS, allColumns), [allColumns]);
    const nameColKey = useMemo(() => detectCol(NAME_KEYS, allColumns), [allColumns]);
    const filteredIndexed = useMemo(() => {
        return localRows
            .map((r, i) => ({ row: r, origIdx: i }))
            .filter(({ row }) => {
                const email = emailColKey ? row[emailColKey]?.trim().toLowerCase() : null;
                const isCancelled = email ? cancelledEmails.has(email) : false;
                if (isCancelled && !showCancelled) return false;
                if (!filter.trim()) return true;
                return displayColumns.some(({ key }) => row[key]?.toLowerCase().includes(filter.toLowerCase()));
            });
    }, [localRows, filter, displayColumns, cancelledEmails, showCancelled, emailColKey]);

    const tableContainerRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: filteredIndexed.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 37,
        overscan: 5,
    });

    const handleSend = useCallback(async () => {
        const res = await fetch(`/api/events/${id}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rowIndices: Array.from(checkedIndices) }),
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

    async function handleCellSave(rowIndex: number, col: string, value: string) {
        if (value === rows[rowIndex]?.[col]) { setEditingCell(null); return; }
        const res = await fetch(`/api/events/${id}/data`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rowIndex, updates: { [col]: value } }),
        });
        const data = await res.json();
        if (data.ok) {
            setLocalRows((prev) => prev.map((r, i) => i === rowIndex ? { ...r, [col]: value } : r));
        }
        setEditingCell(null);
    }

    function startEdit(rowIndex: number, col: string) {
        setEditingCell({ rowIndex, col });
        setEditValue(rows[rowIndex]?.[col] ?? "");
    }

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

    async function handleCancelToggle(origIdx: number) {
        if (!emailColKey) return;
        const email = localRows[origIdx]?.[emailColKey]?.trim();
        if (!email) return;
        const emailLower = email.toLowerCase();
        const isCancelled = cancelledEmails.has(emailLower);
        const next = !isCancelled;

        // 낙관적 업데이트
        setCancelledEmails((prev) => {
            const s = new Set(prev);
            next ? s.add(emailLower) : s.delete(emailLower);
            return s;
        });
        // 취소 시 체크 해제
        if (next) setCheckedIndices((prev) => { const s = new Set(prev); s.delete(origIdx); return s; });

        const res = await fetch(`/api/events/${id}/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, cancelled: next }),
        });
        const data = await res.json();
        if (!data.ok) {
            // 실패 시 롤백
            setCancelledEmails((prev) => {
                const s = new Set(prev);
                isCancelled ? s.add(emailLower) : s.delete(emailLower);
                return s;
            });
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
                            cancelledEmails.size > 0
                                ? `(${rows.length - cancelledEmails.size}명 활성 / 전체 ${rows.length}명)`
                                : `(${rows.length}명)`
                        )}
                        {event.data && (
                            <span style={{ fontWeight: 400, fontSize: "0.78rem", color: C.inkMuted, marginLeft: "0.5rem", fontFamily: "var(--font-sans, sans-serif)" }}>
                                v{event.data.version}
                            </span>
                        )}
                    </SectionTitle>
                    {activeTab === "email" && (
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                        {rows.length > 0 && (
                            <>
                                <FilterInput
                                    type="search"
                                    placeholder="검색..."
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                />
                                {cancelledEmails.size > 0 && (
                                    <GhostBtn onClick={() => setShowCancelled((v) => !v)} style={{ fontSize: "0.8rem" }}>
                                        {showCancelled ? `취소자 숨기기 (${cancelledEmails.size})` : `취소자 보기 (${cancelledEmails.size})`}
                                    </GhostBtn>
                                )}
                                <GhostBtn onClick={() => exportCsv(localRows, `${event.title}_participants.csv`)}>
                                    CSV 내보내기
                                </GhostBtn>
                                <PrimaryBtn
                                    disabled={checkedIndices.size === 0 || !hasTemplate}
                                    title={!hasTemplate ? "이메일 템플릿을 먼저 설정하세요" : undefined}
                                    onClick={() => { setModalOpen(true); setSendResult(null); }}
                                >
                                    이메일 발송 {checkedIndices.size > 0 && `(${checkedIndices.size}명)`}
                                </PrimaryBtn>
                            </>
                        )}
                    </div>
                    )}
                </Toolbar>

                {activeTab === "checkin" ? (
                    <AttendanceTab
                        eventId={id}
                        rows={localRows}
                        emailColKey={emailColKey}
                        nameColKey={nameColKey}
                        initialCheckinMap={checkinMap}
                        onCheckinMapChange={setCheckinMap}
                    />
                ) : rows.length === 0 ? (
                    <Empty>수집된 참가자 데이터가 없습니다. 행사 카드에서 Sheets URL로 데이터를 수집하세요.</Empty>
                ) : (
                    <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                            {filter ? (
                                <p style={{ margin: 0, fontSize: "0.8rem", color: C.inkMuted }}>
                                    {filteredIndexed.length}명 표시 중 (전체 {rows.length}명)
                                </p>
                            ) : <span />}
                            {checkedIndices.size > 0 && (
                                <SelectBar>
                                    <strong>{checkedIndices.size}명</strong> 선택됨
                                    <button
                                        type="button"
                                        onClick={() => setCheckedIndices(new Set())}
                                        style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: "0.8rem", padding: 0, textDecoration: "underline" }}
                                    >
                                        전체 해제
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCheckedIndices(new Set(rows.map((_, i) => i)))}
                                        style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: "0.8rem", padding: 0, textDecoration: "underline" }}
                                    >
                                        전체 선택
                                    </button>
                                </SelectBar>
                            )}
                        </div>
                        <EditHint>셀을 클릭하면 직접 수정할 수 있습니다</EditHint>
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
                                        {displayColumns.map(({ key, label }) => <th key={key}>{label}</th>)}
                                        <th style={{ whiteSpace: "nowrap" }}>발송 상태</th>
                                        <th style={{ whiteSpace: "nowrap" }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rowVirtualizer.getVirtualItems().length > 0 && (
                                        <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}>
                                            <td colSpan={displayColumns.length + 3} style={{ padding: 0, border: "none" }} />
                                        </tr>
                                    )}
                                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                        const { row, origIdx } = filteredIndexed[virtualRow.index];
                                        const rowEmail = emailColKey ? row[emailColKey]?.trim().toLowerCase() : null;
                                        const isCancelled = rowEmail ? cancelledEmails.has(rowEmail) : false;
                                        return (
                                            <tr key={origIdx} style={{ opacity: isCancelled ? 0.5 : 1 }}>
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
                                                    const isEditing = editingCell?.rowIndex === origIdx && editingCell?.col === key;
                                                    return (
                                                        <td
                                                            key={key}
                                                            onClick={() => { if (!isEditing && !isCancelled) startEdit(origIdx, key); }}
                                                            style={{
                                                                cursor: isCancelled ? "default" : "pointer",
                                                                minWidth: "80px",
                                                                textDecoration: isCancelled ? "line-through" : "none",
                                                                color: isCancelled ? C.inkMuted : undefined,
                                                            }}
                                                        >
                                                            {isEditing ? (
                                                                <CellInput
                                                                    autoFocus
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter") handleCellSave(origIdx, key, editValue);
                                                                        if (e.key === "Escape") setEditingCell(null);
                                                                    }}
                                                                    onBlur={() => handleCellSave(origIdx, key, editValue)}
                                                                />
                                                            ) : (
                                                                row[key] ?? "—"
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td style={{ whiteSpace: "nowrap" }}>
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
                                                <td colSpan={displayColumns.length + 3} style={{ padding: 0, border: "none" }} />
                                            </tr>
                                        ) : null;
                                    })()}
                                </tbody>
                            </Table>
                        </div>
                    </>
                )}
            </Card>

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
