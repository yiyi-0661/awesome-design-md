import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { verifyRadarRequest } from "@/lib/server/radar-signature";
import { ingestIssue } from "@/lib/server/repository";

const score = z.object({
  total: z.number(),
  watchlistAdjustment: z.number().optional(),
  dimensions: z.object({
    relevance: z.number().optional(),
    novelty: z.number().optional(),
    mechanisticDepth: z.number().optional(),
    evidenceRigor: z.number().optional(),
    reproducibility: z.number().optional()
  })
});
const paper = z.object({
  id: z.string(), title: z.string(), authors: z.string(), venue: z.string(), publishedAt: z.string(), topics: z.array(z.string()),
  summary: z.string(), coreProblem: z.string(), strategy: z.string(), innovation: z.string(), evidence: z.string(), uncertainty: z.string(),
  doi: z.string(), url: z.string().url(), track: z.string().optional(), publicationStatus: z.string().optional(), institutions: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(), selectionReason: z.string().optional(), researchRelevance: z.string().optional(), abstractZh: z.string().optional(), score: score.optional()
});
const safeKey = z.string().min(1).max(160).regex(/^[A-Za-z0-9._:-]+$/);
const issueSchema = z.object({
  id: safeKey, runId: safeKey.optional(), digestHash: z.string().regex(/^[a-fA-F0-9]{64}$/).optional(), date: z.iso.date(), dateRange: z.string(),
  title: z.string(), synthesis: z.string(), generatedAt: z.iso.datetime({ offset: true }), warnings: z.array(z.string()).optional(),
  trackDistribution: z.array(z.object({ label: z.string(), count: z.number().int().nonnegative() })).optional(), papers: z.array(paper)
});

export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyRadarRequest(request, body)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  let json: unknown;
  try { json = JSON.parse(body); } catch { return NextResponse.json({ error: "Malformed JSON" }, { status: 400 }); }
  const parsed = issueSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid issue", details: parsed.error.flatten() }, { status: 400 });
  try {
    const result = await ingestIssue(parsed.data, body);
    if (result.inserted || ("replaced" in result && result.replaced)) {
      revalidateTag("research-issues", { expire: 0 });
      revalidatePath("/research");
      revalidatePath("/research/[date]", "page");
    }
    return NextResponse.json(result, { status: result.inserted ? 201 : 200 });
  } catch (error) {
    const conflict = error instanceof Error && error.message === "DIGEST_CONFLICT";
    return NextResponse.json({ error: conflict ? "An idempotency key has different content" : "Issue ingestion failed" }, { status: conflict ? 409 : 500 });
  }
}
