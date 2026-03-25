import { create } from "zustand";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  createdAt: string;
  updatedAt: string;
}

interface TemplateStore {
  templates: EmailTemplate[];
  loading: boolean;
  error?: string;
  fetchTemplates: () => Promise<void>;
  createTemplate: (data: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt">) => Promise<EmailTemplate | null>;
  updateTemplate: (id: string, data: Partial<Pick<EmailTemplate, "name" | "subject" | "htmlContent" | "textContent">>) => Promise<void>;
  removeTemplate: (id: string) => Promise<void>;
}

export const useTemplateStore = create<TemplateStore>((set) => ({
  templates: [],
  loading: false,
  error: undefined,

  fetchTemplates: async () => {
    set({ loading: true, error: undefined });
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "불러오기 실패");
      set({ templates: data.templates, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  createTemplate: async (payload) => {
    set({ loading: true, error: undefined });
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "생성 실패");
      set((s) => ({ templates: [data.template, ...s.templates], loading: false }));
      return data.template as EmailTemplate;
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },

  updateTemplate: async (id, payload) => {
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "수정 실패");
      set((s) => ({
        templates: s.templates.map((t) => (t.id === id ? data.template : t)),
      }));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  removeTemplate: async (id) => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "삭제 실패");
      set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },
}));
