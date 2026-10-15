import Link from "next/link";
import { buildResearchArchive } from "@/lib/research-issues";
import type { ResearchIssue } from "@/lib/types";

const scoreLabels = {
  relevance: "相关性",
  novelty: "新颖性",
  mechanisticDepth: "机理深度",
  evidenceRigor: "证据严谨性",
  reproducibility: "复现与迁移"
} as const;

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
                <Link className={`issue-list-link ${entry.issue.id === selectedIssue.id ? "active" : ""}`} href={`/research/${entry.slug}`} key={entry.issue.id} aria-current={entry.issue.id === selectedIssue.id ? "page" : undefined}>
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

          <section className="weekly-synthesis">
            <div className="meta">THIS WEEK</div>
            <p>{selectedIssue.synthesis}</p>
            {selectedIssue.trackDistribution?.length ? <div className="track-distribution">{selectedIssue.trackDistribution.map((item) => <span key={item.label}><strong>{String(item.count).padStart(2, "0")}</strong>{item.label}</span>)}</div> : null}
          </section>

          {selectedIssue.warnings?.length ? <aside className="research-warning"><span className="meta">SOURCE NOTICE</span><p>{selectedIssue.warnings.join("；")}</p></aside> : null}

          <div className="research-paper-list">
            {selectedIssue.papers.map((paper, index) => (
              <article className="research-paper" id={paper.id} key={paper.id}>
                <header>
                  <div className="paper-badges">
                    <span className="paper-index">{String(index + 1).padStart(2, "0")}</span>
                    {paper.track ? <span className="paper-badge track">{paper.track}</span> : null}
                    {paper.publicationStatus ? <span className={`paper-badge ${paper.publicationStatus.includes("预印本") ? "preprint" : "journal"}`}>{paper.publicationStatus}</span> : null}
                  </div>
                  <h3>{paper.title}</h3>
                  <p className="paper-authors">{paper.authors}</p>
                  <dl className="paper-metadata">
                    {paper.institutions?.length ? <div><dt>发布机构</dt><dd>{paper.institutions.join(" · ")}</dd></div> : null}
                    <div><dt>期刊 / 平台</dt><dd>{paper.venue}</dd></div>
                    <div><dt>发布日期</dt><dd>{paper.publishedAt || "未提供"}</dd></div>
                    <div><dt>来源</dt><dd>{paper.sources?.join(", ") || "未提供"}</dd></div>
                  </dl>
                  <div className="tag-list">{paper.topics.filter((topic) => topic !== paper.track).map((topic) => <span className="tag" key={topic}>{topic}</span>)}</div>
                </header>
                {paper.score ? <section className="paper-score-panel">
                  <div className="paper-score-total"><span className="meta">RADAR SCORE</span><strong>{paper.score.total.toFixed(2)}</strong><small>/ 10</small></div>
                  <div className="paper-score-dimensions">{Object.entries(scoreLabels).map(([key, label]) => {
                    const value = paper.score?.dimensions[key as keyof typeof paper.score.dimensions];
                    return value === undefined ? null : <div key={key}><span>{label}</span><strong>{value.toFixed(1)}</strong></div>;
                  })}</div>
                  <p><span className="meta">入选机制</span>{paper.selectionReason}</p>
                </section> : null}
                <dl className="paper-review">
                  <div><dt>核心问题</dt><dd>{paper.coreProblem}</dd></div>
                  <div><dt>催化 / 化学策略</dt><dd>{paper.strategy}</dd></div>
                  <div><dt>关键创新</dt><dd>{paper.innovation}</dd></div>
                  <div><dt>证据评价</dt><dd>{paper.evidence}</dd></div>
                  {paper.researchRelevance ? <div className="paper-relevance"><dt>与 Zhaoyang 研究的关联</dt><dd>{paper.researchRelevance}</dd></div> : null}
                  <div><dt>不确定性</dt><dd>{paper.uncertainty}</dd></div>
                </dl>
                <section className="paper-abstract"><div className="meta">中文摘要 · AI TRANSLATION</div><p lang="zh-CN">{paper.abstractZh ?? paper.summary}</p></section>
                <footer><a className="text-link" href={paper.url} target="_blank" rel="noreferrer">Open original source ↗</a><span className="meta">DOI · {paper.doi}</span></footer>
              </article>
            ))}
          </div>
          <p className="mono muted research-disclaimer">SOURCE LINKS PRESERVED · NO BELOW-THRESHOLD PADDING · VERIFY PRIMARY SOURCES BEFORE RELYING ON A CLAIM</p>
        </article>
      </section>
    </>
  );
}
