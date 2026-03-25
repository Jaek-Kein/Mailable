"use client";

import styled from "@emotion/styled";
import { useRef, useEffect, FormEvent, useState } from "react";
import { useEventStore } from "@/src/store/useEventStore";

interface Props {
    onClose: () => void;
}

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(2px);
    display: grid;
    place-items: center;
    z-index: 100;
    padding: 1rem;
`;

const Dialog = styled.div`
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(2, 6, 23, 0.18);
    width: 100%;
    max-width: 480px;
    padding: 1.75rem;
    display: grid;
    gap: 1.25rem;
`;

const DialogHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const DialogTitle = styled.h2`
    margin: 0;
    font-size: 1.15rem;
    color: #0f172a;
`;

const CloseButton = styled.button`
    appearance: none;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.3rem;
    color: #64748b;
    padding: 2px 6px;
    border-radius: 6px;
    line-height: 1;
    &:hover { background: #f1f5f9; }
`;

const Form = styled.form`
    display: grid;
    gap: 1rem;
`;

const Field = styled.div`
    display: grid;
    gap: 0.35rem;
`;

const Label = styled.label`
    font-size: 0.85rem;
    font-weight: 600;
    color: #374151;
`;

const Required = styled.span`
    color: #ef4444;
    margin-left: 2px;
`;

const Input = styled.input`
    width: 100%;
    box-sizing: border-box;
    padding: 0.55rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.95rem;
    color: #0f172a;
    outline: none;
    transition: border-color 0.15s;
    &:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
    &::placeholder { color: #9ca3af; }
`;

const Hint = styled.p`
    margin: 0;
    font-size: 0.78rem;
    color: #6b7280;
`;

const ErrorText = styled.p`
    margin: 0;
    font-size: 0.83rem;
    color: #ef4444;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
`;

const Footer = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    margin-top: 0.25rem;
`;

const CancelButton = styled.button`
    appearance: none;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.55rem 1.1rem;
    font-size: 0.9rem;
    color: #475569;
    cursor: pointer;
    &:hover { background: #e2e8f0; }
`;

const SubmitButton = styled.button`
    appearance: none;
    background: #2563eb;
    border: none;
    border-radius: 8px;
    padding: 0.55rem 1.3rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: background 0.15s;
    &:hover { background: #1d4ed8; }
    &:disabled { background: #93c5fd; cursor: not-allowed; }
`;

export default function AddEventModal({ onClose }: Props) {
    const { addEvent, loading } = useEventStore();
    const [error, setError] = useState<string | null>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        firstInputRef.current?.focus();
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        const title = (fd.get("title") as string).trim();
        const dateRaw = fd.get("date") as string;
        const place = (fd.get("place") as string).trim();
        const sheetUrl = (fd.get("sheetUrl") as string).trim();

        if (!title) { setError("행사명을 입력해주세요."); return; }
        if (!dateRaw) { setError("날짜를 선택해주세요."); return; }

        // date input gives "YYYY-MM-DD", API expects ISO datetime
        const date = new Date(dateRaw).toISOString();

        await addEvent({
            title,
            date,
            place,
            sheetUrl,
        });

        onClose();
    };

    return (
        <Backdrop onClick={(e) => e.target === e.currentTarget && onClose()}>
            <Dialog role="dialog" aria-modal aria-labelledby="add-event-title">
                <DialogHeader>
                    <DialogTitle id="add-event-title">행사 추가</DialogTitle>
                    <CloseButton type="button" onClick={onClose} aria-label="닫기">✕</CloseButton>
                </DialogHeader>

                <Form onSubmit={handleSubmit}>
                    {error && <ErrorText>{error}</ErrorText>}

                    <Field>
                        <Label htmlFor="title">행사명<Required>*</Required></Label>
                        <Input
                            ref={firstInputRef}
                            id="title"
                            name="title"
                            placeholder="예: 2025 개발자 컨퍼런스"
                        />
                    </Field>

                    <Field>
                        <Label htmlFor="date">날짜<Required>*</Required></Label>
                        <Input id="date" name="date" type="date" />
                    </Field>

                    <Field>
                        <Label htmlFor="place">장소</Label>
                        <Input id="place" name="place" placeholder="예: 서울 코엑스 B홀" />
                    </Field>

                    <Field>
                        <Label htmlFor="sheetUrl">Google Sheets URL</Label>
                        <Input
                            id="sheetUrl"
                            name="sheetUrl"
                            type="url"
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                        />
                        <Hint>참가자 데이터를 불러올 스프레드시트 URL (선택)</Hint>
                    </Field>

                    <Footer>
                        <CancelButton type="button" onClick={onClose}>취소</CancelButton>
                        <SubmitButton type="submit" disabled={loading}>
                            {loading ? "저장 중…" : "행사 추가"}
                        </SubmitButton>
                    </Footer>
                </Form>
            </Dialog>
        </Backdrop>
    );
}
