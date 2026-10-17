import { describe, expect, it } from "vitest";
import { analysisOutputSchema, assertCandidateBound } from "@/lib/analysis-contract";

const output = {
  coreMethod: {
    researchQuestion: "How does the scaffold influence selectivity?",
    innovation: "A structure-aware comparison",
    pipeline: ["Build variants", "Measure selectivity"],
    evidence: ["Matched controls"],
    assumptions: ["Comparable metal loading"],
    limitations: ["Narrow substrate scope"],
    anchors: [{ kind: "section", locator: "Methods 2.1", note: "Experimental design" }]
  },
  referenceOrigins: [{ candidateId: "ref-1", relation: "FOUNDATIONAL METHOD", inheritedIdea: "DNA-metal catalysis", anchor: { kind: "text", locator: "Introduction", note: "Cited as foundation" } }],
  relatedPapers: [{ candidateId: "rel-1", relation: "ALTERNATIVE METHOD", rationale: "Uses a peptide scaffold" }],
  limitations: ["Not exhaustive"]
};

describe("Analysis evidence boundary", () => {
  it("accepts schema-valid output bound to verified candidates", () => {
    const parsed = analysisOutputSchema.parse(output);
    expect(assertCandidateBound(parsed, [{ id: "ref-1" }, { id: "rel-1" }])).toBe(parsed);
  });

  it("rejects a model-invented candidate id", () => {
    const parsed = analysisOutputSchema.parse({ ...output, relatedPapers: [{ ...output.relatedPapers[0], candidateId: "invented" }] });
    expect(() => assertCandidateBound(parsed, [{ id: "ref-1" }, { id: "rel-1" }])).toThrow(/unverified candidates/);
  });
});
