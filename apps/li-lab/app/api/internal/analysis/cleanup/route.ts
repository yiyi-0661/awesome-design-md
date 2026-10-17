import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { cleanupExpiredAnalysisJobs } from "@/lib/server/analysis-jobs";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(provided));
}

async function cleanup(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await cleanupExpiredAnalysisJobs());
  } catch (error) {
    console.error("Analysis cleanup failed", { code: error instanceof Error ? error.message.split(":", 1)[0] : "CLEANUP_FAILED" });
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}

export const GET = cleanup;
export const POST = cleanup;
