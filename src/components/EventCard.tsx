"use client";

import styled from "@emotion/styled";
import { CSSProperties } from "react";

export type EventStatus = "scheduled" | "closed";

export interface EventCardProps {
    id?: string | number;
    title: string;
    date: string | Date;
    place?: string;
    posterUrl?: string | null;
    status?: EventStatus;
    onClick?: () => void;
    onMoreClick?: () => void;
    style?: CSSProperties;
    className?: string;
}

const Card = styled.article`
    background: ${({ theme }) => theme.color.card};
    border: 1px solid ${({ theme }) => theme.color.border};
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(2, 6, 23, 0.06);
    overflow: hidden;
    transition: transform 0.12s ease, box-shadow 0.12s ease;
    cursor: pointer;
    outline: none;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 18px rgba(2, 6, 23, 0.1);
    }
    &:focus-visible {
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.35);
    }
`;
const Poster = styled.div<{ src?: string | null }>`
    height: 160px;
    background: ${({ src }) =>
        src ? `center/cover no-repeat url("${src}")` : "#e5e7eb"};
    display: grid;
    place-items: center;
    color: #ffffffcc;
    font-weight: 600;
    letter-spacing: 0.2px;
`;

const Body = styled.div`
    padding: 14px 16px 16px;
    display: grid;
    gap: 8px;
`;

const Title = styled.h3`
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.3;
    color: ${({ theme }) => theme.color.text};
`;

const Meta = styled.div`
    font-size: 0.86rem;
    color: ${({ theme }) => theme.color.sub};
    line-height: 1.35;
`;

const Row = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const Dot = styled.span<{ tone?: "danger" | "success" | "warning" | "info" }>`
    display: inline-block;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px;
    background: ${({ theme, tone }) =>
        tone === "danger"
            ? theme.color.danger
            : tone === "success"
            ? theme.color.success
            : tone === "warning"
            ? theme.color.warning
            : theme.color.primary};
`;

const Toolbar = styled.div`
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 6px;
    button {
        appearance: none;
        border: 1px solid rgba(15, 23, 42, 0.08);
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(6px);
        border-radius: 10px;
        padding: 6px 8px;
        font-size: 0.8rem;
        cursor: pointer;
    }
`;

const Wrap = styled.div`
    position: relative;
`;

function formatDate(value: string | Date) {
    const d = typeof value === "string" ? new Date(value) : value;
    // 2024. 11. 03 형식
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}. ${m}. ${day}`;
}

function toneByStatus(
    status?: EventStatus
): "success" | "warning" | "danger" | "info" {
    switch (status) {
        case "scheduled":
            return "info";
        case "closed":
            return "warning";
        default:
            return "info";
    }
}

/**
 * EventCard
 * - 포스터(없으면 placeholder), 제목, 날짜, 장소
 * - 카드 전체 클릭 / 더보기 버튼 옵셔널
 */
export default function EventCard({
    title,
    date,
    place,
    posterUrl,
    status,
    onClick,
    onMoreClick,
    className,
    style,
}: EventCardProps) {
    return (
        <Wrap className={className} style={style}>
            {onMoreClick && (
                <Toolbar>
                    <button
                        type="button"
                        onClick={onMoreClick}
                        aria-label="더보기"
                    >
                        ⋯
                    </button>
                </Toolbar>
            )}

            <Card
                role="button"
                tabIndex={0}
                aria-label={`${title} 상세 열기`}
                onClick={onClick}
            >
                <Poster src={posterUrl}>
                    {!posterUrl && <span>Poster Area</span>}
                </Poster>

                <Body>
                    <Title>{title}</Title>
                    <Meta>
                        <Row>
                            <Dot tone={toneByStatus(status)} />
                            <span>{formatDate(date)}</span>
                        </Row>
                        {place && <div>{place}</div>}
                    </Meta>
                </Body>
            </Card>
        </Wrap>
    );
}
