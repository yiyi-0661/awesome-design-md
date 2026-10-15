import { describe, expect, it } from "vitest";
import { githubIdentity, isOwnerUser, safeNextPath } from "@/lib/auth";

const owner = {
  identities: [{ provider: "github", identity_data: { provider_id: "129417133", user_name: "yiyi-0661" } }],
  user_metadata: {}
};

describe("owner authentication helpers", () => {
  it("reads the trusted GitHub identity", () => {
    expect(githubIdentity(owner as never)).toEqual({ id: "129417133", login: "yiyi-0661" });
    expect(isOwnerUser(owner as never, "129417133")).toBe(true);
    expect(isOwnerUser(owner as never, "999")).toBe(false);
  });

  it("falls back to OAuth metadata when identity data is absent", () => {
    expect(githubIdentity({ identities: [], user_metadata: { provider_id: "7", user_name: "reader" } } as never)).toEqual({ id: "7", login: "reader" });
  });

  it("accepts only local redirect paths", () => {
    expect(safeNextPath("/updates?tab=dna")).toBe("/updates?tab=dna");
    expect(safeNextPath("https://attacker.example")).toBe("/methods/drafts");
    expect(safeNextPath("//attacker.example")).toBe("/methods/drafts");
    expect(safeNextPath("/\\attacker.example")).toBe("/methods/drafts");
    expect(safeNextPath(null, "/analysis")).toBe("/analysis");
  });
});
