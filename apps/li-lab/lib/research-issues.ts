import type { ResearchIssue } from "./types";

export type ResearchArchiveEntry = {
  issue: ResearchIssue;
  slug: string;
  label: string;
};

export function buildResearchArchive(issues: ResearchIssue[]): ResearchArchiveEntry[] {
  const latestByDate = new Map<string, ResearchIssue>();
  for (const issue of issues) {
    const current = latestByDate.get(issue.date);
    if (!current || issue.generatedAt > current.generatedAt || (issue.generatedAt === current.generatedAt && issue.id > current.id)) {
      latestByDate.set(issue.date, issue);
    }
  }

  const entries = Array.from(latestByDate.values()).map((issue) => ({
    issue,
    slug: issue.date,
    label: issue.dateRange
  }));

  return entries.sort((a, b) => b.issue.generatedAt.localeCompare(a.issue.generatedAt) || b.issue.id.localeCompare(a.issue.id));
}

export function findResearchIssue(issues: ResearchIssue[], identifier: string) {
  const archive = buildResearchArchive(issues);
  return archive.find((entry) => entry.slug === identifier || entry.issue.id === identifier) ?? null;
}
