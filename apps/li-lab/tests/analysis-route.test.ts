// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { analyzePaper } = vi.hoisted(() => ({ analyzePaper: vi.fn() }));

vi.mock("@/lib/server/analysis", () => ({ analyzePaper }));
vi.mock("@/lib/server/deepseek", () => ({ hasAnalysisModelConfig: () => true }));
vi.mock("@/lib/server/supabase", () => ({ requireOwner: async () => ({ id: "demo-owner" }) }));

import { POST } from "@/app/api/analysis/jobs/route";

function requestWith(consent: boolean) {
  const form = new FormData();
  form.set("paper", new File(["%PDF-1.4 fixture"], "paper.pdf", { type: "application/pdf" }));
  if (consent) form.set("externalProcessingConsent", "true");
  return new Request("http://localhost/api/analysis/jobs", { method: "POST", body: form });
}

describe("Analysis jobs API", () => {
  beforeEach(() => {
    analyzePaper.mockReset();
    analyzePaper.mockResolvedValue({ id: "job-1", status: "complete" });
  });

  it("rejects external processing without explicit consent", async () => {
    const response = await POST(requestWith(false));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("consent") });
    expect(analyzePaper).not.toHaveBeenCalled();
  });

  it("passes an accepted PDF through the real analysis service boundary", async () => {
    const response = await POST(requestWith(true));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ result: { id: "job-1", status: "complete" } });
    expect(analyzePaper).toHaveBeenCalledOnce();
  });
});
