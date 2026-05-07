import type { Metadata } from "next";

export const metadata: Metadata = { title: "유효하지 않은 QR" };

export default function CheckinInvalidPage() {
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
      <div style={{ fontSize: "4rem" }}>❌</div>
      <h1
        style={{
          fontSize: "clamp(1.5rem, 5vw, 2rem)",
          fontWeight: 600,
          color: "#991b1b",
          margin: 0,
        }}
      >
        유효하지 않은 QR 코드
      </h1>
      <p style={{ fontSize: "0.95rem", color: "#7f1d1d", margin: 0 }}>
        QR 코드가 만료되었거나 올바르지 않습니다.
      </p>
    </main>
  );
}
