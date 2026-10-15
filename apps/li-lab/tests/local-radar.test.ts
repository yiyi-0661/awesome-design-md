import { describe, expect, it } from "vitest";
import { issueFromRadarRun, paperFromRadarRecord, type RadarRecord } from "@/lib/server/local-radar";

const record: RadarRecord = {
  paper_id: "doi:10.1000/example",
  title: "A complete Radar paper",
  authors: ["A. Author", "B. Author"],
  affiliations: ["National University of Singapore"],
  published_at: "2026-10-14T00:00:00Z",
  url: "https://doi.org/10.1000/example",
  doi: "10.1000/example",
  venue: "ChemRxiv",
  evidence_maturity: "preprint",
  primary_track: "organic_catalysis",
  sources: ["chemrxiv"],
  scores: {
    final_score: 8.25,
    selection_reason: "track-quota:organic_catalysis",
    dimensions: { relevance: 9, novelty: 8, mechanistic_depth: 8, evidence_rigor: 7, reproducibility: 7 }
  },
  analysis: {
    core_problem: "Core problem",
    chemical_strategy: "Chemical strategy",
    key_innovation: "Key innovation",
    evidence_assessment: "Evidence assessment",
    zhaoyang_relevance: "Research relevance",
    uncertainty: "Explicit uncertainty",
    abstract_zh: "完整中文摘要"
  },
  status: { last_recommended_date: "2026-10-14", last_recommended_rank: 1 }
};

describe("local Radar adapter", () => {
  it("preserves every section shown in the email", () => {
    expect(paperFromRadarRecord(record)).toMatchObject({
      track: "有机与不对称催化",
      publicationStatus: "预印本（未同行评审）",
      institutions: ["National University of Singapore"],
      selectionReason: "track-quota:organic_catalysis",
      researchRelevance: "Research relevance",
      abstractZh: "完整中文摘要",
      score: { total: 8.25, dimensions: { relevance: 9, mechanisticDepth: 8 } }
    });
  });

  it("uses the report count to exclude stale same-day recommendations", () => {
    const stale = { ...record, paper_id: "stale", status: { last_recommended_date: "2026-10-14", last_recommended_rank: 11 } };
    const issue = issueFromRadarRun({ run_id: "run-1", report_date: "2026-10-14", finished_at: "2026-10-14T09:00:00+08:00", status: "success", recommended: 10 }, [record, stale]);
    expect(issue.papers).toHaveLength(1);
    expect(issue.trackDistribution).toContainEqual({ label: "有机与不对称催化", count: 1 });
  });

  it("uses the rendered email order when same-day runs leave stale ranks", () => {
    const stale = { ...record, paper_id: "stale", title: "Stale earlier run", url: "https://example.com/stale", status: { last_recommended_date: "2026-10-14", last_recommended_rank: 1 } };
    const issue = issueFromRadarRun({ run_id: "run-2", report_date: "2026-10-14", finished_at: "2026-10-14T10:00:00+08:00", status: "success", recommended: 1 }, [stale, record], [record.url!]);
    expect(issue.papers.map((paper) => paper.id)).toEqual([record.paper_id]);
  });
});
