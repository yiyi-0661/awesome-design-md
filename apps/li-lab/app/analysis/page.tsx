"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ModePill, useWorkspace } from "@/components/workspace-store";
import type { AnalysisResult, AnalysisStatus, MethodArticle } from "@/lib/types";
import { isTextPdf } from "@/lib/validation";

const stages: Array<{ status: AnalysisStatus; label: string }> = [
  { status: "extracting", label: "Reading paper" },
  { status: "tracing", label: "Tracing references" },
  { status: "analyzing", label: "Analyzing core method" },
  { status: "reviewing", label: "Reviewing evidence" }
];

export default function AnalysisPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { saveMethod } = useWorkspace();
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [message, setMessage] = useState("One paper at a time · text-readable PDF · max 30 MB");
  const [dragging, setDragging] = useState(false);
  const [draftId, setDraftId] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    void fetch("/api/analysis/jobs", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ configured: boolean }> : Promise.reject(new Error("Status unavailable")))
      .then((payload) => setConfigured(payload.configured))
      .catch(() => setConfigured(false));
  }, []);

  async function analyze(file: File) {
    if (!isTextPdf(file)) { setStatus("failed"); setMessage("Choose a valid PDF smaller than 30 MB."); return; }
    if (configured === false) { setStatus("failed"); setMessage("DeepSeek is not configured. Add LLM_API_KEY to .env.local, then restart the server."); return; }
    setFileName(file.name); setResult(null); setStatus("queued"); setMessage("Uploading securely · the PDF remains in request memory only");
    let stageIndex = 0;
    setStatus(stages[stageIndex].status);
    const progress = window.setInterval(() => {
      stageIndex = Math.min(stageIndex + 1, stages.length - 1);
      setStatus(stages[stageIndex].status);
    }, 2800);
    try {
      const form = new FormData();
      form.set("paper", file);
      form.set("externalProcessingConsent", "true");
      const response = await fetch("/api/analysis/jobs", { method: "POST", body: form });
      const payload = await response.json() as { result?: AnalysisResult; error?: string };
      if (!response.ok || !payload.result) throw new Error(payload.error ?? "Analysis failed");
      setResult(payload.result);
      setStatus("complete");
      setMessage("Analysis complete · the PDF was not retained by the server");
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "The paper could not be analyzed.");
    } finally {
      window.clearInterval(progress);
    }
  }

  function choose(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (file) void analyze(file); }
  function drop(event: DragEvent<HTMLLabelElement>) { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files?.[0]; if (file) void analyze(file); }

  function createDraft() {
    if (!result) return;
    const slug = `analysis-${result.id}`;
    const content = `# ${result.title}\n\n> Generated from a private Analysis result. Review every claim before publishing.\n\n## Core Method\n\n${result.coreMethod.body}\n\n${result.coreMethod.evidence.map((item) => `- ${item}`).join("\n")}\n\n## Reference Origins\n\n${result.referenceOrigins.map((item) => `### ${item.title}\n\n**${item.relation}** · DOI: ${item.doi}\n\n${item.note}`).join("\n\n")}\n\n## Related Papers\n\n${result.relatedPapers.map((item) => `### ${item.title}\n\n**${item.relation}** · DOI: ${item.doi}\n\n${item.note}`).join("\n\n")}`;
    const draft: MethodArticle = { id: `method-${Date.now()}`, slug, title: result.title, excerpt: "An evidence-bounded reading note generated from the Analysis workspace.", content, tags: ["ANALYSIS", "PAPER REVIEW"], status: "draft", author: "Li Lab member", updatedAt: new Date().toISOString(), version: 1, sourceAnalysisId: result.id };
    saveMethod(draft); setDraftId(draft.id);
  }

  const currentIndex = stages.findIndex((item) => item.status === status);
  return (
    <main className="page narrow analysis-page">
      <PageHeader eyebrow="SINGLE-PAPER REVIEW" title="Analysis" intro="Read one paper closely, trace where its method comes from, and find the work that belongs beside it." status={`PRIVATE WORKSPACE\n50 SHARED RUNS / MONTH`} />
      <div className="analysis-layout">
        <aside className="analysis-sidebar">
          <div className="stack analysis-mode-row"><ModePill /><span className={`mode-pill ${configured ? "ready" : ""}`}>{configured === null ? "CHECKING ANALYSIS API" : configured ? "DEEPSEEK READY" : "SETUP REQUIRED"}</span></div>
          <label className={`dropzone ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={choose} />
            <span><span className="meta">UPLOAD PAPER · PDF</span><h2>{fileName || "Drop a paper here to begin"}</h2></span>
            <span className="stack"><span>{message}</span><span className="text-link">Browse files →</span></span>
          </label>
          <div className="progress-list">
            {stages.map((stage, index) => <div className={`progress-step ${status === "complete" || index <= currentIndex ? "active" : ""}`} key={stage.status}><span>{String(index + 1).padStart(2, "0")} · {stage.label}</span><span>{status === "complete" || index < currentIndex ? "✓" : index === currentIndex ? "●" : "○"}</span></div>)}
          </div>
          {status === "failed" ? <button className="button ghost" onClick={() => inputRef.current?.click()}>Try another PDF →</button> : null}
          {result ? <button className="button primary" onClick={createDraft}>Create Methods draft →</button> : null}
          {draftId ? <Link className="text-link" href={`/methods/drafts?draft=${draftId}`}>Open generated draft →</Link> : null}
        </aside>
        <section className="analysis-output" aria-live="polite">
          {!result ? <div className="empty-state"><div><div className="eyebrow">CORE METHOD · REFERENCE ORIGINS · RELATED PAPERS</div><p>{status === "idle" ? "Your evidence-bounded analysis will appear here." : "The analysis continues safely in the background."}</p></div></div> : <AnalysisOutput result={result} />}
        </section>
      </div>
      <div className="processing-notice page-processing-notice">
        <span className="meta">DATA PROCESSING NOTICE</span>
        <p>By uploading a paper, you agree that its extracted text may be sent to DeepSeek for analysis. Li Lab does not retain the manuscript.</p>
      </div>
    </main>
  );
}

function AnalysisOutput({ result }: { result: AnalysisResult }) {
  const methodParagraphs = result.coreMethod.body.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  return (
    <>
      <section className="analysis-section analysis-core">
        <div className="meta">01 · CORE METHOD</div>
        <h2>{result.coreMethod.heading}</h2>
        <div className="analysis-prose">{methodParagraphs.map((item) => <p key={item}>{item}</p>)}</div>
        <div className="analysis-subsection">
          <div className="meta">EVIDENCE FROM THE PAPER</div>
          <ol className="analysis-evidence-list">{result.coreMethod.evidence.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ol>
        </div>
      </section>
      <section className="analysis-section"><div className="meta">02 · REFERENCE ORIGINS</div><h2>Where the method comes from</h2>{result.referenceOrigins.length ? result.referenceOrigins.map((item) => <article className="source-row" key={`${item.title}-${item.doi}`}><div className="stack"><span className="tag">{item.relation}</span><span className="meta">VERIFIED · {(item.verificationSource ?? "metadata").toUpperCase()}</span></div><div className="row-copy"><h3>{item.title}</h3><p>{item.note}</p>{item.url || item.doi ? <a href={item.url || `https://doi.org/${item.doi}`} target="_blank" rel="noreferrer">{item.doi ? `DOI · ${item.doi}` : "Open source"} ↗</a> : null}</div></article>) : <p className="muted">No verified origin candidate was strong enough to include.</p>}</section>
      <section className="analysis-section"><div className="meta">03 · RELATED PAPERS</div><h2>What to read next</h2>{result.relatedPapers.length ? result.relatedPapers.map((item) => <article className="source-row" key={`${item.title}-${item.doi}`}><div className="stack"><span className="tag">{item.relation}</span><span className="meta">VERIFIED · {(item.verificationSource ?? "metadata").toUpperCase()}</span></div><div className="row-copy"><h3>{item.title}</h3><p>{item.note}</p>{item.url || item.doi ? <a href={item.url || `https://doi.org/${item.doi}`} target="_blank" rel="noreferrer">{item.doi ? `DOI · ${item.doi}` : "Open source"} ↗</a> : null}</div></article>) : <p className="muted">No verified related-paper candidate was strong enough to include.</p>}</section>
      {result.limitations?.length ? <section className="analysis-section"><div className="meta">04 · LIMITATIONS</div><h2>What this analysis cannot establish</h2><ul className="analysis-limitations">{result.limitations.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
      <p className="mono muted">NOT AN EXHAUSTIVE LITERATURE REVIEW · VERIFY PRIMARY SOURCES BEFORE RELYING ON A CLAIM</p>
    </>
  );
}
