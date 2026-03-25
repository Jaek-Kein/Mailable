"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EventDetailError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div style={{
            maxWidth: "960px",
            margin: "4rem auto",
            padding: "0 1.25rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
            fontFamily: "var(--font-sans, DM Sans, sans-serif)",
            color: "#1a1a2e",
        }}>
            <h2 style={{ fontFamily: "var(--font-serif, DM Serif Display, serif)", fontSize: "1.4rem", margin: 0 }}>
                행사를 불러올 수 없습니다
            </h2>
            <p style={{ color: "#8888a8", margin: 0 }}>{error.message || "예기치 않은 오류입니다."}</p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
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
                <button
                    onClick={() => router.push("/dashboard")}
                    style={{
                        padding: "0.5rem 1.25rem",
                        background: "transparent",
                        color: "#1a1a2e",
                        border: "1px solid #e2dfd8",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                    }}
                >
                    대시보드로
                </button>
            </div>
        </div>
    );
}
