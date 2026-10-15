import { describe, expect, it } from "vitest";
import { getPublishedIssue, ingestIssue } from "@/lib/server/repository";
import type { ResearchIssue } from "@/lib/types";
import { demoIssues } from "@/lib/demo-data";

const fixture: ResearchIssue = {
  id: "test-run-2026-10-15",
  date: "2026-10-15",
  dateRange: "OCT 15, 2026",
  title: "Repository contract test",
  synthesis: "A deterministic fixture.",
  generatedAt: "2026-10-15T01:00:00Z",
  papers: [demoIssues[0].papers[0]]
};

describe("research repository demo adapter", () => {
  it("is idempotent for an identical Radar delivery", async () => {
    expect((await ingestIssue(fixture, JSON.stringify(fixture))).inserted).toBe(true);
    expect((await ingestIssue(fixture, JSON.stringify(fixture))).inserted).toBe(false);
    expect(await getPublishedIssue(fixture.date)).toEqual(fixture);
  });

  it("rejects changed content under the same idempotency key", async () => {
    await expect(ingestIssue({ ...fixture, title: "Changed" }, JSON.stringify(fixture))).rejects.toThrow("DIGEST_CONFLICT");
  });

  it("replaces an issue when a newer run is published on the same date", async () => {
    const replacement = { ...fixture, id: "test-run-2026-10-15-later", title: "Latest same-day brief", generatedAt: "2026-10-15T03:00:00Z" };
    const result = await ingestIssue(replacement, JSON.stringify(replacement));

    expect(result).toMatchObject({ inserted: false, replaced: true });
    expect(await getPublishedIssue(fixture.date)).toEqual(replacement);

    const stale = { ...fixture, id: "test-run-2026-10-15-stale", title: "Late stale delivery", generatedAt: "2026-10-15T02:00:00Z" };
    expect(await ingestIssue(stale, JSON.stringify(stale))).toMatchObject({ inserted: false, replaced: false, issue: replacement });
    expect(await getPublishedIssue(fixture.date)).toEqual(replacement);
  });
});
