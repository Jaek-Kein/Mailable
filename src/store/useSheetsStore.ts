import { NextResponse } from "next/server";
import { create } from "zustand";

export type Row = Record<string, string>; // CSV 헤더 기반의 key-value

type SheetState = {
    rows: Row[];
    meta?: { spreadsheetId?: string; gid?: string; count?: number };
    loading: boolean;
    error?: string;
};

type SheetActions = {
    ingestFromSheetUrl: (
        url: string,
        eventId: string
    ) => Promise<NextResponse<{ ok: boolean; error: string }> | undefined>;
    clear: () => void;
};

export const useSheetStore = create<SheetState & SheetActions>((set) => ({
    rows: [],
    loading: false,
    ingestFromSheetUrl: async (sheetUrl: string, eventId: string) => {
        set({ loading: true, error: undefined });
        try {
            const res = await fetch("/api/sheets/ingest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ eventId, sheetUrl }),
            });
            const json = await res.json();
            if (!res.ok || !json.ok)
                throw new Error(json.error || "ingest failed");
            set({
                rows: json.data,
            });
        } catch (e: unknown) {
            if (e instanceof Error) {
                return NextResponse.json(
                    { ok: false, error: e.message },
                    { status: 500 }
                );
            }
            return NextResponse.json(
                { ok: false, error: String(e) },
                { status: 500 }
            );
        } finally {
            set({ loading: false });
        }
    },
    clear: () => set({ rows: [], meta: undefined, error: undefined }),
}));
