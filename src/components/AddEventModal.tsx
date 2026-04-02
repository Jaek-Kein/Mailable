"use client";

import styled from "@emotion/styled";
import { useRef, useEffect, FormEvent, useState, ChangeEvent } from "react";
import { useEventStore } from "@/src/store/useEventStore";

/** Canvas API로 이미지를 WebP로 변환 (최대 800px). WebP 미지원 시 PNG로 폴백 */
async function toWebP(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const MAX_W = 800;
            const scale = Math.min(1, MAX_W / img.width);
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                (blob) => {
                    if (blob && blob.type === "image/webp") return resolve(blob);
                    canvas.toBlob(
                        (pngBlob) => pngBlob ? resolve(pngBlob) : reject(new Error("이미지 변환 실패")),
                        "image/png"
                    );
                },
                "image/webp",
                0.8
            );
        };
        img.onerror = () => reject(new Error("이미지를 읽을 수 없습니다."));
        img.src = URL.createObjectURL(file);
    });
}

interface Props {
    onClose: () => void;
}

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(26, 26, 46, 0.5);
    backdrop-filter: blur(3px);
    display: grid;
    place-items: center;
    z-index: 100;
    padding: 1rem;

    @media (max-width: 480px) {
        padding: 0;
        align-items: flex-end;
    }
`;

const Dialog = styled.div`
    background: #fff;
    border: 1px solid ${({ theme }) => theme.color.border};
    border-radius: 16px;
    box-shadow: 0 16px 48px rgba(26, 26, 46, 0.18);
    width: 100%;
    max-width: 480px;
    padding: 1.75rem;
    display: grid;
    gap: 1.25rem;

    @media (max-width: 480px) {
        border-radius: 20px 20px 0 0;
        max-width: 100%;
        padding: 1.5rem 1.25rem 2rem;
        max-height: 92dvh;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
    }
`;

const DialogHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const DialogTitle = styled.h2`
    margin: 0;
    font-family: var(--font-serif, 'DM Serif Display', serif);
    font-size: 1.25rem;
    color: ${({ theme }) => theme.color.text};
    letter-spacing: -0.2px;
`;

const CloseButton = styled.button`
    appearance: none;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.2rem;
    color: ${({ theme }) => theme.color.muted};
    padding: 2px 6px;
    border-radius: 6px;
    line-height: 1;

    &:hover {
        background: ${({ theme }) => theme.color.bg};
        color: ${({ theme }) => theme.color.text};
    }
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
    font-size: 0.82rem;
    font-weight: 500;
    color: ${({ theme }) => theme.color.sub};
`;

const Required = styled.span`
    color: ${({ theme }) => theme.color.accent};
    margin-left: 2px;
`;

const Input = styled.input`
    width: 100%;
    box-sizing: border-box;
    padding: 0.55rem 0.8rem;
    border: 1px solid ${({ theme }) => theme.color.border};
    border-radius: 8px;
    font-size: 0.9rem;
    font-family: var(--font-sans, sans-serif);
    color: ${({ theme }) => theme.color.text};
    background: ${({ theme }) => theme.color.bg};
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    min-height: 44px;

    &:focus {
        border-color: ${({ theme }) => theme.color.accent};
        box-shadow: 0 0 0 3px ${({ theme }) => theme.color.accentLight};
        background: #fff;
    }

    &::placeholder { color: ${({ theme }) => theme.color.muted}; }

    @media (max-width: 480px) {
        font-size: 1rem; /* 모바일 iOS 줌 방지 (16px 미만 시 자동 줌) */
    }
`;

const Hint = styled.p`
    margin: 0;
    font-size: 0.78rem;
    color: ${({ theme }) => theme.color.muted};
`;

const ErrorText = styled.p`
    margin: 0;
    font-size: 0.83rem;
    color: ${({ theme }) => theme.color.danger};
    background: #fef2f2;
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
`;

const Footer = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    margin-top: 0.25rem;

    @media (max-width: 480px) {
        flex-direction: column-reverse;
        gap: 0.5rem;

        button {
            width: 100%;
            padding: 0.7rem 1rem;
            justify-content: center;
        }
    }
`;

