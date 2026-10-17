import { NextResponse } from "next/server";
import { analysisErrorResponse } from "@/lib/server/analysis-http";
import { cancelAnalysisJob, getAnalysisJob } from "@/lib/server/analysis-jobs";
import { requireOwner } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const owner = await requireOwner();
    const { jobId } = await context.params;
    return NextResponse.json(await getAnalysisJob(owner.id, jobId));
  } catch (error) {
    return analysisErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const owner = await requireOwner();
    const { jobId } = await context.params;
    await cancelAnalysisJob(owner.id, jobId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return analysisErrorResponse(error);
  }
}
