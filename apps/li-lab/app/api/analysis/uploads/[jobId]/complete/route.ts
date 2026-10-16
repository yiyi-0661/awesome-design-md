import { NextResponse } from "next/server";
import { analysisErrorResponse } from "@/lib/server/analysis-http";
import { confirmAnalysisUpload } from "@/lib/server/analysis-jobs";
import { requireOwner } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const owner = await requireOwner();
    const { jobId } = await context.params;
    const result = await confirmAnalysisUpload(owner.id, jobId);
    return NextResponse.json(result);
  } catch (error) {
    return analysisErrorResponse(error);
  }
}
