import { describe, expect, it } from "vitest";
import { issueFromRadarMarkdown, issueFromRadarRun, paperFromRadarRecord, type RadarRecord } from "@/lib/server/local-radar";

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

  it("uses the delivered report as the immutable email snapshot", () => {
    const markdown = `# chem-research-radar 化学论文周报 · 2026-10-14

> **本期赛道分布**：DNA/RNA 与化学生物学 0 · 有机与不对称催化 1 · AI for Chemistry 0 · 机动/回填以入选机制标注。

## 1. [Email snapshot title](https://doi.org/10.1000/snapshot)

- **赛道**：有机与不对称催化
- **论文状态**：预印本（未同行评审）
- **作者**：A. Author, B. Author
- **发布机构**：National University of Singapore
- **期刊/平台**：ChemRxiv
- **DOI**：10.1000/snapshot
- **来源**：chemrxiv
- **评分**：总分 8.25/10（相关性 9.0 · 新颖性 8.0 · 机理深度 8.0 · 证据严谨性 7.0 · 复现与迁移价值 7.0）
- **入选机制**：track-quota:organic_catalysis
- **核心问题**：Core problem
- **催化/化学策略**：Chemical strategy
- **关键创新**：Key innovation
- **证据评价**：Evidence assessment
- **与 Zhaoyang 研究的关联**：Research relevance
- **不确定性**：Explicit uncertainty
- **中文摘要**：完整中文摘要

---
由 chem-research-radar 生成；评分用于建立阅读队列，不替代阅读原文。
`;
    const issue = issueFromRadarMarkdown({ run_id: "run-3", report_date: "2026-10-14", finished_at: "2026-10-14T10:00:00+08:00", status: "success", recommended: 1 }, markdown);

    expect(issue.trackDistribution).toEqual([
      { label: "DNA/RNA 与化学生物学", count: 0 },
      { label: "有机与不对称催化", count: 1 },
      { label: "AI for Chemistry", count: 0 }
    ]);
    expect(issue.papers[0]).toMatchObject({
      title: "Email snapshot title",
      track: "有机与不对称催化",
      score: { total: 8.25, dimensions: { relevance: 9, reproducibility: 7 } },
      abstractZh: "完整中文摘要"
    });
  });
});
