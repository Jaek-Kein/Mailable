import type { Metadata } from "next";

export const metadata: Metadata = { title: "이미 체크인됨" };

interface Props {
  searchParams: Promise<{ at?: string }>;
}

export default async function CheckinAlreadyPage({ searchParams }: Props) {
  const { at } = await searchParams;
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#fffbeb",
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
          color: "#92400e",
          margin: 0,
        }}
      >
        이미 체크인된 참가자입니다
      </h1>
      {at && (
        <p style={{ fontSize: "0.95rem", color: "#78350f", margin: 0 }}>
          체크인 시각: {decodeURIComponent(at)}
        </p>
      )}
      <p style={{ fontSize: "0.85rem", color: "#b45309", margin: 0 }}>
        중복 스캔은 반영되지 않습니다.
      </p>
    </main>
  );
}
