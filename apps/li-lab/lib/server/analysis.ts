import type { AnalysisResult } from "@/lib/types";
import type { AnalysisOutput } from "@/lib/analysis-contract";
import { findVerifiedCandidates, type PaperCandidate } from "./bibliography";
import { analyzeWithDeepSeek } from "./deepseek";
import { extractPaper } from "./pdf";

type Dependencies = {
  findCandidates?: typeof findVerifiedCandidates;
  analyze?: typeof analyzeWithDeepSeek;
};

function candidateMap(candidates: PaperCandidate[]) {
  return new Map(candidates.map((candidate) => [candidate.id, candidate]));
}

export function presentAnalysis(fileName: string, title: string, output: AnalysisOutput, candidates: PaperCandidate[], extraction: { totalPages: number; truncated: boolean }): AnalysisResult {
  const byId = candidateMap(candidates);
  const evidence = [
    ...output.coreMethod.anchors.map((anchor) => `${anchor.kind.toUpperCase()} · ${anchor.locator} · ${anchor.note}`),
    ...output.coreMethod.evidence,
    ...output.coreMethod.limitations.map((item) => `LIMITATION · ${item}`),
    `EXTRACTION · ${extraction.totalPages} pages${extraction.truncated ? " · context truncated" : ""}`
  ];
  return {
    id: crypto.randomUUID(),
    fileName,
    title,
    status: "complete",
    createdAt: new Date().toISOString(),
    coreMethod: {
      heading: output.coreMethod.innovation,
      body: `${output.coreMethod.researchQuestion}\n\n方法流程：${output.coreMethod.pipeline.join(" → ")}\n\n关键假设：${output.coreMethod.assumptions.join("；") || "未识别到明确假设。"}`,
      evidence
    },
    referenceOrigins: output.referenceOrigins.flatMap((item) => {
      const candidate = byId.get(item.candidateId);
      if (!candidate) return [];
      return [{ title: candidate.title, relation: item.relation, doi: candidate.doi ?? "", url: candidate.url, note: `${item.inheritedIdea} · ${item.anchor.locator}: ${item.anchor.note}`, verificationSource: candidate.verificationSource }];
    }),
    relatedPapers: output.relatedPapers.flatMap((item) => {
      const candidate = byId.get(item.candidateId);
      if (!candidate) return [];
      return [{ title: candidate.title, relation: item.relation, doi: candidate.doi ?? "", url: candidate.url, note: item.rationale, verificationSource: candidate.verificationSource }];
    }),
    limitations: output.limitations
  };
}

export async function analyzePaper(file: File, dependencies: Dependencies = {}) {
  const extraction = await extractPaper(file);
  const candidates = await (dependencies.findCandidates ?? findVerifiedCandidates)(extraction.text, extraction.title);
  const output = await (dependencies.analyze ?? analyzeWithDeepSeek)(extraction.text, extraction.title, candidates);
  return presentAnalysis(file.name, extraction.title, output, candidates, extraction);
}
