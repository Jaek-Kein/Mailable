"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            fontFamily: "var(--font-sans, DM Sans, sans-serif)",
            color: "#1a1a2e",
        }}>
            <h2 style={{ fontFamily: "var(--font-serif, DM Serif Display, serif)", fontSize: "1.4rem", margin: 0 }}>
                오류가 발생했습니다
            </h2>
            <p style={{ color: "#8888a8", margin: 0 }}>{error.message || "예기치 않은 오류입니다."}</p>
            <button
                onClick={reset}
                style={{
                    padding: "0.5rem 1.25rem",
                    background: "#1a1a2e",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                }}
            >
                다시 시도
            </button>
        </div>
    );
}
