import Link from "next/link";
import { buildResearchArchive } from "@/lib/research-issues";
import type { ResearchIssue } from "@/lib/types";

const scoreLabels = {
  relevance: "相关性",
  novelty: "新颖性",
  mechanisticDepth: "机理深度",
  evidenceRigor: "证据严谨性",
  reproducibility: "复现与迁移价值"
} as const;

function scoreLine(paper: ResearchIssue["papers"][number]) {
  if (!paper.score) return "";
  const dimensions = Object.entries(scoreLabels).flatMap(([key, label]) => {
    const value = paper.score?.dimensions[key as keyof typeof paper.score.dimensions];
    return value === undefined ? [] : [`${label} ${value.toFixed(1)}`];
  });
  const watch = paper.score.watchlistAdjustment ?? 0;
  const suffix = watch ? `；关注名单 +${watch.toFixed(2)}` : "";
  return `总分 ${paper.score.total.toFixed(2)}/10（${dimensions.join(" · ")}${suffix}）`;
}

function issueTitle(date: string) {
  return `Weekly Research Brief · ${date}`;
}

export function ResearchArchive({ issues, selectedIssue }: { issues: ResearchIssue[]; selectedIssue: ResearchIssue }) {
  const entries = buildResearchArchive(issues);
  const selectedEntry = entries.find((entry) => entry.issue.id === selectedIssue.id) ?? entries[0];
  const years = Array.from(new Set(entries.map((entry) => entry.issue.date.slice(0, 4))));
  const chronological = entries.slice().reverse();
  const issueNumber = chronological.findIndex((entry) => entry.issue.id === selectedIssue.id) + 1;

  return (
    <>
      <header className="page-header research-page-header">
        <div className="stack">
          <div className="eyebrow">WEEKLY LITERATURE BRIEF</div>
          <h1>Research</h1>
          <p>A living archive of papers selected, reviewed, and delivered by Chem Research Radar.</p>
        </div>
        <div className="status">{String(entries.length).padStart(2, "0")} PUBLISHED ISSUES<br />AI-GENERATED SUMMARIES</div>
      </header>

      <section className="research-reader">
        <aside className="issue-rail" aria-label="Weekly research issues">
          <div className="issue-rail-head">
            <div><div className="meta">WEEKLY ISSUES</div><strong>{String(entries.length).padStart(2, "0")} ISSUES</strong></div>
            <span className="meta">NEWEST FIRST</span>
          </div>
          {years.map((year) => (
            <div className="issue-year" key={year}>
              <div className="issue-year-label">{year}</div>
              {entries.filter((entry) => entry.issue.date.startsWith(year)).map((entry) => (
                <Link prefetch={false} className={`issue-list-link ${entry.issue.id === selectedIssue.id ? "active" : ""}`} href={`/research/${entry.slug}`} key={entry.issue.id} aria-current={entry.issue.id === selectedIssue.id ? "page" : undefined}>
                  <strong><span aria-hidden="true" />{entry.label}</strong>
                  <span>{issueTitle(entry.issue.date)}</span>
                  <small>{String(entry.issue.papers.length).padStart(2, "0")} PAPERS</small>
                </Link>
              ))}
            </div>
          ))}
        </aside>

        <article className="research-issue-content">
          <header className="research-issue-header">
            <div className="meta">WEEKLY RESEARCH BRIEF · ISSUE {String(issueNumber).padStart(3, "0")}</div>
            <h2>{issueTitle(selectedIssue.date)}</h2>
            <div className="research-issue-meta">
              <span>{selectedEntry?.label ?? selectedIssue.dateRange} · {selectedIssue.papers.length} PAPERS</span>
              <span>GENERATED {new Date(selectedIssue.generatedAt).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })}</span>
            </div>
          </header>

          {selectedIssue.warnings?.length ? <aside className="research-warning"><p>⚠️ {selectedIssue.warnings.join("；")}</p></aside> : null}
          {selectedIssue.trackDistribution?.length ? <div className="research-email-summary"><strong>本期赛道分布：</strong>{selectedIssue.trackDistribution.map((item) => `${item.label} ${item.count}`).join(" · ")}</div> : null}

          <div className="research-paper-list">
            {selectedIssue.papers.map((paper, index) => (
              <article className="research-paper" id={paper.id} key={paper.id}>
                <header>
                  <div className="paper-badges">
                    {paper.track ? <span className="paper-badge track">{paper.track}</span> : null}
                    {paper.publicationStatus ? <span className={`paper-badge ${paper.publicationStatus.includes("预印本") ? "preprint" : "journal"}`}>{paper.publicationStatus}</span> : null}
                  </div>
                  <h3>{index + 1}. <a href={paper.url} target="_blank" rel="noreferrer">{paper.title}</a></h3>
                  <p className="paper-authors">{paper.authors} · {paper.venue}</p>
                  <div className="paper-institutions"><strong>发布机构：</strong><span>{(paper.institutions?.length ? paper.institutions : ["来源元数据未提供"]).map((institution) => <span className="institution-tag" key={institution}>{institution}</span>)}</span></div>
                  <p className="paper-source"><strong>DOI：</strong>{paper.doi === "未提供" ? "未提供" : <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer">{paper.doi}</a>}　<strong>来源：</strong>{paper.sources?.join(", ") || "未提供"}</p>
                </header>
                {paper.score ? <p className="paper-score">{scoreLine(paper)}</p> : null}
                <p className="paper-selection">入选机制：{paper.selectionReason || "综合评分"}</p>
                <dl className="paper-review">
                  <div><dt>核心问题</dt><dd>{paper.coreProblem}</dd></div>
                  <div><dt>催化/化学策略</dt><dd>{paper.strategy}</dd></div>
                  <div><dt>关键创新</dt><dd>{paper.innovation}</dd></div>
                  <div><dt>证据评价</dt><dd>{paper.evidence}</dd></div>
                  {paper.researchRelevance ? <div className="paper-relevance"><dt>与 Zhaoyang 研究的关联</dt><dd>{paper.researchRelevance}</dd></div> : null}
                  <div><dt>不确定性</dt><dd>{paper.uncertainty}</dd></div>
                </dl>
                <section className="paper-abstract"><strong>中文摘要</strong><p lang="zh-CN">{paper.abstractZh ?? paper.summary}</p></section>
              </article>
            ))}
          </div>
          <p className="research-disclaimer">评分用于建立阅读队列，不替代阅读原文。</p>
        </article>
      </section>
    </>
  );
}