const CancelButton = styled.button`
    appearance: none;
    background: ${({ theme }) => theme.color.bg};
    border: 1px solid ${({ theme }) => theme.color.border};
    border-radius: 8px;
    padding: 0.55rem 1.1rem;
    font-size: 0.875rem;
    color: ${({ theme }) => theme.color.sub};
    cursor: pointer;
    &:hover { background: ${({ theme }) => theme.color.border}; }
`;

const SubmitButton = styled.button`
    appearance: none;
    background: ${({ theme }) => theme.color.primary};
    border: none;
    border-radius: 8px;
    padding: 0.55rem 1.3rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #fff;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;

    &:hover { background: #2d2d4a; transform: translateY(-1px); }
    &:active { transform: translateY(0); }
    &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
`;

const PosterUploadArea = styled.label<{ hasPreview: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    height: 140px;
    border: 2px dashed ${({ theme, hasPreview }) => hasPreview ? theme.color.accent : theme.color.border};
    border-radius: 10px;
    cursor: pointer;
    overflow: hidden;
    position: relative;
    background: ${({ theme, hasPreview }) => hasPreview ? theme.color.accentLight : theme.color.bg};
    transition: border-color 0.15s, background 0.15s;

    &:hover {
        border-color: ${({ theme }) => theme.color.accent};
        background: ${({ theme }) => theme.color.accentLight};
    }
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
    color: ${({ theme }) => theme.color.muted};
    font-size: 0.85rem;
    pointer-events: none;
`;

const HiddenFileInput = styled.input`display: none;`;

const UploadingOverlay = styled.div`
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.82rem;
    color: ${({ theme }) => theme.color.accent};
    font-weight: 500;
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
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    useEffect(() => {
        return () => { if (posterPreview) URL.revokeObjectURL(posterPreview); };
    }, [posterPreview]);

    const handlePosterChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) { setError("이미지 파일만 업로드할 수 있습니다."); return; }
        if (file.size > 10 * 1024 * 1024) { setError("포스터 파일은 최대 10MB까지 업로드 가능합니다."); return; }
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

        let posterUrl: string | undefined;
        if (posterFile) {
            setUploading(true);
            try {
                const webpBlob = await toWebP(posterFile);
                const ext = webpBlob.type === "image/webp" ? "webp" : "png";
                const fd = new FormData();
                fd.append("file", new File([webpBlob], `poster.${ext}`, { type: webpBlob.type }));
                const res = await fetch("/api/upload/poster", { method: "POST", body: fd });
                if (!res.ok) {
                    const text = await res.text();
                    let msg = "포스터 업로드 실패";
                    try { msg = JSON.parse(text).error ?? msg; } catch { /* plain text */ }
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
                        <Input ref={firstInputRef} id="title" name="title" placeholder="예: 2025 개발자 컨퍼런스" />
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
                        <Input id="sheetUrl" name="sheetUrl" type="url" placeholder="https://docs.google.com/spreadsheets/d/..." />
                        <Hint>참가자 데이터를 불러올 스프레드시트 URL (선택)</Hint>
                    </Field>

                    <Field>
                        <Label>행사 포스터</Label>
                        <PosterUploadArea hasPreview={!!posterPreview} htmlFor="poster-file">
                            {posterPreview && <PosterPreview src={posterPreview} alt="포스터 미리보기" />}
                            {!posterPreview && (
                                <PosterPlaceholder>
                                    <span style={{ fontSize: "1.5rem" }}>🖼️</span>
                                    <span>클릭하여 포스터 이미지 선택</span>
                                    <span style={{ fontSize: "0.75rem" }}>JPG, PNG, WebP · 최대 10MB</span>
                                </PosterPlaceholder>
                            )}
                            {uploading && <UploadingOverlay>업로드 중…</UploadingOverlay>}
                        </PosterUploadArea>
                        <HiddenFileInput id="poster-file" type="file" accept="image/*" onChange={handlePosterChange} />
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
