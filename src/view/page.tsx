"use client";

import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import StatCard from "@/src/components/StatCard";
import EventCard from "@/src/components/EventCard";
import AddEventModal from "@/src/components/AddEventModal";
import { useEventStore } from "@/src/store/useEventStore";

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

const LoadingMessage = styled.div`
    text-align: center;
    padding: 2rem;
    color: #64748b;
`;

const ErrorMessage = styled.div`
    text-align: center;
    padding: 2rem;
    color: #ef4444;
    background: #fef2f2;
    border-radius: 8px;
    margin: 1rem 0;
`;

const AddButton = styled.button`
    appearance: none;
    background: #2563eb;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1.1rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    white-space: nowrap;
    &:hover { background: #1d4ed8; }
`;

export default function Page() {
    const { events, loading, error, fetchEvents, removeEvent } = useEventStore();
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // 실제 EventData.payload.rows 에서 참가자 수 집계
    const ongoingEvents = events.filter(e => e.status !== 'CLOSED').length;
    const totalParticipants = events.reduce(
        (sum, e) => sum + (e.data?.payload?.rows?.length ?? 0),
        0
    );

    if (loading && events.length === 0) {
        return (
            <Main>
                <LoadingMessage>이벤트를 불러오는 중...</LoadingMessage>
            </Main>
        );
    }

    return (
        <>
        {showModal && (
            <AddEventModal onClose={() => { setShowModal(false); fetchEvents(); }} />
        )}
        <Main>
            <Section aria-labelledby="dashboard-heading">
                <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                    <div>
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
                    </div>
                    <AddButton type="button" onClick={() => setShowModal(true)}>
                        + 행사 추가
                    </AddButton>
                </header>

                {error && (
                    <ErrorMessage>
                        {error}
                    </ErrorMessage>
                )}

                <Grid3 aria-label="핵심 지표">
                    <StatCard label="진행 중 행사" value={ongoingEvents} />
                    <StatCard label="전체 행사" value={events.length} />
                    <StatCard label="총 참가자 수" value={totalParticipants} tone="success" />
                </Grid3>

                <header>
                    <h1
                        style={{ fontSize: "1.35rem", margin: 0 }}
                    >
                        행사 목록
                    </h1>
                </header>

                <Grid3 aria-label="이벤트 카드">
                    {events.length === 0 && !loading ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            등록된 행사가 없습니다.
                        </div>
                    ) : (
                        events.map((ev) => (
                            <EventCard
                                key={ev.id}
                                title={ev.title}
                                date={ev.date}
                                place={ev.place}
                                sheetUrl={ev.sheetUrl}
                                posterUrl={ev.posterUrl}
                                id={ev.id}
                                onDelete={removeEvent}
                            />
                        ))
                    )}
                </Grid3>
            </Section>
        </Main>
        </>
    );
}
