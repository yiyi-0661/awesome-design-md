import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResearchArchive } from "@/components/research-archive";
import type { ResearchIssue } from "@/lib/types";

const issue: ResearchIssue = {
  id: "run-2026-10-14",
  date: "2026-10-14",
  dateRange: "14 OCT 2026",
  title: "Weekly Research Brief · 2026-10-14",
  synthesis: "This website-only synthesis must not appear in the email edition.",
  generatedAt: "2026-10-14T09:00:00+08:00",
  warnings: ["部分来源暂不可用"],
  trackDistribution: [{ label: "有机与不对称催化", count: 1 }],
  papers: [{
    id: "paper-1",
    title: "A complete Radar paper",
    authors: "A. Author, B. Author",
    venue: "ChemRxiv",
    publishedAt: "2026-10-13",
    topics: ["有机与不对称催化"],
    summary: "中文摘要",
    coreProblem: "核心问题正文",
    strategy: "化学策略正文",
    innovation: "关键创新正文",
    evidence: "证据评价正文",
    uncertainty: "不确定性正文",
    doi: "10.1000/example",
    url: "https://doi.org/10.1000/example",
    track: "有机与不对称催化",
    publicationStatus: "预印本（未同行评审）",
    institutions: ["National University of Singapore"],
    sources: ["chemrxiv"],
    selectionReason: "track-quota:organic_catalysis",
    researchRelevance: "研究关联正文",
    abstractZh: "完整中文摘要",
    score: {
      total: 8.25,
      dimensions: { relevance: 9, novelty: 8, mechanisticDepth: 8, evidenceRigor: 7, reproducibility: 7 }
    }
  }]
};

describe("Research email edition", () => {
  it("keeps the email content, labels, and field order", () => {
    const { container } = render(<ResearchArchive issues={[issue]} selectedIssue={issue} />);
    const content = container.querySelector(".research-issue-content")?.textContent ?? "";

    expect(content).toContain("⚠️ 部分来源暂不可用");
    expect(content).toContain("本期赛道分布：有机与不对称催化 1");
    expect(content).toContain("总分 8.25/10（相关性 9.0 · 新颖性 8.0 · 机理深度 8.0 · 证据严谨性 7.0 · 复现与迁移价值 7.0）");
    expect(content).toContain("评分用于建立阅读队列，不替代阅读原文。");
    expect(content).not.toContain(issue.synthesis);
    expect(content).not.toContain("发布日期");

    const labels = ["核心问题", "催化/化学策略", "关键创新", "证据评价", "与 Zhaoyang 研究的关联", "不确定性", "中文摘要"];
    const positions = labels.map((label) => content.indexOf(label));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
