"use client";

import styled from "@emotion/styled";
import { useRef, useEffect, FormEvent, useState, ChangeEvent } from "react";
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

// 포스터 업로드 관련
const PosterUploadArea = styled.label<{ hasPreview: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    height: 140px;
    border: 2px dashed ${({ hasPreview }) => (hasPreview ? "#2563eb" : "#d1d5db")};
    border-radius: 10px;
    cursor: pointer;
    overflow: hidden;
    position: relative;
    background: ${({ hasPreview }) => (hasPreview ? "#eff6ff" : "#f9fafb")};
    transition: border-color 0.15s, background 0.15s;
    &:hover { border-color: #2563eb; background: #eff6ff; }
`;

const PosterPreview = styled.img`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
`;

const PosterPlaceholder = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    color: #9ca3af;
    font-size: 0.85rem;
    pointer-events: none;
`;

const HiddenFileInput = styled.input`
    display: none;
`;

const UploadingOverlay = styled.div`
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.82rem;
    color: #2563eb;
    font-weight: 600;
`;

export default function AddEventModal({ onClose }: Props) {
    const { addEvent, loading } = useEventStore();
    const [error, setError] = useState<string | null>(null);
    const [posterFile, setPosterFile] = useState<File | null>(null);
    const [posterPreview, setPosterPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const firstInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        firstInputRef.current?.focus();
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    // 미리보기 URL 정리
    useEffect(() => {
        return () => {
            if (posterPreview) URL.revokeObjectURL(posterPreview);
        };
    }, [posterPreview]);

    const handlePosterChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("이미지 파일만 업로드할 수 있습니다.");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError("포스터 파일은 최대 10MB까지 업로드 가능합니다.");
            return;
        }
        setError(null);
        setPosterFile(file);
        if (posterPreview) URL.revokeObjectURL(posterPreview);
        setPosterPreview(URL.createObjectURL(file));
    };

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

        const date = new Date(dateRaw).toISOString();

        // 포스터 업로드
        let posterUrl: string | undefined;
        if (posterFile) {
            setUploading(true);
            try {
                const uploadFd = new FormData();
                uploadFd.append("file", posterFile);
                const res = await fetch("/api/upload/poster", { method: "POST", body: uploadFd });
                if (!res.ok) {
                    const text = await res.text();
                    let msg = "포스터 업로드 실패";
                    try { msg = JSON.parse(text).error ?? msg; } catch { /* plain text error */ }
                    throw new Error(msg);
                }
                const json = await res.json();
                posterUrl = json.url;
            } catch (err) {
                setError(err instanceof Error ? err.message : "포스터 업로드 중 오류가 발생했습니다.");
                setUploading(false);
                return;
            }
            setUploading(false);
        }

        await addEvent({ title, date, place, sheetUrl, posterUrl });
        onClose();
    };

    const isSubmitting = loading || uploading;

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

                    <Field>
                        <Label>행사 포스터</Label>
                        <PosterUploadArea hasPreview={!!posterPreview} htmlFor="poster-file">
                            {posterPreview && (
                                <PosterPreview src={posterPreview} alt="포스터 미리보기" />
                            )}
                            {!posterPreview && (
                                <PosterPlaceholder>
                                    <span style={{ fontSize: "1.5rem" }}>🖼️</span>
                                    <span>클릭하여 포스터 이미지 선택</span>
                                    <span style={{ fontSize: "0.75rem" }}>JPG, PNG, WebP · 최대 10MB</span>
                                </PosterPlaceholder>
                            )}
                            {uploading && <UploadingOverlay>업로드 중…</UploadingOverlay>}
                        </PosterUploadArea>
                        <HiddenFileInput
                            id="poster-file"
                            type="file"
                            accept="image/*"
                            onChange={handlePosterChange}
                        />
                        {posterFile && (
                            <Hint>{posterFile.name} · {(posterFile.size / 1024).toFixed(0)}KB → WebP로 변환 후 업로드됩니다</Hint>
                        )}
                    </Field>

                    <Footer>
                        <CancelButton type="button" onClick={onClose}>취소</CancelButton>
                        <SubmitButton type="submit" disabled={isSubmitting}>
                            {uploading ? "업로드 중…" : loading ? "저장 중…" : "행사 추가"}
                        </SubmitButton>
                    </Footer>
                </Form>
            </Dialog>
        </Backdrop>
    );
}
