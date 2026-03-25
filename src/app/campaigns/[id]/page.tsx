"use client";

import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

/* ────────── Types ────────── */
type DeliveryStatus = "PENDING" | "SENT" | "DELIVERED" | "OPENED" | "CLICKED" | "BOUNCED" | "FAILED";
type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "COMPLETED" | "FAILED";

interface Delivery {
    id: string;
    recipientEmail: string;
    recipientName?: string | null;
    status: DeliveryStatus;
    sentAt: string | null;
    openedAt: string | null;
    errorMessage: string | null;
}

interface Campaign {
    id: string;
    name: string;
    status: CampaignStatus;
    scheduledAt: string | null;
    createdAt: string;
    event: { id: string; title: string };
    deliveries: Delivery[];
    _count: { deliveries: number };
}

/* ────────── Palette ────────── */
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

const BackBtn = styled.button`
    appearance: none;
    background: none;
    border: none;
    cursor: pointer;
    color: ${C.inkMuted};
    font-size: 0.875rem;
    padding: 0;
    width: fit-content;
    transition: color 0.15s;
    &:hover { color: ${C.ink}; }
`;

const Card = styled.div`
    background: ${C.card};
    border: 1px solid ${C.border};
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 16px rgba(26, 26, 46, 0.06);
`;

const PageTitle = styled.h1`
    margin: 0 0 0.2rem;
    font-family: var(--font-serif, 'DM Serif Display', serif);
    font-size: 1.5rem;
    color: ${C.ink};
    letter-spacing: -0.3px;
`;

const Sub = styled.p`
    margin: 0;
    font-size: 0.875rem;
    color: ${C.inkMuted};
`;

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    @media (min-width: 600px) { grid-template-columns: repeat(4, 1fr); }
`;

const StatBox = styled.div`
    background: ${C.paper};
    border: 1px solid ${C.border};
    border-radius: 10px;
    padding: 1rem 1.25rem;
`;

const StatVal = styled.div`
    font-family: var(--font-serif, 'DM Serif Display', serif);
    font-size: 1.75rem;
    color: ${C.ink};
    line-height: 1;
`;

const StatLabel = styled.div`
    font-size: 0.75rem;
    color: ${C.inkMuted};
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
`;

type StatusBadgeProps = { s: DeliveryStatus | CampaignStatus };
const StatusBadge = styled.span<StatusBadgeProps>`
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
    white-space: nowrap;
    background: ${({ s }) => ({
        PENDING: "#f1f5f0", SENT: "#dbeafe", DELIVERED: "#dcfce7",
        OPENED: "#d1fae5", CLICKED: "#a7f3d0", BOUNCED: "#fef3c7",
        FAILED: "#fee2e2", DRAFT: "#f1f5f0", SCHEDULED: "#dbeafe",
        SENDING: "#fef9c3", COMPLETED: "#dcfce7",
    }[s] ?? "#f1f5f0")};
    color: ${({ s }) => ({
        PENDING: C.inkMuted, SENT: "#1d4ed8", DELIVERED: "#16a34a",
        OPENED: "#059669", CLICKED: "#047857", BOUNCED: "#b45309",
        FAILED: "#dc2626", DRAFT: C.inkMuted, SCHEDULED: "#1d4ed8",
        SENDING: "#a16207", COMPLETED: "#16a34a",
    }[s] ?? C.inkMuted)};
`;

const DELIVERY_LABEL: Record<DeliveryStatus, string> = {
    PENDING: "대기", SENT: "발송됨", DELIVERED: "수신됨",
    OPENED: "열람됨", CLICKED: "클릭됨", BOUNCED: "반송됨", FAILED: "실패",
};

const CAMPAIGN_LABEL: Record<CampaignStatus, string> = {
    DRAFT: "초안", SCHEDULED: "예약됨", SENDING: "발송 중",
    COMPLETED: "완료", FAILED: "실패",
};

const SectionTitle = styled.h2`
    margin: 0 0 1rem;
    font-family: var(--font-serif, 'DM Serif Display', serif);
    font-size: 1.05rem;
    color: ${C.ink};
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;

    th, td {
        padding: 0.6rem 0.75rem;
        text-align: left;
        border-bottom: 1px solid ${C.border};
    }
    th {
        color: ${C.inkMuted};
        font-weight: 500;
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        background: ${C.paper};
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: ${C.paper}; }
`;

const FilterInput = styled.input`
    padding: 0.4rem 0.75rem;
    border: 1px solid ${C.border};
    border-radius: 8px;
    font-size: 0.85rem;
    font-family: var(--font-sans, sans-serif);
    background: ${C.paper};
    color: ${C.ink};
    outline: none;
    width: 200px;

    &:focus {
        border-color: ${C.accent};
        box-shadow: 0 0 0 3px ${C.accentLight};
        background: #fff;
    }
`;

const Toolbar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
`;

const Empty = styled.div`
    text-align: center;
    padding: 2rem;
    color: ${C.inkMuted};
    font-size: 0.875rem;
`;

const ErrorMsg = styled.div`
    color: #dc2626;
    background: #fef2f2;
    border: 1px solid rgba(220, 38, 38, 0.2);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
`;

