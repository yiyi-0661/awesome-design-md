import { describe, expect, it } from "vitest";
import { readApiResponse } from "@/lib/api-response";

describe("API response parsing", () => {
  it("turns a plain-text 413 into a stable file-size error", async () => {
    const payload = await readApiResponse(new Response("Request Entity Too Large", { status: 413, headers: { "content-type": "text/plain" } }));
    expect(payload).toEqual({ error: "The uploaded file is too large.", code: "FILE_TOO_LARGE" });
  });

  it("does not throw when a proxy returns malformed JSON", async () => {
    const payload = await readApiResponse(new Response("{not-json", { status: 502, headers: { "content-type": "application/json" } }));
    expect(payload).toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
