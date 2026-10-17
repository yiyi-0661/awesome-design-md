import { defaultSettings, demoIssues } from "@/lib/demo-data";
import type { ResearchIssue, UpdateSettings } from "@/lib/types";

type DemoState = { settings: UpdateSettings; issues: Map<string, ResearchIssue> };
const runtime = globalThis as typeof globalThis & { __liLabDemoState?: DemoState };
const state = runtime.__liLabDemoState ?? {
  settings: { ...defaultSettings },
  issues: new Map<string, ResearchIssue>(demoIssues.map((issue) => [issue.id, issue]))
};
runtime.__liLabDemoState = state;

export const demoStore = {
  getSettings: () => state.settings,
  listIssues: () => Array.from(state.issues.values()).filter((issue) => issue.papers.length > 0).sort((a, b) => b.date.localeCompare(a.date)),
  updateSettings: (next: UpdateSettings, expectedVersion: number) => {
    if (state.settings.version !== expectedVersion) throw new Error("VERSION_CONFLICT");
    state.settings = next;
    return state.settings;
  },
  upsertIssue: (issue: ResearchIssue) => {
    const existing = state.issues.get(issue.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(issue)) throw new Error("DIGEST_CONFLICT");
    const sameDate = Array.from(state.issues.values()).find((item) => item.date === issue.date && item.id !== issue.id);
    if (sameDate && issue.generatedAt <= sameDate.generatedAt) return { inserted: false, replaced: false, issue: sameDate };
    if (sameDate) state.issues.delete(sameDate.id);
    state.issues.set(issue.id, issue);
    return { inserted: !existing && !sameDate, replaced: Boolean(sameDate), issue };
  }
};
