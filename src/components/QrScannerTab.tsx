"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import styled from "@emotion/styled";
import { theme } from "@/src/styles/theme";

const C = {
  ink: theme.color.text,
  inkMuted: theme.color.muted,
  inkSoft: theme.color.sub,
  border: theme.color.border,
  card: theme.color.card,
  accent: theme.color.accent,
  accentLight: theme.color.accentLight,
} as const;

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

const ScanLine = styled.div<{ scanning: boolean }>`
  position: absolute;
  inset: 0;
  pointer-events: none;
  &::after {
    content: "";
    display: ${({ scanning }) => scanning ? "block" : "none"};
    position: absolute;
    left: 10%;
    right: 10%;
    height: 2px;
    background: ${C.accent};
    opacity: 0.85;
    border-radius: 1px;
    animation: scanMove 1.8s ease-in-out infinite;
    box-shadow: 0 0 8px ${C.accent};
  }
  @keyframes scanMove {
    0%   { top: 10%; }
    50%  { top: 88%; }
    100% { top: 10%; }
  }
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

const ResultBox = styled.div<{ type: "success" | "already" | "error" | "invalid" }>`
  width: 100%;
  max-width: 360px;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  font-size: 0.9rem;
  line-height: 1.5;
  background: ${({ type }) =>
    type === "success" ? "#f0fdf4" :
    type === "already" ? "#fffbeb" : "#fef2f2"};
  border: 1px solid ${({ type }) =>
    type === "success" ? "#86efac" :
    type === "already" ? "#fcd34d" : "#fca5a5"};
  color: ${({ type }) =>
    type === "success" ? "#15803d" :
    type === "already" ? "#92400e" : "#991b1b"};
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
`;

const Icon = styled.span`
  font-size: 1.3rem;
  line-height: 1;
  flex-shrink: 0;
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

type ScanResult =
  | { type: "success"; name: string; at: string }
  | { type: "already"; at: string }
  | { type: "invalid" }
  | { type: "error" };

interface Props {
  eventId: string;
  onCheckinMapChange?: (rid: string, at: string) => void;
}

export default function QrScannerTab({ eventId, onCheckinMapChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const processingRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<string>("카메라 준비 중...");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [lastToken, setLastToken] = useState<string>("");

  const startScanner = () => {
    setResult(null);
    setLastToken("");
    processingRef.current = false;
    setScanning(true);
  };

  useEffect(() => {
    if (!scanning) return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    setStatus("QR 코드를 카메라에 비춰주세요");

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, async (res, err) => {
        if (!res || processingRef.current) return;
        if (err) return;

        const text = res.getText();

        // 체크인 URL에서 토큰 추출
        const match = text.match(/\/api\/checkin\/([^/?#]+)/);
        if (!match) return;

        const token = match[1];
        if (token === lastToken) return; // 동일 QR 연속 스캔 무시

        processingRef.current = true;
        setLastToken(token);
        setStatus("처리 중...");

        try {
          const res2 = await fetch(`/api/checkin/${token}/process`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId }),
          });
          const data = await res2.json();

          if (data.status === "success") {
            setResult({ type: "success", name: data.name ?? "", at: data.at ?? "" });
            if (data.rid && data.at && onCheckinMapChange) {
              onCheckinMapChange(data.rid, data.at);
            }
          } else if (data.status === "already") {
            setResult({ type: "already", at: data.at ?? "" });
          } else if (data.status === "invalid") {
            setResult({ type: "invalid" });
          } else {
            setResult({ type: "error" });
          }
        } catch {
          setResult({ type: "error" });
        }

        setScanning(false);
      })
      .catch(() => {
        setStatus("카메라 접근에 실패했습니다. 권한을 확인해주세요.");
        setScanning(false);
      });

    return () => {
      BrowserMultiFormatReader.releaseAllStreams();
      readerRef.current = null;
    };
  }, [scanning, lastToken, eventId, onCheckinMapChange]);

  return (
    <Wrap>
      <VideoBox style={{ display: scanning ? "block" : "none" }}>
        <Video ref={videoRef} />
        <ScanLine scanning={scanning} />
        <Corner />
      </VideoBox>

      {!scanning && (
        <Btn onClick={startScanner}>카메라로 QR 스캔</Btn>
      )}

      {scanning && (
        <StatusLabel>{status}</StatusLabel>
      )}

      {result && (
        <>
          <ResultBox type={result.type}>
            <Icon>
              {result.type === "success" ? "✅" :
               result.type === "already" ? "⚠️" : "❌"}
            </Icon>
            <div>
              {result.type === "success" && (
                <>
                  <strong>체크인 완료</strong>
                  {result.name && <> — {result.name}님</>}
                  {result.at && <div style={{ fontSize: "0.8rem", marginTop: "0.2rem", opacity: 0.8 }}>{result.at}</div>}
                </>
              )}
              {result.type === "already" && (
                <>
                  <strong>이미 체크인된 참가자</strong>
                  {result.at && <div style={{ fontSize: "0.8rem", marginTop: "0.2rem", opacity: 0.8 }}>체크인 시각: {result.at}</div>}
                </>
              )}
              {result.type === "invalid" && <strong>유효하지 않은 QR 코드</strong>}
              {result.type === "error" && <strong>처리 중 오류가 발생했습니다</strong>}
            </div>
          </ResultBox>
          <Btn onClick={startScanner}>다음 QR 스캔</Btn>
        </>
      )}
    </Wrap>
  );
}
