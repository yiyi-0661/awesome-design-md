import { NextResponse } from "next/server";
import { analyzePaper } from "@/lib/server/analysis";
import { hasAnalysisModelConfig } from "@/lib/server/deepseek";
import { requireOwner } from "@/lib/server/supabase";
import { isTextPdf } from "@/lib/validation";
import { ZodError } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300;

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "ANALYSIS_FAILED";
  if (message === "OWNER_REQUIRED") return NextResponse.json({ error: "Sign in with the authorized GitHub account." }, { status: 401 });
  if (message === "PDF_TEXT_UNAVAILABLE") return NextResponse.json({ error: "This PDF has no extractable text. OCR the document and try again." }, { status: 422 });
  if (message === "BIBLIOGRAPHY_UNAVAILABLE") return NextResponse.json({ error: "No verifiable literature candidates could be retrieved. Try again later." }, { status: 502 });
  if (message === "MODEL_NOT_CONFIGURED") return NextResponse.json({ error: "DeepSeek is not configured on the server." }, { status: 503 });
  if (message.startsWith("MODEL_REQUEST_FAILED")) return NextResponse.json({ error: "DeepSeek could not complete the analysis.", detail: message }, { status: 502 });
  if (message === "MODEL_OUTPUT_INCOMPLETE" || message.startsWith("MODEL_SELECTED_") || error instanceof SyntaxError || error instanceof ZodError) {
    if (error instanceof ZodError) {
      console.error("DeepSeek schema validation failed", error.issues.map(({ code, path, message: issue }) => ({ code, path, issue })));
    } else {
      console.error("DeepSeek structured output failed", error instanceof SyntaxError ? "INVALID_JSON" : message);
    }
    return NextResponse.json({ error: "DeepSeek returned an invalid structured result. Please retry." }, { status: 502 });
  }
  console.error("Analysis failed", error);
  return NextResponse.json({ error: "The paper could not be analyzed." }, { status: 500 });
}

export async function GET() {
  return NextResponse.json({
    configured: hasAnalysisModelConfig(),
    provider: "DeepSeek",
    model: process.env.LLM_MODEL ?? process.env.DEEPSEEK_MODEL ?? "deepseek-flash",
    maxFileBytes: 30 * 1024 * 1024
  });
}

export async function POST(request: Request) {
  try {
    await requireOwner();
    if (!hasAnalysisModelConfig()) throw new Error("MODEL_NOT_CONFIGURED");
    const form = await request.formData();
    const file = form.get("paper");
    const consent = form.get("externalProcessingConsent") === "true";
    if (!consent) return NextResponse.json({ error: "Explicit consent is required before sending extracted paper text to DeepSeek." }, { status: 400 });
    if (!(file instanceof File) || !isTextPdf(file)) return NextResponse.json({ error: "Choose a valid PDF smaller than 30 MB." }, { status: 400 });
    const result = await analyzePaper(file);
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
