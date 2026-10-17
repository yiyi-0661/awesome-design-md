// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { cleanupExpiredAnalysisJobs, initializeAnalysisUpload } = vi.hoisted(() => ({ cleanupExpiredAnalysisJobs: vi.fn(), initializeAnalysisUpload: vi.fn() }));

vi.mock("@/lib/server/analysis-jobs", () => ({ cleanupExpiredAnalysisJobs, initializeAnalysisUpload }));
vi.mock("@/lib/server/supabase", () => ({ requireOwner: async () => ({ id: "owner-1" }) }));

import { POST } from "@/app/api/analysis/uploads/route";

describe("Analysis upload initialization", () => {
  beforeEach(() => {
    cleanupExpiredAnalysisJobs.mockReset();
    cleanupExpiredAnalysisJobs.mockResolvedValue({ deleted: 0, resultsCleared: 0 });
    initializeAnalysisUpload.mockReset();
    initializeAnalysisUpload.mockResolvedValue({ jobId: "job-1", path: "owner-1/job-1.pdf" });
  });

  it("accepts a 6.2 MiB PDF without sending its bytes through the route", async () => {
    const body = { fileName: "2606.26859v2.pdf", size: 6_501_806, contentType: "application/pdf" };
    const request = new Request("http://localhost/api/analysis/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(initializeAnalysisUpload).toHaveBeenCalledWith("owner-1", body);
    expect(JSON.stringify(body).length).toBeLessThan(100_000);
  });

  it("rejects files above 30 MiB before creating a job", async () => {
    const request = new Request("http://localhost/api/analysis/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileName: "large.pdf", size: 31 * 1024 * 1024, contentType: "application/pdf" }) });
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(initializeAnalysisUpload).not.toHaveBeenCalled();
  });

  it("does not use a path-bearing filename as the object path", async () => {
    const request = new Request("http://localhost/api/analysis/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileName: "../../论文.pdf", size: 500_000, contentType: "application/pdf" }) });
    await POST(request);
    expect(initializeAnalysisUpload).toHaveBeenCalledWith("owner-1", expect.objectContaining({ fileName: "论文.pdf" }));
  });
});
