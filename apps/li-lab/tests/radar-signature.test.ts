import { afterEach, describe, expect, it } from "vitest";
import { createRadarSignature, verifyRadarRequest } from "@/lib/server/radar-signature";

afterEach(() => { delete process.env.RADAR_SHARED_SECRET; });

describe("Radar HMAC", () => {
  it("accepts a matching request and rejects a modified body", () => {
    process.env.RADAR_SHARED_SECRET = "test-secret";
    const timestamp = Date.now();
    const body = JSON.stringify({ issue: "2026-10-14" });
    const signature = createRadarSignature("test-secret", timestamp, "POST", "/api/internal/radar/issues", body);
    const request = new Request("https://example.test/api/internal/radar/issues", { method: "POST", headers: { "x-radar-timestamp": String(timestamp), "x-radar-signature": signature } });
    expect(verifyRadarRequest(request, body, timestamp)).toBe(true);
    expect(verifyRadarRequest(request, `${body}x`, timestamp)).toBe(false);
  });

  it("rejects timestamps outside the replay window", () => {
    process.env.RADAR_SHARED_SECRET = "test-secret";
    const timestamp = Date.now() - 6 * 60 * 1000;
    const signature = createRadarSignature("test-secret", timestamp, "GET", "/api/internal/radar/preferences", "");
    const request = new Request("https://example.test/api/internal/radar/preferences", { headers: { "x-radar-timestamp": String(timestamp), "x-radar-signature": signature } });
    expect(verifyRadarRequest(request, "", Date.now())).toBe(false);
  });
});
