export type Paper = {
  id: string;
  title: string;
  authors: string;
  venue: string;
  publishedAt: string;
  topics: string[];
  summary: string;
  coreProblem: string;
  strategy: string;
  innovation: string;
  evidence: string;
  uncertainty: string;
  doi: string;
  url: string;
  track?: string;
  publicationStatus?: string;
  institutions?: string[];
  sources?: string[];
  selectionReason?: string;
  researchRelevance?: string;
  abstractZh?: string;
  score?: {
    total: number;
    watchlistAdjustment?: number;
    dimensions: {
      relevance?: number;
      novelty?: number;
      mechanisticDepth?: number;
      evidenceRigor?: number;
      reproducibility?: number;
    };
  };
};

export type ResearchIssue = {
  id: string;
  date: string;
  dateRange: string;
  title: string;
  synthesis: string;
  generatedAt: string;
  warnings?: string[];
  trackDistribution?: Array<{ label: string; count: number }>;
  papers: Paper[];
};

export type MethodArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  status: "draft" | "published" | "archived";
  author: string;
  updatedAt: string;
  version: number;
  sourceAnalysisId?: string;
};

export type UpdateSettings = {
  topics: string[];
  cadence: string;
  paperCount: 5 | 10 | 15 | 20;
  version: number;
  updatedAt: string;
};

export type AnalysisStatus =
  | "idle"
  | "queued"
  | "extracting"
  | "tracing"
  | "analyzing"
  | "reviewing"
  | "complete"
  | "failed";

export type AnalysisResult = {
  id: string;
  fileName: string;
  title: string;
  status: AnalysisStatus;
  createdAt: string;
  coreMethod: { heading: string; body: string; evidence: string[] };
  referenceOrigins: Array<{ title: string; relation: string; doi: string; url?: string; note: string; verificationSource?: string }>;
  relatedPapers: Array<{ title: string; relation: string; doi: string; url?: string; note: string; verificationSource?: string }>;
  limitations?: string[];
};
