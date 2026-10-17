import { describe, expect, it } from "vitest";
import { buildResearchArchive, findResearchIssue } from "@/lib/research-issues";
import { demoIssues } from "@/lib/demo-data";

describe("research archive", () => {
  it("keeps only the latest issue published on the same date", () => {
    const original = demoIssues[0];
    const replacement = { ...original, id: "replacement-run", title: "Replacement issue", generatedAt: "2026-10-14T12:00:00+08:00" };
    const archive = buildResearchArchive([original, replacement]);

    expect(archive).toHaveLength(1);
    expect(archive[0]).toMatchObject({ slug: "2026-10-14", label: original.dateRange });
    expect(archive[0].issue.title).toBe("Replacement issue");
    expect(findResearchIssue([original, replacement], "2026-10-14")?.issue.id).toBe("replacement-run");
  });
});
