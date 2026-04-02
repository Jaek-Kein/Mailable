"use client";

import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import StatCard from "@/src/components/StatCard";
import EventCard from "@/src/components/EventCard";
import AddEventModal from "@/src/components/AddEventModal";
import { useEventStore } from "@/src/store/useEventStore";

const Main = styled.main`
    max-width: 1200px;
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

const Section = styled.section`
    display: grid;
    gap: 1.25rem;
`;

const Grid3 = styled.div`
    display: grid;
    gap: 1rem;
    width: 100%;
    grid-template-columns: repeat(1, minmax(0, 1fr));
    @media (min-width: 768px) {
        grid-template-columns: repeat(3, 1fr);
    }
`;

const PageHeader = styled.header`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;

    @media (max-width: 480px) {
        flex-direction: column;
        gap: 0.75rem;
    }
`;

const HeadingGroup = styled.div`
    display: grid;
    gap: 0.2rem;
`;

const PageTitle = styled.h1`
    font-family: var(--font-serif, 'DM Serif Display', serif);
    font-size: 1.75rem;
    color: ${({ theme }) => theme.color.text};
    margin: 0;
    letter-spacing: -0.3px;

    @media (max-width: 480px) {
        font-size: 1.5rem;
    }
`;

const PageSub = styled.p`
    font-size: 0.875rem;
    color: ${({ theme }) => theme.color.muted};
    margin: 0;
`;

const SectionTitle = styled.h2`
    font-family: var(--font-serif, 'DM Serif Display', serif);
    font-size: 1.25rem;
    color: ${({ theme }) => theme.color.text};
    margin: 0;
    letter-spacing: -0.2px;
`;

const AddButton = styled.button`
    appearance: none;
    background: ${({ theme }) => theme.color.primary};
    border: none;
    border-radius: 10px;
    padding: 0.5rem 1.1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #fff;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s, transform 0.1s;
    min-height: 40px;

    &:hover {
        background: #2d2d4a;
        transform: translateY(-1px);
    }

    &:active { transform: translateY(0); }

    @media (max-width: 480px) {
        width: 100%;
        padding: 0.65rem 1.1rem;
        border-radius: 10px;
    }
`;

const LoadingMessage = styled.div`
    text-align: center;
    padding: 3rem;
    color: ${({ theme }) => theme.color.muted};
    font-size: 0.9rem;
`;

const ErrorMessage = styled.div`
    padding: 0.9rem 1.1rem;
    color: ${({ theme }) => theme.color.danger};
    background: #fef2f2;
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 10px;
    font-size: 0.875rem;
`;

const EmptyState = styled.div`
    grid-column: 1 / -1;
    text-align: center;
    padding: 3rem 1rem;
    color: ${({ theme }) => theme.color.muted};
    font-size: 0.9rem;
    border: 1px dashed ${({ theme }) => theme.color.border};
    border-radius: ${({ theme }) => theme.radius.md};
`;

const TabRow = styled.div`
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid ${({ theme }) => theme.color.border};
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
`;

const Tab = styled.button<{ active: boolean }>`
    appearance: none;
    border: none;
    background: none;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: ${({ active }) => (active ? 600 : 400)};
    color: ${({ theme, active }) => (active ? theme.color.text : theme.color.muted)};
    border-bottom: 2px solid ${({ theme, active }) => (active ? theme.color.accent : 'transparent')};
    margin-bottom: -1px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
    min-height: 40px;

    &:hover {
        color: ${({ theme }) => theme.color.text};
    }
`;

const TabCount = styled.span<{ active: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.35rem;
    margin-left: 0.35rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    background: ${({ theme, active }) => (active ? theme.color.accentLight : theme.color.border)};
    color: ${({ theme, active }) => (active ? theme.color.accent : theme.color.muted)};
`;

type TabType = 'all' | 'ongoing' | 'closed';

export default function Page() {
    const events = useEventStore((s) => s.events);
    const loading = useEventStore((s) => s.loading);
    const error = useEventStore((s) => s.error);
    const fetchEvents = useEventStore((s) => s.fetchEvents);
    const removeEvent = useEventStore((s) => s.removeEvent);
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('all');

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const ongoingEvents = events.filter(e => e.status !== 'CLOSED');
    const closedEvents = events.filter(e => e.status === 'CLOSED');
    const totalParticipants = events.reduce(
        (sum, e) => sum + (e.data?.payload?.rows?.length ?? 0),
        0
    );

    const filteredEvents = activeTab === 'ongoing'
        ? ongoingEvents
        : activeTab === 'closed'
            ? closedEvents
            : events;

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
                <PageHeader>
                    <HeadingGroup>
                        <PageTitle id="dashboard-heading">대시보드</PageTitle>
                        <PageSub>행사·메일 발송 현황을 한눈에 확인하세요.</PageSub>
                    </HeadingGroup>
                    <AddButton type="button" onClick={() => setShowModal(true)}>
                        + 행사 추가
                    </AddButton>
                </PageHeader>

                {error && <ErrorMessage>{error}</ErrorMessage>}

                <Grid3 aria-label="핵심 지표">
                    <StatCard label="진행 중 행사" value={ongoingEvents.length} />
                    <StatCard label="전체 행사" value={events.length} />
                    <StatCard label="총 참가자 수" value={totalParticipants} tone="success" />
                </Grid3>

                <div>
                    <SectionTitle style={{ marginBottom: '0.75rem' }}>행사 목록</SectionTitle>
                    <TabRow>
                        <Tab active={activeTab === 'all'} onClick={() => setActiveTab('all')}>
                            전체
                            <TabCount active={activeTab === 'all'}>{events.length}</TabCount>
                        </Tab>
                        <Tab active={activeTab === 'ongoing'} onClick={() => setActiveTab('ongoing')}>
                            진행 중
                            <TabCount active={activeTab === 'ongoing'}>{ongoingEvents.length}</TabCount>
                        </Tab>
                        <Tab active={activeTab === 'closed'} onClick={() => setActiveTab('closed')}>
                            완료
                            <TabCount active={activeTab === 'closed'}>{closedEvents.length}</TabCount>
                        </Tab>
                    </TabRow>
                </div>

                <Grid3 aria-label="이벤트 카드">
                    {filteredEvents.length === 0 && !loading ? (
                        <EmptyState>
                            {activeTab === 'all' ? (
                                <>
                                    등록된 행사가 없습니다.<br />
                                    <span style={{ fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                                        위의 행사 추가 버튼으로 첫 행사를 등록해 보세요.
                                    </span>
                                </>
                            ) : activeTab === 'ongoing' ? (
                                '진행 중인 행사가 없습니다.'
                            ) : (
                                '완료된 행사가 없습니다.'
                            )}
                        </EmptyState>
                    ) : (
                        filteredEvents.map((ev) => (
                            <EventCard
                                key={ev.id}
                                title={ev.title}
                                date={ev.date}
                                place={ev.place}
                                sheetUrl={ev.sheetUrl}
                                posterUrl={ev.posterUrl}
                                status={ev.status === 'CLOSED' ? 'closed' : 'scheduled'}
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
