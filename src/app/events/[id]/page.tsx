"use client";

import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTemplateStore } from "@/src/store/useTemplateStore";
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
    max-width: 520px;
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

const Select = styled.select`
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 0.875rem;
    width: 100%;
    box-sizing: border-box;
    background: #fff;
    &:focus { outline: 2px solid #2563eb; outline-offset: 1px; }
`;

const ModalFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
`;

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

    // Inline editing
    const [localRows, setLocalRows] = useState<Record<string, string>[]>([]);
    const [editingCell, setEditingCell] = useState<{ rowIndex: number; col: string } | null>(null);
    const [editValue, setEditValue] = useState("");

    // Campaign modal
    const [modalOpen, setModalOpen] = useState(false);
    const [campaignName, setCampaignName] = useState("");
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
    const [scheduledAt, setScheduledAt] = useState("");
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ sentCount: number; failCount: number; total: number; scheduled?: boolean } | null>(null);
    const [campaignError, setCampaignError] = useState<string | null>(null);

    const { templates, fetchTemplates } = useTemplateStore();
    const { createCampaign, sendCampaign } = useCampaignStore();

    useEffect(() => {
        fetch(`/api/events/${id}`)
            .then((r) => r.json())
            .then((data) => {
                if (!data.ok) throw new Error(data.error ?? "행사를 불러오지 못했습니다.");
                setEvent(data.event);
                setLocalRows(data.event?.data?.payload?.rows ?? []);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (modalOpen) fetchTemplates();
    }, [modalOpen, fetchTemplates]);

    if (loading) return <Page><Empty>불러오는 중...</Empty></Page>;
    if (error || !event) return <Page><ErrorMessage>{error ?? "행사를 찾을 수 없습니다."}</ErrorMessage></Page>;

    const rows = localRows;
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    // filteredRows carries the original row index for editing
    const filteredIndexed = filter.trim()
        ? rows.map((r, i) => ({ row: r, origIdx: i }))
              .filter(({ row }) => Object.values(row).some((v) => v?.toLowerCase().includes(filter.toLowerCase())))
        : rows.map((r, i) => ({ row: r, origIdx: i }));

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

    async function handleSendCampaign(e: React.FormEvent) {
        e.preventDefault();
        if (!campaignName.trim() || !selectedTemplateId) {
            setCampaignError("캠페인 이름과 템플릿을 선택하세요.");
            return;
        }
        if (sendMode === "schedule" && !scheduledAt) {
            setCampaignError("예약 발송 날짜/시간을 선택하세요.");
            return;
        }
        setSending(true);
        setCampaignError(null);

        const campaign = await createCampaign({
            name: campaignName,
            templateId: selectedTemplateId,
            eventId: id,
            scheduledAt: sendMode === "schedule" ? new Date(scheduledAt).toISOString() : undefined,
        });
        if (!campaign) {
            setCampaignError("캠페인 생성에 실패했습니다.");
            setSending(false);
            return;
        }

        if (sendMode === "schedule") {
            // 예약 발송: status를 SCHEDULED로 변경
            await fetch(`/api/campaigns/${campaign.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "SCHEDULED", scheduledAt: new Date(scheduledAt).toISOString() }),
            });
            setSending(false);
            setSendResult({ sentCount: 0, failCount: 0, total: rows.length, scheduled: true });
            setModalOpen(false);
        } else {
            const result = await sendCampaign(campaign.id);
            setSending(false);
            if (result) {
                setSendResult(result);
                setModalOpen(false);
            } else {
                setCampaignError("이메일 발송에 실패했습니다.");
            }
        }
    }

    return (
        <Page>
            <BackButton onClick={() => router.back()}>← 뒤로</BackButton>

            {sendResult && (
                <SuccessMsg>
                    {sendResult.scheduled
                        ? `예약 완료: ${sendResult.total}명에게 예약 발송이 등록되었습니다.`
                        : `발송 완료: ${sendResult.sentCount}/${sendResult.total}명 성공${sendResult.failCount > 0 ? ` (실패 ${sendResult.failCount}명)` : ""}`
                    }
                </SuccessMsg>
            )}

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
                                <PrimaryBtn onClick={() => { setModalOpen(true); setSendResult(null); setCampaignName(""); setSelectedTemplateId(""); setSendMode("now"); setScheduledAt(""); }}>
                                    이메일 발송
                                </PrimaryBtn>
                            </>
                        )}
                    </div>
                </Toolbar>

                {rows.length === 0 ? (
                    <Empty>수집된 참가자 데이터가 없습니다. 행사 카드에서 Sheets URL로 데이터를 수집하세요.</Empty>
                ) : (
                    <>
                        {filter && (
                            <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                                {filteredIndexed.length}명 표시 중 (전체 {rows.length}명)
                            </p>
                        )}
                        <EditHint>셀을 클릭하면 직접 수정할 수 있습니다</EditHint>
                        <div style={{ overflowX: "auto" }}>
                            <Table>
                                <thead>
                                    <tr>
                                        {columns.map((col) => <th key={col}>{col}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredIndexed.map(({ row, origIdx }) => (
                                        <tr key={origIdx}>
                                            {columns.map((col) => {
                                                const isEditing = editingCell?.rowIndex === origIdx && editingCell?.col === col;
                                                return (
                                                    <td
                                                        key={col}
                                                        onClick={() => { if (!isEditing) startEdit(origIdx, col); }}
                                                        style={{ cursor: "pointer", minWidth: "80px" }}
                                                    >
                                                        {isEditing ? (
                                                            <CellInput
                                                                autoFocus
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter") handleCellSave(origIdx, col, editValue);
                                                                    if (e.key === "Escape") setEditingCell(null);
                                                                }}
                                                                onBlur={() => handleCellSave(origIdx, col, editValue)}
                                                            />
                                                        ) : (
                                                            row[col] ?? "—"
                                                        )}
                                                    </td>
                                                );
                                            })}
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
                            <strong>{event.title}</strong> 행사의 참가자 {rows.length}명에게 이메일을 발송합니다.
                        </p>
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
                            <Field>
                                <Label htmlFor="template-select">이메일 템플릿 *</Label>
                                <Select
                                    id="template-select"
                                    value={selectedTemplateId}
                                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                                >
                                    <option value="">템플릿 선택...</option>
                                    {templates.map((t) => (
                                        <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>
                                    ))}
                                </Select>
                                {templates.length === 0 && (
                                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#ef4444" }}>
                                        템플릿이 없습니다.{" "}
                                        <a href="/templates" style={{ color: "#2563eb" }}>템플릿 관리</a>에서 먼저 만들어 주세요.
                                    </p>
                                )}
                            </Field>
                            <Field>
                                <Label>발송 방식</Label>
                                <div style={{ display: "flex", gap: "0.75rem" }}>
                                    {(["now", "schedule"] as const).map((mode) => (
                                        <label key={mode} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.875rem" }}>
                                            <input
                                                type="radio"
                                                name="sendMode"
                                                value={mode}
                                                checked={sendMode === mode}
                                                onChange={() => setSendMode(mode)}
                                            />
                                            {mode === "now" ? "즉시 발송" : "예약 발송"}
                                        </label>
                                    ))}
                                </div>
                            </Field>
                            {sendMode === "schedule" && (
                                <Field>
                                    <Label htmlFor="scheduled-at">예약 일시 *</Label>
                                    <Input
                                        id="scheduled-at"
                                        type="datetime-local"
                                        value={scheduledAt}
                                        onChange={(e) => setScheduledAt(e.target.value)}
                                        min={new Date().toISOString().slice(0, 16)}
                                    />
                                </Field>
                            )}
                            {campaignError && <ErrorMessage>{campaignError}</ErrorMessage>}
                            <ModalFooter>
                                <GhostBtn type="button" onClick={() => setModalOpen(false)}>취소</GhostBtn>
                                <PrimaryBtn type="submit" disabled={sending}>
                                    {sending
                                        ? (sendMode === "now" ? "발송 중..." : "등록 중...")
                                        : sendMode === "now"
                                            ? `${rows.length}명에게 즉시 발송`
                                            : "예약 등록"
                                    }
                                </PrimaryBtn>
                            </ModalFooter>
                        </form>
                    </Modal>
                </Overlay>
            )}
        </Page>
    );
}
