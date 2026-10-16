import type { AnalysisJobSnapshot, AnalysisJobState, AnalysisResult } from "@/lib/types";
import { analyzePaper } from "./analysis";
import { createSupabaseServiceClient } from "./supabase";

export const ANALYSIS_BUCKET = "analysis-inputs";
export const ANALYSIS_MAX_FILE_BYTES = 30 * 1024 * 1024;
export const ANALYSIS_TUS_CHUNK_SIZE = 6 * 1024 * 1024;

type JobRecord = {
  id: string;
  owner_id: string;
  state: AnalysisJobState;
  file_name: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string;
  error_code: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
  deleted_at: string | null;
  result: AnalysisResult | null;
};

function stageFor(state: AnalysisJobState) {
  return ({ uploading: 0, uploaded: 0, queued: 0, extracting: 1, tracing: 2, analyzing: 3, reviewing: 4, complete: 4, failed: 0, expired: 0, cancelled: 0 } satisfies Record<AnalysisJobState, number>)[state];
}

function snapshot(job: JobRecord): AnalysisJobSnapshot {
  return {
    jobId: job.id,
    status: job.state,
    stage: stageFor(job.state),
    updatedAt: job.updated_at,
    result: job.result,
    errorCode: job.error_code
  };
}

function storageMetadataSize(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>).size;
  return typeof value === "number" ? value : typeof value === "string" ? Number(value) : null;
}

function storageMetadataType(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "";
  const record = metadata as Record<string, unknown>;
  return String(record.mimetype ?? record.contentType ?? "").toLowerCase();
}

function jobError(error: unknown) {
  const message = error instanceof Error ? error.message : "ANALYSIS_FAILED";
  if (message.includes("PDF_TEXT_UNAVAILABLE")) return "PDF_TEXT_UNAVAILABLE";
  if (message.includes("MODEL_REQUEST_FAILED")) return "MODEL_REQUEST_FAILED";
  if (message.includes("MODEL_OUTPUT") || error instanceof SyntaxError) return "MODEL_OUTPUT_INVALID";
  if (message.includes("BIBLIOGRAPHY_UNAVAILABLE")) return "BIBLIOGRAPHY_UNAVAILABLE";
  if (message.includes("PDF_INVALID")) return "INVALID_FILE_TYPE";
  return "ANALYSIS_FAILED";
}

async function ownedJob(ownerId: string, jobId: string) {
  const client = createSupabaseServiceClient();
  const { data, error } = await client.from("analysis_jobs").select("*").eq("id", jobId).eq("owner_id", ownerId).maybeSingle();
  if (error) throw new Error(`JOB_READ_FAILED:${error.message}`);
  if (!data) throw new Error("JOB_NOT_FOUND");
  return data as JobRecord;
}

export async function initializeAnalysisUpload(ownerId: string, input: { fileName: string; size: number; contentType: string }) {
  const client = createSupabaseServiceClient();
  const jobId = crypto.randomUUID();
  const objectPath = `${ownerId}/${jobId}.pdf`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const { error: insertError } = await client.from("analysis_jobs").insert({
    id: jobId,
    owner_id: ownerId,
    state: "uploading",
    file_name: input.fileName,
    storage_path: objectPath,
    size_bytes: input.size,
    mime_type: input.contentType,
    expires_at: expiresAt,
    updated_at: now.toISOString()
  });
  if (insertError) throw new Error(`JOB_CREATE_FAILED:${insertError.message}`);

  const { data, error } = await client.storage.from(ANALYSIS_BUCKET).createSignedUploadUrl(objectPath, { upsert: false });
  if (error || !data?.token) {
    await client.from("analysis_jobs").delete().eq("id", jobId).eq("owner_id", ownerId);
    throw new Error(`UPLOAD_TOKEN_FAILED:${error?.message ?? "missing token"}`);
  }
  return { jobId, bucket: ANALYSIS_BUCKET, path: objectPath, uploadToken: data.token, expiresAt, chunkSize: ANALYSIS_TUS_CHUNK_SIZE };
}

export async function confirmAnalysisUpload(ownerId: string, jobId: string) {
  const client = createSupabaseServiceClient();
  const job = await ownedJob(ownerId, jobId);
  if (job.state !== "uploading") throw new Error(job.state === "uploaded" ? "UPLOAD_ALREADY_CONFIRMED" : "JOB_STATE_CONFLICT");
  const [folder, name] = job.storage_path.split("/");
  if (folder !== ownerId || !name || job.storage_path !== `${ownerId}/${jobId}.pdf`) throw new Error("JOB_PATH_INVALID");
  const { data, error } = await client.storage.from(ANALYSIS_BUCKET).list(folder, { search: name, limit: 10 });
  if (error) throw new Error(`UPLOAD_VERIFY_FAILED:${error.message}`);
  const object = data.find((item) => item.name === name);
  if (!object) throw new Error("UPLOAD_INCOMPLETE");
  const actualSize = storageMetadataSize(object.metadata);
  const actualType = storageMetadataType(object.metadata);
  if (actualSize === null || !actualType) throw new Error("UPLOAD_VERIFY_FAILED");
  if (actualSize !== Number(job.size_bytes)) throw new Error("UPLOAD_SIZE_MISMATCH");
  if (actualSize < 1 || actualSize > ANALYSIS_MAX_FILE_BYTES) throw new Error("FILE_TOO_LARGE");
  if (actualType !== "application/pdf") throw new Error("INVALID_FILE_TYPE");
  const timestamp = new Date().toISOString();
  const { error: updateError } = await client.from("analysis_jobs").update({ state: "uploaded", uploaded_at: timestamp, updated_at: timestamp }).eq("id", jobId).eq("owner_id", ownerId).eq("state", "uploading");
  if (updateError) throw new Error(`UPLOAD_CONFIRM_FAILED:${updateError.message}`);
  return { jobId, status: "uploaded" as const };
}

