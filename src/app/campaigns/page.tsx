"use client";

import styled from "@emotion/styled";
import Link from "next/link";
import { useEffect } from "react";
import { useCampaignStore } from "@/src/store/useCampaignStore";

/* ────────── Styles ────────── */
const Page = styled.main`
    max-width: 960px;
    margin: 2rem auto;
    padding: 0 1rem;
    display: grid;
    gap: 1.5rem;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const Title = styled.h1`
    margin: 0;
    font-size: 1.35rem;
    color: #0f172a;
`;

const Grid = styled.div`
    display: grid;
    gap: 1rem;
`;

const Card = styled.article`
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    display: grid;
    gap: 0.75rem;
    text-decoration: none;
    color: inherit;
    cursor: pointer;
    transition: box-shadow 0.12s;
    &:hover { box-shadow: 0 4px 16px rgba(2,6,23,0.08); }
`;

const CardTop = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
`;

const CardTitle = styled.h3`
    margin: 0;
    font-size: 1rem;
    color: #0f172a;
`;

const CardSub = styled.p`
    margin: 0;
    font-size: 0.82rem;
    color: #64748b;
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
    font-size: 1.1rem;
    font-weight: 700;
    color: #0f172a;
`;

const StatLabel = styled.span`
    font-size: 0.75rem;
    color: #94a3b8;
`;

type StatusKey = "DRAFT" | "SCHEDULED" | "SENDING" | "COMPLETED" | "FAILED";

const StatusBadge = styled.span<{ s: StatusKey }>`
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
    background: ${({ s }) => ({
        DRAFT: "#f1f5f9",
        SCHEDULED: "#dbeafe",
        SENDING: "#fef9c3",
        COMPLETED: "#dcfce7",
        FAILED: "#fee2e2",
    }[s] ?? "#f1f5f9")};
    color: ${({ s }) => ({
        DRAFT: "#475569",
        SCHEDULED: "#1d4ed8",
        SENDING: "#a16207",
        COMPLETED: "#16a34a",
        FAILED: "#dc2626",
    }[s] ?? "#475569")};
`;

const STATUS_LABEL: Record<StatusKey, string> = {
    DRAFT: "초안",
    SCHEDULED: "예약됨",
    SENDING: "발송 중",
    COMPLETED: "완료",
    FAILED: "실패",
};

const Empty = styled.div`
    text-align: center;
    padding: 3rem 1rem;
    color: #94a3b8;
    font-size: 0.9rem;
`;

const ErrorMsg = styled.div`
    color: #ef4444;
    background: #fef2f2;
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
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1rem 1.25rem;
`;

function formatDatetime(v: string | null) {
    if (!v) return "—";
    const d = new Date(v);
    return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
            <Header>
                <Title>캠페인 현황</Title>
            </Header>

            {/* 전체 요약 통계 */}
            {completed.length > 0 && (
                <SummaryGrid>
                    <SummaryCard>
                        <StatValue>{campaigns.length}</StatValue>
                        <StatLabel style={{ display: "block", marginTop: 2 }}>전체 캠페인</StatLabel>
                    </SummaryCard>
                    <SummaryCard>
                        <StatValue>{completed.length}</StatValue>
                        <StatLabel style={{ display: "block", marginTop: 2 }}>완료</StatLabel>
                    </SummaryCard>
                    <SummaryCard>
                        <StatValue>{totalDeliveries}</StatValue>
                        <StatLabel style={{ display: "block", marginTop: 2 }}>총 발송 수</StatLabel>
                    </SummaryCard>
                    <SummaryCard>
                        <StatValue>{campaigns.filter((c) => c.status === "SCHEDULED").length}</StatValue>
                        <StatLabel style={{ display: "block", marginTop: 2 }}>예약 대기</StatLabel>
                    </SummaryCard>
                </SummaryGrid>
            )}

            {error && <ErrorMsg>{error}</ErrorMsg>}

            {loading && campaigns.length === 0 ? (
                <Empty>불러오는 중...</Empty>
            ) : campaigns.length === 0 ? (
                <Empty>
                    아직 캠페인이 없습니다.<br />
                    행사 상세 페이지에서 이메일 발송 버튼을 눌러 캠페인을 만들어 보세요.
                </Empty>
            ) : (
                <Grid>
                    {campaigns.map((c) => (
                        <Link key={c.id} href={`/campaigns/${c.id}`} style={{ textDecoration: "none" }}>
                            <Card as="div">
                                <CardTop>
                                    <div>
                                        <CardTitle>{c.name}</CardTitle>
                                        <CardSub>
                                            {c.event.title} · 템플릿: {c.template.name}
                                        </CardSub>
                                        {c.scheduledAt && c.status === "SCHEDULED" && (
                                            <CardSub style={{ color: "#1d4ed8" }}>
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
