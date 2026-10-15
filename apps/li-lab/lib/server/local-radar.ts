import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Paper, ResearchIssue } from "@/lib/types";

const TRACK_LABELS: Record<string, string> = {
  nucleic_acid_chemistry: "DNA/RNA 与化学生物学",
  organic_catalysis: "有机与不对称催化",
  ai_for_chemistry: "AI for Chemistry"
};

export type RadarRecord = {
  paper_id: string;
  title: string;
  authors?: string[];
  affiliations?: string[];
  published_at?: string;
  url?: string;
  doi?: string;
  venue?: string;
  evidence_maturity?: string;
  primary_track?: string;
  sources?: string[];
  categories?: string[];
  scores?: {
    final_score?: number;
    watchlist_adjustment?: number;
    selection_reason?: string;
    matched_topics?: string[];
    dimensions?: Record<string, number>;
  };
  analysis?: Record<string, unknown>;
  status?: { last_recommended_date?: string; last_recommended_rank?: number };
};

export type RadarRun = {
  run_id: string;
  report_date: string;
  finished_at: string;
  status: string;
  recommended: number;
  warnings?: string[];
  digest_hash?: string;
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function paperFromRadarRecord(record: RadarRecord): Paper {
  const analysis = record.analysis ?? {};
  const dimensions = record.scores?.dimensions ?? {};
  const analyzedInstitutions = Array.isArray(analysis.institutions) ? analysis.institutions.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
  const institutions = analyzedInstitutions.length ? analyzedInstitutions : (record.affiliations ?? []);
  const abstractZh = text(analysis.abstract_zh, "中文摘要暂不可用。");
  const track = TRACK_LABELS[record.primary_track ?? ""] ?? text(record.primary_track, "未分类");

  return {
    id: record.paper_id,
    title: record.title,
    authors: (record.authors ?? []).join(", ") || "未知作者",
    venue: text(record.venue, "未知期刊/平台"),
    publishedAt: text(record.published_at).slice(0, 10),
    topics: [track, ...(record.scores?.matched_topics ?? record.categories ?? [])].filter((item, index, items) => Boolean(item) && items.indexOf(item) === index),
    summary: abstractZh,
    coreProblem: text(analysis.core_problem),
    strategy: text(analysis.chemical_strategy),
    innovation: text(analysis.key_innovation),
    evidence: text(analysis.evidence_assessment),
    uncertainty: text(analysis.uncertainty),
    doi: text(record.doi, "未提供"),
    url: text(record.url, record.doi ? `https://doi.org/${record.doi}` : "https://example.invalid"),
    track,
    publicationStatus: record.evidence_maturity === "preprint" ? "预印本（未同行评审）" : "期刊论文（同行评审）",
    institutions: institutions.length ? institutions : ["来源元数据未提供"],
    sources: record.sources ?? [],
    selectionReason: text(record.scores?.selection_reason, "综合评分"),
    researchRelevance: text(analysis.zhaoyang_relevance),
    abstractZh,
    score: {
      total: Number(record.scores?.final_score ?? 0),
      watchlistAdjustment: Number(record.scores?.watchlist_adjustment ?? 0),
      dimensions: {
        relevance: dimensions.relevance,
        novelty: dimensions.novelty,
        mechanisticDepth: dimensions.mechanistic_depth,
        evidenceRigor: dimensions.evidence_rigor,
        reproducibility: dimensions.reproducibility
      }
    }
  };
}

function localRadarRoot() {
  if (process.env.RADAR_LOCAL_ROOT) return process.env.RADAR_LOCAL_ROOT;
  if (process.env.NODE_ENV === "production") return null;
  return path.resolve(process.cwd(), "../../../chem-research-radar");
}

function latestRecords(dataDir: string) {
  const records = new Map<string, RadarRecord>();
  const paperDir = path.join(dataDir, "papers");
  if (!existsSync(paperDir)) return records;
  for (const file of readdirSync(paperDir).filter((name) => name.endsWith(".jsonl")).sort()) {
    for (const line of readFileSync(path.join(paperDir, file), "utf8").split("\n")) {
      if (!line.trim()) continue;
      const record = JSON.parse(line) as RadarRecord;
      records.set(record.paper_id, record);
    }
  }
  return records;
}

function labelDate(date: string) {
  return new Intl.DateTimeFormat("en-SG", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)).toUpperCase();
}

export function issueFromRadarRun(run: RadarRun, records: Iterable<RadarRecord>, reportUrls: string[] = []): ResearchIssue {
  const candidates = Array.from(records);
  const byUrl = new Map(candidates.map((record) => [record.url, record]));
  const selected = reportUrls.length
    ? reportUrls.flatMap((url) => {
        const direct = byUrl.get(url);
        if (direct) return [direct];
        const doi = url.match(/doi\.org\/(.+)$/)?.[1];
        return doi ? candidates.filter((record) => record.doi === doi) : [];
      })
    : candidates
        .filter((record) => record.status?.last_recommended_date === run.report_date && Number(record.status.last_recommended_rank) <= run.recommended)
        .sort((a, b) => Number(a.status?.last_recommended_rank) - Number(b.status?.last_recommended_rank));
  const papers = selected.slice(0, run.recommended).map(paperFromRadarRecord);
  const trackDistribution = Object.values(TRACK_LABELS).map((label) => ({ label, count: papers.filter((paper) => paper.track === label).length }));
  const distribution = trackDistribution.map((item) => `${item.label} ${item.count}`).join(" · ");
  return {
    id: run.run_id,
    date: run.report_date,
    dateRange: labelDate(run.report_date),
    title: `Weekly Research Brief · ${run.report_date}`,
    synthesis: `本期共收录 ${papers.length} 篇论文。${distribution}。机动/回填论文以入选机制标注。`,
    generatedAt: run.finished_at,
    warnings: run.warnings ?? [],
    trackDistribution,
    papers
  };
}

export function loadLocalRadarIssues(): ResearchIssue[] {
  const root = localRadarRoot();
  if (!root || !existsSync(path.join(root, "data"))) return [];
  try {
    const runDir = path.join(root, "data", "runs");
    const latestRunByDate = new Map<string, RadarRun>();
    for (const file of readdirSync(runDir).filter((name) => name.endsWith(".json")).sort()) {
      const run = JSON.parse(readFileSync(path.join(runDir, file), "utf8")) as RadarRun;
      if (!run.report_date || !run.recommended || !["success", "partial"].includes(run.status)) continue;
      const previous = latestRunByDate.get(run.report_date);
      if (!previous || run.finished_at > previous.finished_at) latestRunByDate.set(run.report_date, run);
    }
    const records = latestRecords(path.join(root, "data"));
    return Array.from(latestRunByDate.values()).map((run) => {
      const reportPath = path.join(root, "reports", "weekly", `${run.report_date}.md`);
      const reportUrls = existsSync(reportPath)
        ? Array.from(readFileSync(reportPath, "utf8").matchAll(/^## \d+\. \[[^\]]+\]\(([^)]+)\)$/gm), (match) => match[1])
        : [];
      return issueFromRadarRun(run, records.values(), reportUrls);
    }).filter((issue) => issue.papers.length > 0);
  } catch (error) {
    console.warn("Unable to load local chem-research-radar reports", error);
    return [];
  }
}