const ProgressBar = styled.div<{ pct: number; color?: string }>`
    height: 5px;
    border-radius: 999px;
    background: ${C.border};
    position: relative;
    margin-top: 0.5rem;

    &::after {
        content: "";
        position: absolute;
        left: 0; top: 0; bottom: 0;
        width: ${({ pct }) => Math.min(pct, 100)}%;
        border-radius: 999px;
        background: ${({ color }) => color ?? C.accent};
        transition: width 0.3s;
    }
`;

/* ────────── Utils ────────── */
function fmt(v: string | null) {
    if (!v) return "—";
    const d = new Date(v);
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function pct(a: number, b: number) {
    if (b === 0) return 0;
    return Math.round((a / b) * 100);
}

/* ────────── Component ────────── */
export default function CampaignDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState("");

    useEffect(() => {
        fetch(`/api/campaigns/${id}`)
            .then((r) => r.json())
            .then((data) => {
                if (!data.ok) throw new Error(data.error ?? "캠페인을 불러오지 못했습니다.");
                setCampaign(data.campaign);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <Page><Empty>불러오는 중...</Empty></Page>;
    if (error || !campaign) return <Page><ErrorMsg>{error ?? "캠페인을 찾을 수 없습니다."}</ErrorMsg></Page>;

    const deliveries = campaign.deliveries;
    const total = deliveries.length;
    const sentCount = deliveries.filter((d) => ["SENT", "DELIVERED", "OPENED", "CLICKED"].includes(d.status)).length;
    const openedCount = deliveries.filter((d) => ["OPENED", "CLICKED"].includes(d.status)).length;
    const failedCount = deliveries.filter((d) => d.status === "FAILED").length;
    const sentPct = pct(sentCount, total);
    const openPct = pct(openedCount, sentCount);

    const filtered = filter.trim()
        ? deliveries.filter((d) =>
            d.recipientEmail.toLowerCase().includes(filter.toLowerCase()) ||
            (d.recipientName ?? "").toLowerCase().includes(filter.toLowerCase())
        )
        : deliveries;

    return (
        <Page>
            <BackBtn onClick={() => router.push("/campaigns")}>← 캠페인 목록</BackBtn>

            {/* 헤더 */}
            <Card>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                    <div>
                        <PageTitle>{campaign.name}</PageTitle>
                        <Sub style={{ marginTop: "0.3rem" }}>{campaign.event.title}</Sub>
                        {campaign.scheduledAt && (
                            <Sub style={{ color: C.accent, marginTop: "0.25rem" }}>
                                예약 일시: {fmt(campaign.scheduledAt)}
                            </Sub>
                        )}
                    </div>
                    <StatusBadge s={campaign.status}>
                        {CAMPAIGN_LABEL[campaign.status]}
                    </StatusBadge>
                </div>
            </Card>

            {/* 통계 */}
            <Card>
                <SectionTitle>발송 통계</SectionTitle>
                <StatsGrid>
                    <StatBox>
                        <StatVal>{total}</StatVal>
                        <StatLabel>총 대상자</StatLabel>
                    </StatBox>
                    <StatBox>
                        <StatVal>{sentCount}</StatVal>
                        <StatLabel>발송 성공 ({sentPct}%)</StatLabel>
                        <ProgressBar pct={sentPct} color={C.accent} />
                    </StatBox>
                    <StatBox>
                        <StatVal>{openedCount}</StatVal>
                        <StatLabel>열람 ({openPct}%)</StatLabel>
                        <ProgressBar pct={openPct} color="#16a34a" />
                    </StatBox>
                    <StatBox>
                        <StatVal>{failedCount}</StatVal>
                        <StatLabel>실패</StatLabel>
                    </StatBox>
                </StatsGrid>
            </Card>

            {/* 수신자 목록 */}
            <Card>
                <Toolbar>
                    <SectionTitle style={{ margin: 0 }}>수신자 목록 ({total}명)</SectionTitle>
                    {total > 0 && (
                        <FilterInput
                            type="search"
                            placeholder="이메일/이름 검색..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    )}
                </Toolbar>

                {total === 0 ? (
                    <Empty>발송 기록이 없습니다.</Empty>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <Table>
                            <thead>
                                <tr>
                                    <th>이름</th>
                                    <th>이메일</th>
                                    <th>상태</th>
                                    <th>발송 시각</th>
                                    <th>열람 시각</th>
                                    <th>오류</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((d) => (
                                    <tr key={d.id}>
                                        <td>{d.recipientName ?? "—"}</td>
                                        <td>{d.recipientEmail}</td>
                                        <td>
                                            <StatusBadge s={d.status}>{DELIVERY_LABEL[d.status]}</StatusBadge>
                                        </td>
                                        <td style={{ color: C.inkMuted }}>{fmt(d.sentAt)}</td>
                                        <td style={{ color: C.inkMuted }}>{fmt(d.openedAt)}</td>
                                        <td style={{ color: "#dc2626", fontSize: "0.78rem" }}>
                                            {d.errorMessage ?? "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                        {filter && filtered.length === 0 && (
                            <Empty>검색 결과가 없습니다.</Empty>
                        )}
                    </div>
                )}
            </Card>
        </Page>
    );
}
