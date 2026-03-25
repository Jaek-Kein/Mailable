"use client";

import styled from "@emotion/styled";
import Link from "next/link";
import { useEffect } from "react";
import { useCampaignStore } from "@/src/store/useCampaignStore";

/* ────────── Palette ────────── */
const C = {
    ink: "#1a1a2e",
    inkSoft: "#3d3d5c",
    inkMuted: "#8888a8",
    paper: "#faf9f7",
    accent: "#e8533a",
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

const PageTitle = styled.h1`
    margin: 0;
    font-family: var(--font-serif, 'DM Serif Display', serif);
    font-size: 1.75rem;
    color: ${C.ink};
    letter-spacing: -0.3px;
`;

const Grid = styled.div`
    display: grid;
    gap: 0.75rem;
`;

const Card = styled.article`
    background: ${C.card};
    border: 1px solid ${C.border};
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    display: grid;
    gap: 0.75rem;
    text-decoration: none;
    color: inherit;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(26, 26, 46, 0.06);
    transition: box-shadow 0.12s, transform 0.12s;

    &:hover {
        box-shadow: 0 8px 24px rgba(26, 26, 46, 0.1);
        transform: translateY(-1px);
    }
`;

const CardTop = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
`;

const CardTitle = styled.h3`
    margin: 0;
    font-family: var(--font-serif, 'DM Serif Display', serif);
    font-size: 1rem;
    color: ${C.ink};
`;

const CardSub = styled.p`
    margin: 0.15rem 0 0;
    font-size: 0.82rem;
    color: ${C.inkMuted};
`;

const StatsRow = styled.div`
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
`;

const Stat = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const StatValue = styled.span`
    font-size: 1rem;
    font-weight: 600;
    color: ${C.inkSoft};
`;

const StatLabel = styled.span`
    font-size: 0.72rem;
    color: ${C.inkMuted};
    text-transform: uppercase;
    letter-spacing: 0.3px;
`;

type StatusKey = "DRAFT" | "SCHEDULED" | "SENDING" | "COMPLETED" | "FAILED";

const StatusBadge = styled.span<{ s: StatusKey }>`
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
    white-space: nowrap;
    background: ${({ s }) => ({
        DRAFT: "#f1f5f0",
        SCHEDULED: "#dbeafe",
        SENDING: "#fef9c3",
        COMPLETED: "#dcfce7",
        FAILED: "#fee2e2",
    }[s] ?? "#f1f5f0")};
    color: ${({ s }) => ({
        DRAFT: C.inkMuted,
        SCHEDULED: "#1d4ed8",
        SENDING: "#a16207",
        COMPLETED: "#16a34a",
        FAILED: "#dc2626",
    }[s] ?? C.inkMuted)};
`;

const STATUS_LABEL: Record<StatusKey, string> = {
    DRAFT: "초안", SCHEDULED: "예약됨", SENDING: "발송 중", COMPLETED: "완료", FAILED: "실패",
};

const Empty = styled.div`
    text-align: center;
    padding: 4rem 1rem;
    color: ${C.inkMuted};
    font-size: 0.9rem;
    line-height: 1.7;
    border: 1px dashed ${C.border};
    border-radius: 12px;
`;

const ErrorMsg = styled.div`
    color: #dc2626;
    background: #fef2f2;
    border: 1px solid rgba(220, 38, 38, 0.2);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
`;

const SummaryGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    @media (min-width: 640px) { grid-template-columns: repeat(4, 1fr); }
`;

const SummaryCard = styled.div`
    background: ${C.card};
    border: 1px solid ${C.border};
    border-radius: 12px;
    padding: 1rem 1.25rem;
    box-shadow: 0 4px 16px rgba(26, 26, 46, 0.06);
`;

const SummaryVal = styled.div`
    font-family: var(--font-serif, 'DM Serif Display', serif);
    font-size: 1.75rem;
    color: ${C.ink};
    line-height: 1;
`;

const SummaryLabel = styled.div`
    font-size: 0.72rem;
    color: ${C.inkMuted};
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
`;

function formatDatetime(v: string | null) {
    if (!v) return "—";
    const d = new Date(v);
    return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}`;
}

export default function CampaignsPage() {
    const { campaigns, loading, error, fetchCampaigns } = useCampaignStore();

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    const completed = campaigns.filter((c) => c.status === "COMPLETED");
    const totalDeliveries = completed.reduce((s, c) => s + c._count.deliveries, 0);

    return (
        <Page>
            <PageTitle>캠페인 현황</PageTitle>

            {completed.length > 0 && (
                <SummaryGrid>
                    <SummaryCard>
                        <SummaryVal>{campaigns.length}</SummaryVal>
                        <SummaryLabel>전체 캠페인</SummaryLabel>
                    </SummaryCard>
                    <SummaryCard>
                        <SummaryVal>{completed.length}</SummaryVal>
                        <SummaryLabel>완료</SummaryLabel>
                    </SummaryCard>
                    <SummaryCard>
                        <SummaryVal>{totalDeliveries}</SummaryVal>
                        <SummaryLabel>총 발송 수</SummaryLabel>
                    </SummaryCard>
                    <SummaryCard>
                        <SummaryVal>{campaigns.filter((c) => c.status === "SCHEDULED").length}</SummaryVal>
                        <SummaryLabel>예약 대기</SummaryLabel>
                    </SummaryCard>
                </SummaryGrid>
            )}

            {error && <ErrorMsg>{error}</ErrorMsg>}

            {loading && campaigns.length === 0 ? (
                <Empty>불러오는 중...</Empty>
            ) : campaigns.length === 0 ? (
                <Empty>
                    아직 캠페인이 없습니다.<br />
                    행사 상세 페이지에서 이메일 발송 버튼을 눌러<br />캠페인을 만들어 보세요.
                </Empty>
            ) : (
                <Grid>
                    {campaigns.map((c) => (
                        <Link key={c.id} href={`/campaigns/${c.id}`} style={{ textDecoration: "none" }}>
                            <Card as="div">
                                <CardTop>
                                    <div>
                                        <CardTitle>{c.name}</CardTitle>
                                        <CardSub>{c.event.title}</CardSub>
                                        {c.scheduledAt && c.status === "SCHEDULED" && (
                                            <CardSub style={{ color: C.accent }}>
                                                예약 발송: {formatDatetime(c.scheduledAt)}
                                            </CardSub>
                                        )}
                                    </div>
                                    <StatusBadge s={c.status as StatusKey}>
                                        {STATUS_LABEL[c.status as StatusKey] ?? c.status}
                                    </StatusBadge>
                                </CardTop>

                                <StatsRow>
                                    <Stat>
                                        <StatValue>{c._count.deliveries}</StatValue>
                                        <StatLabel>발송 대상</StatLabel>
                                    </Stat>
                                    <Stat>
                                        <StatValue>{formatDatetime(c.createdAt)}</StatValue>
                                        <StatLabel>생성일</StatLabel>
                                    </Stat>
                                </StatsRow>
                            </Card>
                        </Link>
                    ))}
                </Grid>
            )}
        </Page>
    );
}
