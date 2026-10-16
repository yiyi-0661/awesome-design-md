import { NextResponse } from "next/server";
import { analysisUploadSchema, safeDisplayFileName } from "@/lib/validation";
import { analysisErrorResponse } from "@/lib/server/analysis-http";
import { cleanupExpiredAnalysisJobs, initializeAnalysisUpload } from "@/lib/server/analysis-jobs";
import { requireOwner } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const owner = await requireOwner();
    const parsed = analysisUploadSchema.parse(await request.json());
    await cleanupExpiredAnalysisJobs(owner.id);
    const upload = await initializeAnalysisUpload(owner.id, { ...parsed, fileName: safeDisplayFileName(parsed.fileName) });
    return NextResponse.json(upload, { status: 201 });
  } catch (error) {
    return analysisErrorResponse(error);
  }
}
