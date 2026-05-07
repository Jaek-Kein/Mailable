import type { Metadata } from "next";

export const metadata: Metadata = { title: "체크인 오류" };

export default function CheckinErrorPage() {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#fef2f2",
        fontFamily: "var(--font-sans, 'DM Sans', sans-serif)",
        padding: "2rem",
        textAlign: "center",
        gap: "1rem",
      }}
    >
      <div style={{ fontSize: "4rem" }}>⚠️</div>
      <h1
        style={{
          fontSize: "clamp(1.5rem, 5vw, 2rem)",
          fontWeight: 600,
          color: "#991b1b",
          margin: 0,
        }}
      >
        처리 중 오류가 발생했습니다
      </h1>
      <p style={{ fontSize: "0.95rem", color: "#7f1d1d", margin: 0 }}>
        잠시 후 다시 시도해주세요.
      </p>
    </main>
  );
}
