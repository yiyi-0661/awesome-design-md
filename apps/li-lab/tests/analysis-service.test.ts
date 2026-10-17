import { afterEach, describe, expect, it, vi } from "vitest";
import { extractDois, isTitleRelated, type PaperCandidate } from "@/lib/server/bibliography";
import { analyzeWithDeepSeek } from "@/lib/server/deepseek";
import { presentAnalysis } from "@/lib/server/analysis";
import { extractPaper } from "@/lib/server/pdf";

const candidates: PaperCandidate[] = [
  {
    id: "ref-1",
    role: "cited",
    title: "Foundational DNA catalysis",
    authors: ["A. Researcher"],
    year: 2020,
    doi: "10.1000/ref-1",
    url: "https://doi.org/10.1000/ref-1",
    openAlexId: null,
    verificationSource: "crossref"
  },
  {
    id: "rel-1",
    role: "related",
    title: "Alternative peptide catalysis",
    authors: ["B. Researcher"],
    year: 2024,
    doi: "10.1000/rel-1",
    url: "https://doi.org/10.1000/rel-1",
    openAlexId: "https://openalex.org/W1",
    verificationSource: "both"
  }
];

const output = {
  coreMethod: {
    researchQuestion: "DNA 如何控制水相反应的选择性？",
    innovation: "可编程 DNA 手性微环境",
    pipeline: ["构建 DNA 变体", "测量选择性"],
    evidence: ["对照序列改变选择性"],
    assumptions: ["金属负载相当"],
    limitations: ["底物范围有限"],
    anchors: [{ kind: "section" as const, locator: "Methods 2.1", note: "实验设计" }]
  },
  referenceOrigins: [{ candidateId: "ref-1", relation: "FOUNDATIONAL METHOD" as const, inheritedIdea: "DNA-metal catalysis", anchor: { kind: "text" as const, locator: "Introduction", note: "作为方法基础引用" } }],
  relatedPapers: [{ candidateId: "rel-1", relation: "ALTERNATIVE METHOD" as const, rationale: "使用肽支架解决相似问题" }],
  limitations: ["候选文献集合不是系统性检索"]
};

function textPdf(text: string) {
  const safeText = text.replace(/[()]/g, "");
  const stream = `BT /F1 12 Tf 72 720 Td ${Array.from({ length: 8 }, () => `(${safeText}) Tj 0 -18 Td`).join(" ")} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new TextEncoder().encode(body);
  return {
    name: "fixture.pdf",
    type: "application/pdf",
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer
  } as File;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("real analysis service boundaries", () => {
  it("extracts searchable text from an uploaded PDF", async () => {
    const sentence = "Programmable DNA catalysis in water demonstrates a repeatable asymmetric reaction method with evidence.";
    const extracted = await extractPaper(textPdf(sentence));
    expect(extracted.text).toContain("Programmable DNA catalysis");
    expect(extracted.totalPages).toBe(1);
  });

  it("extracts and normalizes unique DOI values", () => {
    expect(extractDois("See doi:10.1000/ABC.1 and https://doi.org/10.1000/abc.1). Also 10.5555/XYZ-2."))
      .toEqual(["10.1000/abc.1", "10.5555/xyz-2"]);
  });

  it("rejects title-search noise that only shares a generic word", () => {
    expect(isTitleRelated("Proximity: a recipe to break the outbreak", "Moisture Attribution and Sensitivity Analysis of a Winter Tornado Outbreak")).toBe(false);
    expect(isTitleRelated("Autocatalytic dissociation of water on a stepped platinum surface", "Water dissociation on platinum stepped surfaces")).toBe(true);
  });

  it("validates DeepSeek JSON and binds all literature selections to verified candidates", async () => {
    vi.stubEnv("LLM_API_KEY", "test-key");
    vi.stubEnv("LLM_MODEL", "deepseek-flash");
    const fakeFetch = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(output) } }] }), { status: 200, headers: { "content-type": "application/json" } }));
    const value = await analyzeWithDeepSeek("Paper text with Methods 2.1", "Test paper", candidates, fakeFetch);
    expect(value.coreMethod.innovation).toBe("可编程 DNA 手性微环境");
    expect(fakeFetch).toHaveBeenCalledOnce();
    const request = fakeFetch.mock.calls[0][1] as RequestInit;
    expect(String(request.body)).toContain("VERIFIED_CANDIDATES");
    expect(String(request.body)).toContain("PAPER_TEXT");
  });

  it("rejects a model-invented literature candidate", async () => {
    vi.stubEnv("LLM_API_KEY", "test-key");
    const invented = { ...output, relatedPapers: [{ ...output.relatedPapers[0], candidateId: "invented" }] };
    const fakeFetch = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(invented) } }] }), { status: 200 }));
    await expect(analyzeWithDeepSeek("Paper text", "Test paper", candidates, fakeFetch)).rejects.toThrow(/unverified candidates/);
  });

  it("removes verified candidates placed in the wrong literature section", async () => {
    vi.stubEnv("LLM_API_KEY", "test-key");
    const misclassified = {
      ...output,
      referenceOrigins: [{ ...output.referenceOrigins[0], candidateId: "rel-1" }]
    };
    const fakeFetch = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(misclassified) } }] }), { status: 200 }));
    const value = await analyzeWithDeepSeek("Paper text", "Test paper", candidates, fakeFetch);
    expect(value.referenceOrigins).toEqual([]);
    expect(value.limitations.at(-1)).toContain("角色不匹配");
  });

  it("presents the validated result in the three Analysis page sections", () => {
    const result = presentAnalysis("paper.pdf", "Test paper", output, candidates, { totalPages: 8, truncated: false });
    expect(result.coreMethod.evidence).toContain("SECTION · Methods 2.1 · 实验设计");
    expect(result.referenceOrigins[0].doi).toBe("10.1000/ref-1");
    expect(result.relatedPapers[0].verificationSource).toBe("both");
    expect(result.limitations).toEqual(["候选文献集合不是系统性检索"]);
  });
});
