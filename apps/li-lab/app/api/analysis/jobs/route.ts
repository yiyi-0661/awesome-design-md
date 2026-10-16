import { NextResponse } from "next/server";
import { analyzePaper } from "@/lib/server/analysis";
import { analysisErrorResponse } from "@/lib/server/analysis-http";
import { ANALYSIS_MAX_FILE_BYTES, ANALYSIS_TUS_CHUNK_SIZE, processAnalysisJob } from "@/lib/server/analysis-jobs";
import { hasAnalysisModelConfig } from "@/lib/server/deepseek";
import { hasSupabaseServiceConfig, requireOwner } from "@/lib/server/supabase";
import { analysisStartSchema, isTextPdf } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  const uploadMode = hasSupabaseServiceConfig() ? "supabase-tus" : "direct-form";
  return NextResponse.json({
    configured: hasAnalysisModelConfig(),
    provider: "DeepSeek",
    model: process.env.LLM_MODEL ?? process.env.DEEPSEEK_MODEL ?? "deepseek-flash",
    maxFileBytes: ANALYSIS_MAX_FILE_BYTES,
    uploadMode,
    supabaseUrl: uploadMode === "supabase-tus" ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined,
    bucket: uploadMode === "supabase-tus" ? "analysis-inputs" : undefined,
    chunkSize: ANALYSIS_TUS_CHUNK_SIZE
  });
}

export async function POST(request: Request) {
  try {
    const owner = await requireOwner();
    if (!hasAnalysisModelConfig()) throw new Error("MODEL_NOT_CONFIGURED");
    if ((request.headers.get("content-type") ?? "").includes("application/json")) {
      const { jobId } = analysisStartSchema.parse(await request.json());
      return NextResponse.json({ result: await processAnalysisJob(owner.id, jobId) }, { status: 201 });
    }

    // Compatibility path for local development and rollback. Production uses TUS + jobId.
    const form = await request.formData();
    const file = form.get("paper");
    const consent = form.get("externalProcessingConsent") === "true";
    if (!consent) return NextResponse.json({ error: "Explicit consent is required before sending extracted paper text to DeepSeek." }, { status: 400 });
    if (!(file instanceof File) || !isTextPdf(file)) return NextResponse.json({ error: "Choose a valid PDF smaller than 30 MB." }, { status: 400 });
    const result = await analyzePaper(file);
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return analysisErrorResponse(error);
  }
}
