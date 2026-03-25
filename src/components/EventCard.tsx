"use client";

import { useSheetStore } from "@/src/store/useSheetsStore";
import styled from "@emotion/styled";
import { useRouter } from "next/navigation";
import { CSSProperties, memo, useState } from "react";

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
    border-radius: ${({ theme }) => theme.radius.md};
    box-shadow: ${({ theme }) => theme.shadow.card};
    overflow: hidden;
    transition: transform 0.12s ease, box-shadow 0.12s ease;
    cursor: pointer;
    outline: none;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(26, 26, 46, 0.12);
    }

    &:focus-visible {
        box-shadow: 0 0 0 3px rgba(232, 83, 58, 0.3);
    }
`;

const Poster = styled.div<{ src?: string | null }>`
    height: 160px;
    background: ${({ src }) =>
        src ? `center/cover no-repeat url("${src}")` : "#f0ede8"};
    display: grid;
    place-items: center;
    color: #b0a898;
    font-size: 0.8rem;
    letter-spacing: 0.5px;
`;

const Body = styled.div`
    padding: 14px 16px 16px;
    display: grid;
    gap: 6px;
`;

const Title = styled.h3`
    margin: 0;
    font-family: var(--font-serif, 'DM Serif Display', serif);
    font-size: 1.05rem;
    line-height: 1.3;
    color: ${({ theme }) => theme.color.text};
`;

const Meta = styled.div`
    font-size: 0.84rem;
    color: ${({ theme }) => theme.color.muted};
    line-height: 1.4;
`;

const Row = styled.div`
    display: flex;
    align-items: center;
    gap: 0.4rem;
`;

const Dot = styled.span<{ tone?: "danger" | "success" | "warning" | "info" }>`
    display: inline-block;
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 999px;
    background: ${({ theme, tone }) =>
        tone === "danger"   ? theme.color.danger  :
        tone === "success"  ? theme.color.success :
        tone === "warning"  ? theme.color.warning :
        theme.color.accent};
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
        border: 1px solid rgba(26, 26, 46, 0.1);
        background: rgba(255, 255, 255, 0.92);
        backdrop-filter: blur(6px);
        border-radius: 8px;
        padding: 5px 9px;
        font-size: 0.78rem;
        cursor: pointer;
        transition: background 0.15s;
    }
`;

const Wrap = styled.div`
    position: relative;
`;

const DeleteBtn = styled.button`
    appearance: none;
    border: 1px solid rgba(239, 68, 68, 0.25) !important;
    background: rgba(255, 255, 255, 0.92) !important;
    backdrop-filter: blur(6px);
    border-radius: 8px;
    padding: 5px 9px;
    font-size: 0.78rem;
    cursor: pointer;
    color: ${({ theme }) => theme.color.danger};

    &:hover {
        background: #fef2f2 !important;
        border-color: ${({ theme }) => theme.color.danger} !important;
    }
`;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(26, 26, 46, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const Dialog = styled.div`
    background: #fff;
    border: 1px solid ${({ theme }) => theme.color.border};
    border-radius: ${({ theme }) => theme.radius.md};
    padding: 1.5rem 1.75rem;
    max-width: 360px;
    width: 90%;
    box-shadow: 0 12px 40px rgba(26, 26, 46, 0.16);
    display: grid;
    gap: 1rem;
`;

const DialogTitle = styled.h3`
    margin: 0;
    font-family: var(--font-serif, 'DM Serif Display', serif);
    font-size: 1.1rem;
    color: ${({ theme }) => theme.color.text};
`;

const DialogBody = styled.p`
    margin: 0;
    font-size: 0.875rem;
    color: ${({ theme }) => theme.color.sub};
    line-height: 1.55;
`;

const DialogActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
`;

const CancelButton = styled.button`
    appearance: none;
    border: 1px solid ${({ theme }) => theme.color.border};
    background: ${({ theme }) => theme.color.bg};
    border-radius: 8px;
    padding: 0.45rem 1rem;
    font-size: 0.875rem;
    cursor: pointer;
    color: ${({ theme }) => theme.color.sub};
    &:hover { background: ${({ theme }) => theme.color.border}; }
`;

const ConfirmDeleteButton = styled.button`
    appearance: none;
    border: none;
    background: ${({ theme }) => theme.color.danger};
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
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}. ${m}. ${day}`;
}

function toneByStatus(status?: EventStatus): "success" | "warning" | "danger" | "info" {
    switch (status) {
        case "scheduled": return "info";
        case "closed":    return "warning";
        default:          return "info";
    }
}

export default memo(function EventCard({
    id, title, date, place, posterUrl, status,
    onMoreClick, onDelete, className, style, sheetUrl,
}: EventCardProps) {
    const ingestFromSheetUrl = useSheetStore((s) => s.ingestFromSheetUrl);
    const loading = useSheetStore((s) => s.loading);
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
                            <CancelButton type="button" onClick={handleCancelDelete}>취소</CancelButton>
                            <ConfirmDeleteButton type="button" onClick={handleConfirmDelete}>삭제</ConfirmDeleteButton>
                        </DialogActions>
                    </Dialog>
                </Overlay>
            )}

            <Wrap className={className} style={style}>
                <Toolbar>
                    {onDelete && (
                        <DeleteBtn type="button" onClick={handleDeleteClick} aria-label="행사 삭제">
                            삭제
                        </DeleteBtn>
                    )}
                    {onMoreClick && (
                        <button type="button" onClick={onMoreClick} aria-label="더보기">⋯</button>
                    )}
                </Toolbar>

                <Card
                    role="button"
                    tabIndex={0}
                    aria-label={`${title} 상세 열기`}
                    onClick={onClick}
                >
                    <Poster src={posterUrl}>
                        {!posterUrl && <span>No Poster</span>}
                    </Poster>

                    <Body>
                        <Title>{title}</Title>
                        <Meta>
                            <Row>
                                <Dot tone={toneByStatus(status)} />
                                <span>{formatDate(date)}</span>
                            </Row>
                            {place && <div style={{ marginTop: '2px' }}>{place}</div>}
                        </Meta>
                    </Body>
                </Card>
            </Wrap>
        </>
    );
});
