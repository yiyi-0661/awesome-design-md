import { NextResponse } from "next/server";
import { ZodError } from "zod";

const userErrors: Record<string, { status: number; message: string }> = {
  FILE_TOO_LARGE: { status: 400, message: "Choose a PDF smaller than 30 MB." },
  INVALID_FILE_TYPE: { status: 400, message: "This file is not a valid PDF." },
  PDF_INVALID: { status: 400, message: "This file is not a valid PDF." },
  UPLOAD_INCOMPLETE: { status: 409, message: "The upload did not complete. Please retry." },
  UPLOAD_VERIFY_FAILED: { status: 409, message: "The uploaded file could not be verified. Please retry." },
  UPLOAD_SIZE_MISMATCH: { status: 409, message: "The uploaded file did not match the selected PDF. Please retry." },
  PDF_TEXT_UNAVAILABLE: { status: 422, message: "This PDF has no extractable text. OCR the document and try again." },
  BIBLIOGRAPHY_UNAVAILABLE: { status: 502, message: "No verifiable literature candidates could be retrieved. Try again later." },
  MODEL_NOT_CONFIGURED: { status: 503, message: "DeepSeek is not configured on the server." },
  MODEL_REQUEST_FAILED: { status: 502, message: "DeepSeek could not complete the analysis." },
  MODEL_OUTPUT_INVALID: { status: 502, message: "DeepSeek returned an invalid result. Please retry." },
  JOB_NOT_FOUND: { status: 404, message: "This analysis session was not found." },
  JOB_EXPIRED: { status: 410, message: "This analysis session has expired." },
  JOB_STATE_CONFLICT: { status: 409, message: "This analysis job is already running or cannot be restarted." },
  UPLOAD_ALREADY_CONFIRMED: { status: 200, message: "Upload already confirmed." }
};

function codeFrom(error: unknown) {
  if (error instanceof ZodError) return "INVALID_REQUEST";
  const message = error instanceof Error ? error.message : "ANALYSIS_FAILED";
  if (message === "OWNER_REQUIRED") return "OWNER_REQUIRED";
  if (message.startsWith("MODEL_REQUEST_FAILED")) return "MODEL_REQUEST_FAILED";
  if (message === "MODEL_OUTPUT_INCOMPLETE" || message.startsWith("MODEL_SELECTED_") || error instanceof SyntaxError) return "MODEL_OUTPUT_INVALID";
  return message.split(":", 1)[0];
}

export function analysisErrorResponse(error: unknown) {
  const code = codeFrom(error);
  if (code === "OWNER_REQUIRED") return NextResponse.json({ error: "Sign in with the authorized GitHub account.", code }, { status: 401 });
  if (code === "INVALID_REQUEST") return NextResponse.json({ error: "The request was invalid.", code }, { status: 400 });
  const known = userErrors[code];
  if (known) return NextResponse.json({ error: known.message, code }, { status: known.status });
  console.error("Analysis request failed", { code });
  return NextResponse.json({ error: "The paper could not be analyzed.", code: "ANALYSIS_FAILED" }, { status: 500 });
}
