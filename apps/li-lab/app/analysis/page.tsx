"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Upload } from "tus-js-client";
import { PageHeader } from "@/components/page-header";
import { ModePill, useWorkspace } from "@/components/workspace-store";
import { apiErrorMessage, readApiResponse } from "@/lib/api-response";
import { getSupabaseBrowserClient, supabaseBrowserPublicKey } from "@/lib/supabase-browser";
import type { AnalysisJobSnapshot, AnalysisResult, AnalysisStatus, MethodArticle } from "@/lib/types";
import { isTextPdf } from "@/lib/validation";

const stages: Array<{ status: AnalysisStatus; label: string }> = [
  { status: "extracting", label: "Reading paper" },
  { status: "tracing", label: "Tracing references" },
  { status: "analyzing", label: "Analyzing core method" },
  { status: "reviewing", label: "Reviewing evidence" }
];

type AnalysisConfig = {
  configured: boolean;
  maxFileBytes: number;
  uploadMode: "supabase-tus" | "direct-form";
  supabaseUrl?: string;
  bucket?: string;
  chunkSize: number;
};

type UploadSession = {
  jobId: string;
  bucket: string;
  path: string;
  expiresAt: string;
  chunkSize: number;
};

const storedJobKey = "li-lab-analysis-job";

function storageTusEndpoint(supabaseUrl: string) {
  const url = new URL(supabaseUrl);
  const projectId = url.hostname.split(".")[0];
  return `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
}

function megabytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

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
  const [config, setConfig] = useState<AnalysisConfig | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const activeUpload = useRef<Upload | null>(null);
  const activeJobId = useRef("");
  const uploadInProgress = useRef(false);

  useEffect(() => {
    void fetch("/api/analysis/jobs", { cache: "no-store" })
      .then(async (response) => {
        const payload = await readApiResponse<AnalysisConfig>(response);
        if (!response.ok || !("configured" in payload)) throw new Error(apiErrorMessage(payload, "Status unavailable"));
        return payload;
      })
      .then((payload) => { setConfigured(payload.configured); setConfig(payload); })
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    const jobId = window.localStorage.getItem(storedJobKey);
    if (!jobId) return;
    activeJobId.current = jobId;
    let stopped = false;
    let timer = 0;
    const poll = async () => {
      const response = await fetch(`/api/analysis/jobs/${jobId}`, { cache: "no-store" });
      const payload = await readApiResponse<AnalysisJobSnapshot>(response);
      if (stopped) return;
      if (!response.ok || !("status" in payload)) {
        if (response.status === 404 || response.status === 410) window.localStorage.removeItem(storedJobKey);
        return;
      }
      if (["complete", "failed", "expired", "cancelled"].includes(payload.status)) {
        window.clearInterval(timer);
        if (payload.status === "complete" && payload.result) {
          setResult(payload.result); setFileName(payload.result.fileName); setStatus("complete");
          setMessage("Analysis restored · the PDF was removed from private storage");
        } else if (payload.status !== "complete") {
          setStatus("failed"); setMessage("The previous analysis could not be completed. The uploaded PDF was removed.");
        }
      } else {
        setStatus(payload.status === "uploaded" ? "queued" : payload.status as AnalysisStatus);
        setMessage("Private analysis in progress · you can safely keep this page open");
      }
    };
    void poll();
    timer = window.setInterval(() => void poll(), 1800);
    return () => { stopped = true; window.clearInterval(timer); };
  }, []);

  useEffect(() => () => {
    if (!uploadInProgress.current) return;
    void activeUpload.current?.abort();
    if (activeJobId.current) void fetch(`/api/analysis/jobs/${activeJobId.current}`, { method: "DELETE", keepalive: true });
  }, []);

  async function uploadWithTus(file: File, session: UploadSession, settings: AnalysisConfig) {
    if (!settings.supabaseUrl) throw new Error("Private storage is not configured.");
    const endpoint = storageTusEndpoint(settings.supabaseUrl);
    const { data: { session: authSession }, error: authError } = await getSupabaseBrowserClient().auth.getSession();
    if (authError || !authSession?.access_token) throw new Error("Your private session expired. Sign in again.");
    return new Promise<void>((resolve, reject) => {
      const upload = new Upload(file, {
        endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: { authorization: `Bearer ${authSession.access_token}`, apikey: supabaseBrowserPublicKey(), "x-upsert": "false" },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        chunkSize: session.chunkSize,
        metadata: {
          bucketName: session.bucket,
          objectName: session.path,
          contentType: "application/pdf",
          cacheControl: "0"
        },
        onProgress: (uploaded, total) => {
          const percentage = total ? Math.round((uploaded / total) * 100) : 0;
          setUploadProgress(percentage);
          setMessage(`Uploading directly to private storage · ${percentage}%`);
        },
        onError: reject,
        onSuccess: () => resolve()
      });
      activeUpload.current = upload;
      void upload.findPreviousUploads().then((previous) => {
        if (previous[0]) upload.resumeFromPreviousUpload(previous[0]);
        upload.start();
      }).catch(reject);
    });
  }

  async function analyzeLegacy(file: File) {
    const form = new FormData();
    form.set("paper", file);
    form.set("externalProcessingConsent", "true");
    const response = await fetch("/api/analysis/jobs", { method: "POST", body: form });
    const payload = await readApiResponse<{ result?: AnalysisResult; error?: string }>(response);
    if (!response.ok || !("result" in payload) || !payload.result) throw new Error(apiErrorMessage(payload, "Analysis failed"));
    return payload.result;
  }

  async function analyze(file: File) {
    if (!isTextPdf(file)) { setStatus("failed"); setMessage("Choose a valid PDF smaller than 30 MB."); return; }
    if (configured === false) { setStatus("failed"); setMessage("DeepSeek is not configured. Add LLM_API_KEY to .env.local, then restart the server."); return; }
    if (!config) { setStatus("failed"); setMessage("Analysis setup is still loading. Please retry."); return; }
    setFileName(file.name); setFileSize(file.size); setUploadProgress(0); setResult(null); setStatus("validating"); setMessage("Validating PDF");
    let pollTimer = 0;
    let analysisRequestStarted = false;
    try {
      if (config.uploadMode === "direct-form") {
        setStatus("extracting"); setMessage("Uploading through the local development server");
        const legacyResult = await analyzeLegacy(file);
        setResult(legacyResult); setStatus("complete"); setMessage("Analysis complete · the PDF was not retained by the server");
        return;
      }

      setStatus("preparing"); setMessage("Preparing a private upload");
      const initResponse = await fetch("/api/analysis/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName: file.name, size: file.size, contentType: "application/pdf" })
      });
      const session = await readApiResponse<UploadSession>(initResponse);
      if (!initResponse.ok || !("jobId" in session)) throw new Error(apiErrorMessage(session, "The upload could not be prepared."));
      activeJobId.current = session.jobId;
      window.localStorage.setItem(storedJobKey, session.jobId);
      uploadInProgress.current = true;
      setStatus("uploading");
      await uploadWithTus(file, session, config);
      uploadInProgress.current = false;
      activeUpload.current = null;
      setStatus("uploaded"); setUploadProgress(100); setMessage("Upload complete · beginning private analysis");

      const confirmResponse = await fetch(`/api/analysis/uploads/${session.jobId}/complete`, { method: "POST" });
      const confirmation = await readApiResponse<{ status: string }>(confirmResponse);
      if (!confirmResponse.ok) throw new Error(apiErrorMessage(confirmation, "The upload could not be verified."));

      pollTimer = window.setInterval(() => {
        void fetch(`/api/analysis/jobs/${session.jobId}`, { cache: "no-store" }).then(async (response) => {
          const update = await readApiResponse<AnalysisJobSnapshot>(response);
          if (response.ok && "status" in update && ["extracting", "tracing", "analyzing", "reviewing"].includes(update.status)) setStatus(update.status as AnalysisStatus);
        });
      }, 1200);
      setStatus("extracting"); setMessage("Reading paper from private storage");
      analysisRequestStarted = true;
      const response = await fetch("/api/analysis/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: session.jobId })
      });
      const payload = await readApiResponse<{ result?: AnalysisResult; error?: string }>(response);
      if (!response.ok || !("result" in payload) || !payload.result) throw new Error(apiErrorMessage(payload, "Analysis failed"));
      setResult(payload.result);
      setStatus("complete");
      setMessage("Analysis complete · the PDF was removed from private storage");
    } catch (error) {
      uploadInProgress.current = false;
      void activeUpload.current?.abort();
      activeUpload.current = null;
      setStatus("failed");
      setMessage(`${error instanceof Error ? error.message : "The paper could not be analyzed."} The uploaded PDF has been removed.`);
      if (!analysisRequestStarted && activeJobId.current) void fetch(`/api/analysis/jobs/${activeJobId.current}`, { method: "DELETE" });
    } finally {
      window.clearInterval(pollTimer);
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
            <span><span className="meta">UPLOAD PAPER · PDF</span><h2>{fileName || "Drop a paper here to begin"}</h2>{fileSize ? <small className="meta">{megabytes(fileSize)}</small> : null}</span>
            <span className="stack"><span>{message}</span>{status === "uploading" ? <span className="upload-meter" aria-label={`Upload ${uploadProgress}%`}><span style={{ width: `${uploadProgress}%` }} /></span> : null}<span className="text-link">Browse files →</span></span>
          </label>
          <div className="progress-list">
            {stages.map((stage, index) => <div className={`progress-step ${status === "complete" || (currentIndex >= 0 && index <= currentIndex) ? "active" : ""}`} key={stage.status}><span>{String(index + 1).padStart(2, "0")} · {stage.label}</span><span>{status === "complete" || (currentIndex >= 0 && index < currentIndex) ? "✓" : index === currentIndex ? "●" : "○"}</span></div>)}
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
