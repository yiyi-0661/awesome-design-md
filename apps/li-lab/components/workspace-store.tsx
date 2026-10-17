"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultSettings, demoMethods } from "@/lib/demo-data";
import { mergeBundledMethods } from "@/lib/method-library";
import type { MethodArticle, UpdateSettings } from "@/lib/types";

type Workspace = {
  methods: MethodArticle[];
  hydrated: boolean;
  saveMethod: (article: MethodArticle) => void;
  archiveMethod: (id: string) => void;
  restoreMethod: (id: string) => void;
  deleteMethod: (id: string) => void;
  settings: UpdateSettings;
  saveSettings: (settings: UpdateSettings) => Promise<UpdateSettings>;
  cloudMode: boolean;
};

const WorkspaceContext = createContext<Workspace | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [methods, setMethods] = useState<MethodArticle[]>(demoMethods);
  const [settings, setSettings] = useState<UpdateSettings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);
  const cloudMode = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  useEffect(() => {
    const savedMethods = window.localStorage.getItem("li-lab-methods");
    const savedSettings = window.localStorage.getItem("li-lab-settings");
    queueMicrotask(() => {
      try {
        if (savedMethods) {
          const mergedMethods = mergeBundledMethods(JSON.parse(savedMethods) as MethodArticle[]);
          setMethods(mergedMethods);
          window.localStorage.setItem("li-lab-methods", JSON.stringify(mergedMethods));
        }
        if (savedSettings) setSettings(JSON.parse(savedSettings) as UpdateSettings);
      } catch {
        window.localStorage.removeItem("li-lab-methods");
        window.localStorage.removeItem("li-lab-settings");
      } finally {
        setHydrated(true);
      }
    });
    if (cloudMode) {
      void fetch("/api/admin/preferences", { cache: "no-store" })
        .then(async (response) => response.ok ? response.json() as Promise<UpdateSettings> : Promise.reject(new Error("Cloud preferences unavailable")))
        .then((next) => setSettings(next))
        .catch(() => undefined);
    }
  }, [cloudMode]);

  const updateMethods = useCallback((update: (current: MethodArticle[]) => MethodArticle[]) => {
    setMethods((current) => {
      const next = update(current);
      window.localStorage.setItem("li-lab-methods", JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<Workspace>(
    () => ({
      methods,
      hydrated,
      saveMethod: (article) => {
        updateMethods((current) => [article, ...current.filter((item) => item.id !== article.id)]);
      },
      archiveMethod: (id) => updateMethods((current) => current.map((item) => item.id === id ? { ...item, status: "archived", updatedAt: new Date().toISOString() } : item)),
      restoreMethod: (id) => updateMethods((current) => current.map((item) => item.id === id ? { ...item, status: "draft", updatedAt: new Date().toISOString() } : item)),
      deleteMethod: (id) => updateMethods((current) => current.filter((item) => item.id !== id)),
      settings,
      saveSettings: async (next) => {
        let saved: UpdateSettings = { ...next, version: next.version + 1, updatedAt: new Date().toISOString() };
        if (cloudMode) {
          const response = await fetch("/api/admin/preferences", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
          const payload = await response.json() as UpdateSettings | { error?: string };
          if (!response.ok) throw new Error("error" in payload ? payload.error : "Settings could not be saved");
          saved = payload as UpdateSettings;
        }
        setSettings(saved);
        window.localStorage.setItem("li-lab-settings", JSON.stringify(saved));
        return saved;
      },
      cloudMode
    }),
    [cloudMode, hydrated, methods, settings, updateMethods]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return context;
}

export function ModePill() {
  const { cloudMode } = useWorkspace();
  return <span className="mode-pill">{cloudMode ? "CLOUD WORKSPACE" : "LOCAL DEMO MODE"}</span>;
}
