"use client";

import { useSheetStore } from "@/src/store/useSheetsStore";
import styled from "@emotion/styled";
import { useRouter } from "next/navigation";
import { CSSProperties, useState } from "react";

export type EventStatus = "scheduled" | "closed";

export interface EventCardProps {
    id: string;
    title: string;
    date: string | Date;
    sheetUrl: string;
    place?: string;
    posterUrl?: string | null;
    status?: EventStatus;
    onClick?: () => void;
    onMoreClick?: () => void;
    onDelete?: (id: string) => void;
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
    z-index: 1;
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

const DeleteBtn = styled.button`
    appearance: none;
    border: 1px solid rgba(239, 68, 68, 0.3) !important;
    background: rgba(255, 255, 255, 0.9) !important;
    backdrop-filter: blur(6px);
    border-radius: 10px;
    padding: 6px 8px;
    font-size: 0.8rem;
    cursor: pointer;
    color: #ef4444;
    &:hover {
        background: #fef2f2 !important;
        border-color: #ef4444 !important;
    }
`;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const Dialog = styled.div`
    background: #fff;
    border-radius: 12px;
    padding: 1.5rem 2rem;
    max-width: 360px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
    display: grid;
    gap: 1rem;
`;

const DialogTitle = styled.h3`
    margin: 0;
    font-size: 1rem;
    color: #0f172a;
`;

const DialogBody = styled.p`
    margin: 0;
    font-size: 0.9rem;
    color: #475569;
    line-height: 1.5;
`;

const DialogActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
`;

const CancelButton = styled.button`
    appearance: none;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    border-radius: 8px;
    padding: 0.45rem 1rem;
    font-size: 0.875rem;
    cursor: pointer;
    color: #475569;
    &:hover { background: #f1f5f9; }
`;

const ConfirmDeleteButton = styled.button`
    appearance: none;
    border: none;
    background: #ef4444;
    border-radius: 8px;
    padding: 0.45rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    color: #fff;
    &:hover { background: #dc2626; }
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
    id,
    title,
    date,
    place,
    posterUrl,
    status,
    onMoreClick,
    onDelete,
    className,
    style,
    sheetUrl,
}: EventCardProps) {
    const { ingestFromSheetUrl, loading } = useSheetStore();
    const router = useRouter();
    const [showConfirm, setShowConfirm] = useState(false);

    const onClick = async () => {
        if (loading) return;
        if (sheetUrl) await ingestFromSheetUrl(sheetUrl, id);
        router.push(`/events/${id}`);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowConfirm(true);
    };

    const handleConfirmDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowConfirm(false);
        onDelete?.(id);
    };

    const handleCancelDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowConfirm(false);
    };

    return (
        <>
            {showConfirm && (
                <Overlay onClick={handleCancelDelete}>
                    <Dialog onClick={(e) => e.stopPropagation()}>
                        <DialogTitle>행사 삭제</DialogTitle>
                        <DialogBody>
                            <strong>{title}</strong> 행사를 삭제하시겠습니까?<br />
                            삭제하면 참가자 데이터와 캠페인 기록이 모두 사라집니다.
                        </DialogBody>
                        <DialogActions>
                            <CancelButton type="button" onClick={handleCancelDelete}>
                                취소
                            </CancelButton>
                            <ConfirmDeleteButton type="button" onClick={handleConfirmDelete}>
                                삭제
                            </ConfirmDeleteButton>
                        </DialogActions>
                    </Dialog>
                </Overlay>
            )}

            <Wrap className={className} style={style}>
                <Toolbar>
                    {onDelete && (
                        <DeleteBtn
                            type="button"
                            onClick={handleDeleteClick}
                            aria-label="행사 삭제"
                        >
                            삭제
                        </DeleteBtn>
                    )}
                    {onMoreClick && (
                        <button
                            type="button"
                            onClick={onMoreClick}
                            aria-label="더보기"
                        >
                            ⋯
                        </button>
                    )}
                </Toolbar>

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
        </>
    );
}
