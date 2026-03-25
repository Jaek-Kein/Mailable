import { create } from "zustand";

export interface Campaign {
  id: string;
  name: string;
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "COMPLETED" | "FAILED";
  scheduledAt: string | null;
  createdAt: string;
  template: { id: string; name: string; subject: string };
  event: { id: string; title: string };
  _count: { deliveries: number };
}

interface SendResult {
  sentCount: number;
  failCount: number;
  total: number;
}

interface CampaignStore {
  campaigns: Campaign[];
  loading: boolean;
  error?: string;
  fetchCampaigns: () => Promise<void>;
  createCampaign: (data: { name: string; templateId: string; eventId: string; scheduledAt?: string }) => Promise<Campaign | null>;
  removeCampaign: (id: string) => Promise<void>;
  sendCampaign: (id: string) => Promise<SendResult | null>;
}

export const useCampaignStore = create<CampaignStore>((set, get) => ({
  campaigns: [],
  loading: false,
  error: undefined,

  fetchCampaigns: async () => {
    set({ loading: true, error: undefined });
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "불러오기 실패");
      set({ campaigns: data.campaigns, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  createCampaign: async (payload) => {
    set({ loading: true, error: undefined });
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "생성 실패");
      set((s) => ({ campaigns: [data.campaign, ...s.campaigns], loading: false }));
      return data.campaign as Campaign;
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },

  removeCampaign: async (id) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "삭제 실패");
      set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== id) }));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  sendCampaign: async (id) => {
    // 로컬 상태를 SENDING으로 낙관적 업데이트
    set((s) => ({
      campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, status: "SENDING" } : c)),
    }));
    try {
      const res = await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "발송 실패");
      // 최신 목록 다시 fetch
      await get().fetchCampaigns();
      return { sentCount: data.sentCount, failCount: data.failCount, total: data.total };
    } catch (e) {
      set((s) => ({
        campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, status: "FAILED" } : c)),
        error: e instanceof Error ? e.message : String(e),
      }));
      return null;
    }
  },
}));
