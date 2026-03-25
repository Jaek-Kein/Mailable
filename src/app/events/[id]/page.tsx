"use client";

import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCampaignStore } from "@/src/store/useCampaignStore";

interface EventData {
    payload: { rows: Record<string, string>[] };
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

/* ────────── Styles ────────── */
const Page = styled.main`
    max-width: 960px;
    margin: 2rem auto;
    padding: 0 1rem;
    display: grid;
    gap: 1.5rem;
`;

const Card = styled.section`
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem;
    display: grid;
    gap: 0.75rem;
`;

const Title = styled.h1`
    margin: 0;
    font-size: 1.5rem;
    color: #0f172a;
`;

const MetaRow = styled.div`
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
    font-size: 0.9rem;
    color: #475569;
`;

const Badge = styled.span<{ status: "ONGOING" | "CLOSED" }>`
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 600;
    background: ${({ status }) => (status === "ONGOING" ? "#dcfce7" : "#f1f5f9")};
    color: ${({ status }) => (status === "ONGOING" ? "#16a34a" : "#475569")};
`;

const SectionTitle = styled.h2`
    margin: 0 0 0.5rem;
    font-size: 1rem;
    color: #0f172a;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    th, td {
        text-align: left;
        padding: 8px 12px;
        border-bottom: 1px solid #e2e8f0;
    }
    th {
        background: #f8fafc;
        color: #475569;
        font-weight: 600;
    }
    tr:last-child td { border-bottom: none; }
`;

const FilterInput = styled.input`
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 7px 12px;
    font-size: 0.875rem;
    width: 240px;
    &:focus { outline: 2px solid #2563eb; outline-offset: 1px; }
`;

const Empty = styled.div`
    color: #94a3b8;
    font-size: 0.875rem;
    padding: 1rem 0;
`;

const BackButton = styled.button`
    appearance: none;
    border: 1px solid #e2e8f0;
    background: #fff;
    border-radius: 8px;
    padding: 6px 14px;
    font-size: 0.875rem;
    cursor: pointer;
    color: #475569;
    width: fit-content;
    &:hover { background: #f8fafc; }
`;

const GhostBtn = styled.button`
    appearance: none;
    background: transparent;
    color: #475569;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 0.8rem;
    cursor: pointer;
    &:hover { background: #f8fafc; }
`;

const PrimaryBtn = styled.button`
    appearance: none;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 7px 14px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    &:hover { background: #1d4ed8; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
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
    color: #ef4444;
    background: #fef2f2;
    border-radius: 8px;
    padding: 1rem;
`;

const SuccessMsg = styled.div`
    color: #16a34a;
    background: #dcfce7;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
`;

/* ────────── Template editor styles ────────── */
const TemplateField = styled.div`
    display: grid;
    gap: 0.4rem;
`;

const TemplateLabel = styled.label`
    font-size: 0.8rem;
    font-weight: 600;
    color: #475569;
`;

const TemplateInput = styled.input`
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 0.875rem;
    width: 100%;
    box-sizing: border-box;
    &:focus { outline: 2px solid #2563eb; outline-offset: 1px; }
`;

const TemplateTextarea = styled.textarea`
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 0.875rem;
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    min-height: 180px;
    font-family: inherit;
    line-height: 1.6;
    &:focus { outline: 2px solid #2563eb; outline-offset: 1px; }
`;

const PlaceholderHint = styled.p`
    margin: 0;
    font-size: 0.76rem;
    color: #94a3b8;
`;

/* ────────── Campaign Modal ────────── */
const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: grid;
    place-items: center;
    z-index: 50;
    padding: 1rem;
`;

const Modal = styled.div`
    background: #fff;
    border-radius: 16px;
    padding: 1.75rem;
    width: 100%;
    max-width: 480px;
    display: grid;
    gap: 1.25rem;
`;

const ModalTitle = styled.h2`
    margin: 0;
    font-size: 1.1rem;
    color: #0f172a;
`;

const Field = styled.div`
    display: grid;
    gap: 0.4rem;
`;

const Label = styled.label`
    font-size: 0.8rem;
    font-weight: 600;
    color: #475569;
`;

const Input = styled.input`
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 0.875rem;
    width: 100%;
    box-sizing: border-box;
    &:focus { outline: 2px solid #2563eb; outline-offset: 1px; }
`;

const ModalFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
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
    PENDING:   { bg: "#f1f5f9", color: "#64748b" },
    SENT:      { bg: "#dbeafe", color: "#1d4ed8" },
    DELIVERED: { bg: "#dcfce7", color: "#16a34a" },
    OPENED:    { bg: "#d1fae5", color: "#059669" },
    CLICKED:   { bg: "#a7f3d0", color: "#047857" },
    BOUNCED:   { bg: "#fef3c7", color: "#b45309" },
    FAILED:    { bg: "#fee2e2", color: "#dc2626" },
};

function DeliveryBadge({ info }: { info?: { status: string; sentAt: string | null; openedAt: string | null } }) {
    if (!info) {
        return <span style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>미발송</span>;
    }
    const s = info.status as DeliveryStatus;
    const { bg, color } = STATUS_COLOR[s] ?? { bg: "#f1f5f9", color: "#64748b" };
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
const CheckTh = styled.th`
    width: 36px;
    padding: 0 0 0 12px !important;
`;

const CheckTd = styled.td`
    width: 36px;
    padding: 0 0 0 12px !important;
    cursor: default !important;
`;

const SelectBar = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: #eff6ff;
    border-radius: 8px;
    font-size: 0.85rem;
    color: #1d4ed8;
`;

/* ────────── Inline edit styles ────────── */
const CellInput = styled.input`
    width: 100%;
    border: 1px solid #6366f1;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 0.875rem;
    box-sizing: border-box;
    outline: none;
    background: #f0f4ff;
`;

const EditHint = styled.span`
    font-size: 0.72rem;
    color: #94a3b8;
    margin-left: 0.5rem;
`;

/* ────────── Component ────────── */
export default function EventDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState("");
    const [deliveryMap, setDeliveryMap] = useState<Record<string, { status: string; sentAt: string | null; openedAt: string | null }>>({});

    // Inline editing
    const [localRows, setLocalRows] = useState<Record<string, string>[]>([]);
    const [editingCell, setEditingCell] = useState<{ rowIndex: number; col: string } | null>(null);
    const [editValue, setEditValue] = useState("");

    // 체크박스 선택
    const [checkedIndices, setCheckedIndices] = useState<Set<number>>(new Set());

    // 이메일 템플릿 편집
    const [emailSubject, setEmailSubject] = useState("");
    const [emailContent, setEmailContent] = useState("");
    const [templateSaving, setTemplateSaving] = useState(false);
    const [templateSaved, setTemplateSaved] = useState(false);

    // Campaign modal
    const [modalOpen, setModalOpen] = useState(false);
    const [campaignName, setCampaignName] = useState("");
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ sentCount: number; failCount: number; total: number; errors: { email: string; reason: string }[] } | null>(null);
    const [campaignError, setCampaignError] = useState<string | null>(null);

