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
    ) => Promise<{ ok: false; error: string } | undefined>;
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
            const message = e instanceof Error ? e.message : String(e);
            set({ error: message });
            return { ok: false as const, error: message };
        } finally {
            set({ loading: false });
        }
    },
    clear: () => set({ rows: [], meta: undefined, error: undefined }),
}));
