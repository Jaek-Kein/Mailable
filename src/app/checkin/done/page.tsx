import type { Metadata } from "next";

export const metadata: Metadata = { title: "체크인 완료" };

interface Props {
  searchParams: Promise<{ name?: string; at?: string }>;
}

export default async function CheckinDonePage({ searchParams }: Props) {
  const { name, at } = await searchParams;
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0fdf4",
        fontFamily: "var(--font-sans, 'DM Sans', sans-serif)",
        padding: "2rem",
        textAlign: "center",
        gap: "1rem",
      }}
    >
      <div style={{ fontSize: "4rem" }}>✅</div>
      <h1
        style={{
          fontSize: "clamp(1.5rem, 5vw, 2rem)",
          fontWeight: 600,
          color: "#15803d",
          margin: 0,
        }}
      >
        체크인 완료
      </h1>
      {name && (
        <p style={{ fontSize: "1.25rem", color: "#166534", margin: 0 }}>
          <strong>{name}</strong>님, 환영합니다!
        </p>
      )}
      {at && (
        <p style={{ fontSize: "0.9rem", color: "#4ade80", margin: 0 }}>{at}</p>
      )}
    </main>
  );
}
