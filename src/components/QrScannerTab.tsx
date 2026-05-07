"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { theme } from "@/src/styles/theme";

const C = {
  ink: theme.color.text,
  inkMuted: theme.color.muted,
  border: theme.color.border,
  accent: theme.color.accent,
  accentLight: theme.color.accentLight,
} as const;

/* ── Toast ── */
const toastIn = keyframes`
  from { opacity: 0; transform: translateY(-12px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;
const toastOut = keyframes`
  from { opacity: 1; transform: translateY(0) scale(1); }
  to   { opacity: 0; transform: translateY(-8px) scale(0.97); }
`;

const ToastPortal = styled.div`
  position: fixed;
  top: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  pointer-events: none;
`;

const Toast = styled.div<{ type: "success" | "already" | "error" | "invalid"; leaving: boolean }>`
  padding: 0.7rem 1.25rem;
  border-radius: 999px;
  font-size: 0.9rem;
  font-family: var(--font-sans, sans-serif);
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  animation: ${({ leaving }) => leaving ? toastOut : toastIn} 0.22s ease forwards;

  background: ${({ type }) =>
    type === "success" ? "#15803d" :
    type === "already" ? "#92400e" : "#991b1b"};
  color: #fff;
`;

/* ── Layout ── */
const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  padding: 0.5rem 0 1rem;
`;

const VideoBox = styled.div`
  position: relative;
  width: 100%;
  max-width: 360px;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  aspect-ratio: 1;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const Corner = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  &::before, &::after {
    content: "";
    position: absolute;
    width: 24px;
    height: 24px;
    border-color: #fff;
    border-style: solid;
    opacity: 0.7;
  }
  &::before {
    top: 12px; left: 12px;
    border-width: 3px 0 0 3px;
    border-radius: 4px 0 0 0;
  }
  &::after {
    bottom: 12px; right: 12px;
    border-width: 0 3px 3px 0;
    border-radius: 0 0 4px 0;
  }
`;

const StatusLabel = styled.div`
  font-size: 0.82rem;
  color: ${C.inkMuted};
  text-align: center;
`;

const Btn = styled.button`
  appearance: none;
  background: ${C.ink};
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 20px;
  font-size: 0.875rem;
  font-family: var(--font-sans, sans-serif);
  font-weight: 500;
  cursor: pointer;
  min-height: 40px;
  transition: background 0.15s;
  &:hover { background: #2d2d4a; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

/* ── Types ── */
type ScanResult =
  | { type: "success"; name: string; at: string }
  | { type: "already"; at: string }
  | { type: "invalid" }
  | { type: "error" };

interface ToastItem {
  id: number;
  result: ScanResult;
  leaving: boolean;
}

interface Props {
  eventId: string;
  onCheckinMapChange?: (rid: string, at: string) => void;
}

let toastId = 0;

export default function QrScannerTab({ eventId, onCheckinMapChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const processingRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<string>("카메라 준비 중...");
  const [lastToken, setLastToken] = useState<string>("");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((result: ScanResult) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, result, leaving: false }]);

    // 2.5초 후 leave 애니메이션
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => t.id === id ? { ...t, leaving: true } : t));
    }, 2500);
    // 2.75초 후 제거
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2750);
  }, []);

  const toastLabel = (r: ScanResult): string => {
    if (r.type === "success") return `✅ 체크인 완료${r.name ? ` — ${r.name}님` : ""}`;
    if (r.type === "already") return "⚠️ 이미 체크인된 참가자";
    if (r.type === "invalid") return "❌ 유효하지 않은 QR";
    return "❌ 처리 중 오류";
  };

  const startScanner = () => {
    setLastToken("");
    processingRef.current = false;
    setScanning(true);
  };

  const stopScanner = () => {
    BrowserMultiFormatReader.releaseAllStreams();
    setScanning(false);
  };

  useEffect(() => {
    if (!scanning) return;

    const reader = new BrowserMultiFormatReader();
    setStatus("QR 코드를 카메라에 비춰주세요");

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, async (res, err) => {
        if (!res || processingRef.current) return;
        if (err) return;

        const text = res.getText();
        const match = text.match(/\/api\/checkin\/([^/?#]+)/);
        if (!match) return;

        const token = match[1];
        if (token === lastToken) return;

        processingRef.current = true;
        setLastToken(token);
        setStatus("처리 중...");

        let result: ScanResult;
        try {
          const resp = await fetch(`/api/checkin/${token}/process`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId }),
          });
          const data = await resp.json();

          if (data.status === "success") {
            result = { type: "success", name: data.name ?? "", at: data.at ?? "" };
            if (data.rid && data.at && onCheckinMapChange) {
              onCheckinMapChange(data.rid, data.at);
            }
          } else if (data.status === "already") {
            result = { type: "already", at: data.at ?? "" };
          } else if (data.status === "invalid") {
            result = { type: "invalid" };
          } else {
            result = { type: "error" };
          }
        } catch {
          result = { type: "error" };
        }

        pushToast(result);
        setStatus("QR 코드를 카메라에 비춰주세요");
        processingRef.current = false;
      })
      .catch(() => {
        setStatus("카메라 접근에 실패했습니다. 권한을 확인해주세요.");
        setScanning(false);
      });

    return () => {
      BrowserMultiFormatReader.releaseAllStreams();
    };
  }, [scanning, lastToken, eventId, onCheckinMapChange, pushToast]);

  return (
    <>
      {/* 토스트 포털 */}
      <ToastPortal>
        {toasts.map((t) => (
          <Toast key={t.id} type={t.result.type} leaving={t.leaving}>
            {toastLabel(t.result)}
          </Toast>
        ))}
      </ToastPortal>

      <Wrap>
        {scanning ? (
          <>
            <VideoBox>
              <Video ref={videoRef} />
              <Corner />
            </VideoBox>
            <StatusLabel>{status}</StatusLabel>
            <Btn onClick={stopScanner} style={{ background: "transparent", color: C.ink, border: `1px solid ${C.border}` }}>
              스캔 중지
            </Btn>
          </>
        ) : (
          <Btn onClick={startScanner}>카메라로 QR 스캔</Btn>
        )}
      </Wrap>
    </>
  );
}