async function updateStage(ownerId: string, jobId: string, state: "tracing" | "analyzing" | "reviewing") {
  const client = createSupabaseServiceClient();
  const previous = { tracing: "extracting", analyzing: "tracing", reviewing: "analyzing" }[state];
  const { data, error } = await client.from("analysis_jobs").update({ state, updated_at: new Date().toISOString() }).eq("id", jobId).eq("owner_id", ownerId).eq("state", previous).select("id").maybeSingle();
  if (error) throw new Error(`JOB_PROGRESS_FAILED:${error.message}`);
  if (!data) throw new Error("JOB_STATE_CONFLICT");
}

export async function deleteUploadedPaper(job: Pick<JobRecord, "id" | "owner_id" | "storage_path">) {
  const client = createSupabaseServiceClient();
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { error } = await client.storage.from(ANALYSIS_BUCKET).remove([job.storage_path]);
    if (!error) {
      const deletedAt = new Date().toISOString();
      await client.from("analysis_jobs").update({ deleted_at: deletedAt, updated_at: deletedAt }).eq("id", job.id).eq("owner_id", job.owner_id);
      return true;
    }
    lastError = error.message;
  }
  console.error("Analysis upload deletion failed", { jobId: job.id, errorCode: "STORAGE_DELETE_FAILED", detail: lastError });
  return false;
}

export async function processAnalysisJob(ownerId: string, jobId: string) {
  const client = createSupabaseServiceClient();
  const startedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await client.from("analysis_jobs")
    .update({ state: "extracting", analysis_started_at: startedAt, updated_at: startedAt })
    .eq("id", jobId).eq("owner_id", ownerId).eq("state", "uploaded").select("*").maybeSingle();
  if (claimError) throw new Error(`JOB_CLAIM_FAILED:${claimError.message}`);
  if (!claimed) {
    const current = await ownedJob(ownerId, jobId);
    if (current.state === "complete" && current.result) return current.result;
    throw new Error("JOB_STATE_CONFLICT");
  }
  const job = claimed as JobRecord;

  try {
    const { data: blob, error: downloadError } = await client.storage.from(ANALYSIS_BUCKET).download(job.storage_path);
    if (downloadError || !blob) throw new Error(`UPLOAD_DOWNLOAD_FAILED:${downloadError?.message ?? "empty object"}`);
    if (blob.size !== Number(job.size_bytes) || blob.size > ANALYSIS_MAX_FILE_BYTES) throw new Error("UPLOAD_SIZE_MISMATCH");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("PDF_INVALID");
    const file = new File([bytes], job.file_name, { type: "application/pdf" });
    const result = await analyzePaper(file, { onStage: (stage) => updateStage(ownerId, jobId, stage) });
    result.id = jobId;
    const completedAt = new Date().toISOString();
    const resultExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error: completeError } = await client.from("analysis_jobs").update({
      state: "complete",
      result,
      result_expires_at: resultExpiresAt,
      completed_at: completedAt,
      updated_at: completedAt,
      error_code: null
    }).eq("id", jobId).eq("owner_id", ownerId);
    if (completeError) throw new Error(`JOB_COMPLETE_FAILED:${completeError.message}`);
    return result;
  } catch (error) {
    const completedAt = new Date().toISOString();
    await client.from("analysis_jobs").update({ state: "failed", error_code: jobError(error), completed_at: completedAt, updated_at: completedAt }).eq("id", jobId).eq("owner_id", ownerId);
    throw error;
  } finally {
    await deleteUploadedPaper(job);
  }
}

export async function getAnalysisJob(ownerId: string, jobId: string) {
  const job = await ownedJob(ownerId, jobId);
  if (new Date(job.expires_at).getTime() < Date.now() && !["complete", "failed"].includes(job.state)) throw new Error("JOB_EXPIRED");
  return snapshot(job);
}

export async function cancelAnalysisJob(ownerId: string, jobId: string) {
  const client = createSupabaseServiceClient();
  const job = await ownedJob(ownerId, jobId);
  if (["complete", "failed", "expired", "cancelled"].includes(job.state)) return;
  await deleteUploadedPaper(job);
  const timestamp = new Date().toISOString();
  await client.from("analysis_jobs").update({ state: "cancelled", error_code: "USER_CANCELLED", completed_at: timestamp, updated_at: timestamp }).eq("id", jobId).eq("owner_id", ownerId);
}

export async function cleanupExpiredAnalysisJobs(ownerId?: string) {
  const client = createSupabaseServiceClient();
  let query = client.from("analysis_jobs").select("*").is("deleted_at", null).lt("expires_at", new Date().toISOString()).limit(100);
  if (ownerId) query = query.eq("owner_id", ownerId);
  const { data, error } = await query;
  if (error) throw new Error(`CLEANUP_QUERY_FAILED:${error.message}`);
  let deleted = 0;
  for (const row of data ?? []) {
    const job = row as JobRecord;
    if (await deleteUploadedPaper(job)) {
      deleted += 1;
      if (!["complete", "failed", "cancelled"].includes(job.state)) {
        await client.from("analysis_jobs").update({ state: "expired", error_code: "JOB_EXPIRED", completed_at: new Date().toISOString() }).eq("id", job.id);
      }
    }
  }
  const { data: cleared, error: clearError } = await client.from("analysis_jobs").update({ result: null, result_expires_at: null }).not("result", "is", null).lt("result_expires_at", new Date().toISOString()).select("id");
  if (clearError) throw new Error(`RESULT_CLEANUP_FAILED:${clearError.message}`);
  return { deleted, resultsCleared: cleared?.length ?? 0 };
}