    const { createCampaign, sendCampaign } = useCampaignStore();

    useEffect(() => {
        fetch(`/api/events/${id}`)
            .then((r) => r.json())
            .then((data) => {
                if (!data.ok) throw new Error(data.error ?? "행사를 불러오지 못했습니다.");
                setEvent(data.event);
                setEmailSubject(data.event.emailSubject ?? "");
                setEmailContent(data.event.emailContent ?? "");
                const loaded: Record<string, string>[] = data.event?.data?.payload?.rows ?? [];
                setLocalRows(loaded);
                setCheckedIndices(new Set(loaded.map((_, i) => i)));
                setDeliveryMap(data.deliveryMap ?? {});
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <Page><Empty>불러오는 중...</Empty></Page>;
    if (error || !event) return <Page><ErrorMessage>{error ?? "행사를 찾을 수 없습니다."}</ErrorMessage></Page>;

    const rows = localRows;
    const allColumns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const displayColumns = getDisplayColumns(allColumns);
    const emailColKey = detectCol(EMAIL_KEYS, allColumns);

    const filteredIndexed = filter.trim()
        ? rows.map((r, i) => ({ row: r, origIdx: i }))
              .filter(({ row }) => displayColumns.some(({ key }) => row[key]?.toLowerCase().includes(filter.toLowerCase())))
        : rows.map((r, i) => ({ row: r, origIdx: i }));

    const visibleOrigIndices = filteredIndexed.map(({ origIdx }) => origIdx);
    const allVisibleChecked = visibleOrigIndices.length > 0 && visibleOrigIndices.every((i) => checkedIndices.has(i));
    const someVisibleChecked = visibleOrigIndices.some((i) => checkedIndices.has(i));

    async function handleTemplateSave() {
        setTemplateSaving(true);
        setTemplateSaved(false);
        const res = await fetch(`/api/events/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emailSubject, emailContent }),
        });
        const data = await res.json();
        setTemplateSaving(false);
        if (data.ok) {
            setEvent((prev) => prev ? { ...prev, emailSubject, emailContent } : prev);
            setTemplateSaved(true);
            setTimeout(() => setTemplateSaved(false), 2500);
        }
    }

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

    async function handleSendCampaign(e: React.FormEvent) {
        e.preventDefault();
        if (!campaignName.trim()) {
            setCampaignError("캠페인 이름을 입력하세요.");
            return;
        }
        setSending(true);
        setCampaignError(null);

        const campaign = await createCampaign({ name: campaignName, eventId: id });
        if (!campaign) {
            setCampaignError(useCampaignStore.getState().error ?? "캠페인 생성에 실패했습니다.");
            setSending(false);
            return;
        }

        const result = await sendCampaign(campaign.id, Array.from(checkedIndices));
        setSending(false);
        if (result) {
            setSendResult(result);
            setModalOpen(false);
            fetch(`/api/events/${id}`)
                .then((r) => r.json())
                .then((data) => { if (data.ok) setDeliveryMap(data.deliveryMap ?? {}); });
        } else {
            setCampaignError("이메일 발송에 실패했습니다.");
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
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <Title>{event.title}</Title>
                    <Badge status={event.status}>
                        {event.status === "ONGOING" ? "진행 중" : "종료"}
                    </Badge>
                </div>
                <MetaRow>
                    <span>📅 {formatDate(event.date)}</span>
                    {event.place && <span>📍 {event.place}</span>}
                    {event.sheetUrl && (
                        <a href={event.sheetUrl} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                            Google Sheets 열기
                        </a>
                    )}
                </MetaRow>
            </Card>

            {/* 이메일 템플릿 편집 */}
            <Card>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                    <SectionTitle style={{ margin: 0 }}>
                        이메일 템플릿
                        {!hasTemplate && (
                            <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "#ef4444", fontWeight: 400 }}>
                                (미설정 — 발송 전 반드시 설정하세요)
                            </span>
                        )}
                    </SectionTitle>
                    <PrimaryBtn
                        type="button"
                        onClick={handleTemplateSave}
                        disabled={templateSaving}
                        style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                    >
                        {templateSaving ? "저장 중..." : templateSaved ? "저장됨 ✓" : "저장"}
                    </PrimaryBtn>
                </div>
                <TemplateField>
                    <TemplateLabel htmlFor="email-subject">제목</TemplateLabel>
                    <TemplateInput
                        id="email-subject"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="예) {{행사명}} 참가 안내드립니다"
                    />
                </TemplateField>
                <TemplateField>
                    <TemplateLabel htmlFor="email-content">내용</TemplateLabel>
                    <TemplateTextarea
                        id="email-content"
                        value={emailContent}
                        onChange={(e) => setEmailContent(e.target.value)}
                        placeholder={"안녕하세요, {{이름}}님!\n\n{{행사명}} 행사에 참가 신청해 주셔서 감사합니다.\n\n..."}
                    />
                </TemplateField>
                <PlaceholderHint>
                    플레이스홀더: <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 4 }}>{"{{컬럼명}}"}</code> 형식으로 참가자 데이터가 치환됩니다.
                    기본 제공: <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 4 }}>{"{{행사명}}"}</code>
                </PlaceholderHint>
            </Card>

            {/* 참가자 데이터 */}
            <Card>
                <Toolbar>
                    <SectionTitle style={{ margin: 0 }}>
                        참가자 데이터 {rows.length > 0 && `(${rows.length}명)`}
                        {event.data && (
                            <span style={{ fontWeight: 400, fontSize: "0.8rem", color: "#94a3b8", marginLeft: "0.5rem" }}>
                                v{event.data.version}
                            </span>
                        )}
                    </SectionTitle>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                        {rows.length > 0 && (
                            <>
                                <FilterInput
                                    type="search"
                                    placeholder="검색..."
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                />
                                <GhostBtn onClick={() => exportCsv(localRows, `${event.title}_participants.csv`)}>
                                    CSV 내보내기
                                </GhostBtn>
                                <PrimaryBtn
                                    disabled={checkedIndices.size === 0 || !hasTemplate}
                                    title={!hasTemplate ? "이메일 템플릿을 먼저 설정하세요" : undefined}
                                    onClick={() => { setModalOpen(true); setSendResult(null); setCampaignName(""); }}
                                >
                                    이메일 발송 {checkedIndices.size > 0 && `(${checkedIndices.size}명)`}
                                </PrimaryBtn>
                            </>
                        )}
                    </div>
                </Toolbar>

                {rows.length === 0 ? (
                    <Empty>수집된 참가자 데이터가 없습니다. 행사 카드에서 Sheets URL로 데이터를 수집하세요.</Empty>
                ) : (
                    <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                            {filter ? (
                                <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                                    {filteredIndexed.length}명 표시 중 (전체 {rows.length}명)
                                </p>
                            ) : <span />}
                            {checkedIndices.size > 0 && (
                                <SelectBar>
                                    <strong>{checkedIndices.size}명</strong> 선택됨
                                    <button
                                        type="button"
                                        onClick={() => setCheckedIndices(new Set())}
                                        style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "0.8rem", padding: 0, textDecoration: "underline" }}
                                    >
                                        전체 해제
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCheckedIndices(new Set(rows.map((_, i) => i)))}
                                        style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "0.8rem", padding: 0, textDecoration: "underline" }}
                                    >
                                        전체 선택
                                    </button>
                                </SelectBar>
                            )}
                        </div>
                        <EditHint>셀을 클릭하면 직접 수정할 수 있습니다</EditHint>
                        <div style={{ overflowX: "auto" }}>
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
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredIndexed.map(({ row, origIdx }) => (
                                        <tr key={origIdx} style={{ background: checkedIndices.has(origIdx) ? undefined : "#fafafa" }}>
                                            <CheckTd onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={checkedIndices.has(origIdx)}
                                                    onChange={() => toggleRow(origIdx)}
                                                    aria-label={`행 ${origIdx + 1} 선택`}
                                                />
                                            </CheckTd>
                                            {displayColumns.map(({ key }) => {
                                                const isEditing = editingCell?.rowIndex === origIdx && editingCell?.col === key;
                                                return (
                                                    <td
                                                        key={key}
                                                        onClick={() => { if (!isEditing) startEdit(origIdx, key); }}
                                                        style={{ cursor: "pointer", minWidth: "80px" }}
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
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </>
                )}
            </Card>

            {/* 이메일 발송 모달 */}
            {modalOpen && (
                <Overlay onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
                    <Modal>
                        <ModalTitle>이메일 캠페인 발송</ModalTitle>
                        <p style={{ margin: 0, fontSize: "0.875rem", color: "#475569" }}>
                            <strong>{event.title}</strong> 행사의 선택된 참가자{" "}
                            <strong style={{ color: "#2563eb" }}>{checkedIndices.size}명</strong>
                            에게 이메일을 발송합니다.
                            {checkedIndices.size < rows.length && (
                                <span style={{ color: "#94a3b8", marginLeft: "0.25rem" }}>
                                    (전체 {rows.length}명 중)
                                </span>
                            )}
                        </p>
                        <div style={{ background: "#f8fafc", borderRadius: 8, padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#475569" }}>
                            <strong>제목:</strong> {event.emailSubject}<br />
                            <strong>내용:</strong> {(event.emailContent ?? "").slice(0, 80)}{(event.emailContent ?? "").length > 80 ? "…" : ""}
                        </div>
                        <form onSubmit={handleSendCampaign} style={{ display: "grid", gap: "1rem" }}>
                            <Field>
                                <Label htmlFor="campaign-name">캠페인 이름 *</Label>
                                <Input
                                    id="campaign-name"
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    placeholder="예) 1차 안내 발송"
                                />
                            </Field>
                            {campaignError && <ErrorMessage>{campaignError}</ErrorMessage>}
                            <ModalFooter>
                                <GhostBtn type="button" onClick={() => setModalOpen(false)}>취소</GhostBtn>
                                <PrimaryBtn type="submit" disabled={sending}>
                                    {sending ? "발송 중..." : `${checkedIndices.size}명에게 발송`}
                                </PrimaryBtn>
                            </ModalFooter>
                        </form>
                    </Modal>
                </Overlay>
            )}
        </Page>
    );
}
