"use client";

import styled from "@emotion/styled";
import StatCard from "@/components/StatCard";
import EventCard from "@/components/EventCard";

const Main = styled.main`
    max-width: 1200px;
    margin: 1.25rem auto;
    padding: 0 1rem;
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
`;

const Section = styled.section`
    display: grid;
    gap: 1rem;
`;

const Grid3 = styled.div`
    display: grid;
    gap: 1.5rem;
    width: 100%;
    grid-template-columns: repeat(1, minmax(0, 1fr));
    @media (min-width: 768px) {
        grid-template-columns: repeat(3, 1fr);
    }
`;

export default function Page() {
    return (
        <Main>
            {/* 좌측 메인 콘텐츠 */}
            <Section aria-labelledby="dashboard-heading">
                <header>
                    <h1
                        id="dashboard-heading"
                        style={{ fontSize: "1.35rem", margin: 0 }}
                    >
                        대시보드
                    </h1>
                    <p
                        style={{
                            color: "#64748b",
                            margin: "0.25rem 0 0.75rem",
                        }}
                    >
                        행사·메일 발송 현황을 한눈에 확인하세요.
                    </p>
                </header>

                <Grid3 aria-label="핵심 지표">
                    <StatCard label="진행 중 행사" value={3} />
                    <StatCard label="미확인" value={12} tone="danger" />
                    <StatCard label="확인 완료" value={128} tone="success" />
                </Grid3>

                <header>
                    <h1
                        id="dashboard-heading"
                        style={{ fontSize: "1.35rem", margin: 0 }}
                    >
                        행사 목록
                    </h1>
                </header>

                <Grid3 aria-label="이벤트 카드">
                    <EventCard
                        title="유사쿠라"
                        date="2025.02.11"
                        status="closed"
                    ></EventCard>
                    <EventCard title="유사쿠라" date="2025.02.11"></EventCard>
                    <EventCard title="유사쿠라" date="2025.02.11"></EventCard>
                    <EventCard title="유사쿠라" date="2025.02.11"></EventCard>
                    <EventCard title="유사쿠라" date="2025.02.11"></EventCard>
                    <EventCard title="유사쿠라" date="2025.02.11"></EventCard>
                    <EventCard title="유사쿠라" date="2025.02.11"></EventCard>
                    <EventCard title="유사쿠라" date="2025.02.11"></EventCard>
                    <EventCard title="유사쿠라" date="2025.02.11"></EventCard>
                    <EventCard title="유사쿠라" date="2025.02.11"></EventCard>
                    <EventCard title="유사쿠라" date="2025.02.11"></EventCard>
                    <EventCard title="유사쿠라" date="2025.02.11"></EventCard>
                </Grid3>
            </Section>
        </Main>
    );
}
