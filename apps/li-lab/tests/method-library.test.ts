import { describe, expect, it } from "vitest";
import { demoMethods } from "@/lib/demo-data";
import { mergeBundledMethods } from "@/lib/method-library";
import type { MethodArticle } from "@/lib/types";

const oldBundledArticle: MethodArticle = {
  id: "method-1",
  slug: "dna-as-a-chiral-scaffold",
  title: "DNA as a programmable chiral scaffold",
  excerpt: "Old bundled content",
  content: "Old bundled content",
  tags: ["DNA"],
  status: "published",
  author: "Li Lab",
  updatedAt: "2026-01-01T00:00:00.000Z",
  version: 3
};

const privateDraft: MethodArticle = {
  id: "method-private-draft",
  slug: "my-private-draft",
  title: "My private draft",
  excerpt: "A user-authored note",
  content: "# Keep me",
  tags: ["DRAFT"],
  status: "draft",
  author: "Li Lab member",
  updatedAt: "2026-10-17T00:00:00.000Z",
  version: 1
};

describe("mergeBundledMethods", () => {
  it("refreshes bundled articles and preserves user-authored methods", () => {
    const merged = mergeBundledMethods([oldBundledArticle, privateDraft]);

    expect(merged.slice(0, 2)).toEqual(demoMethods);
    expect(merged).toContainEqual(privateDraft);
    expect(merged.some((article) => article.slug === "dna-as-a-chiral-scaffold")).toBe(false);
  });

  it("does not duplicate bundled articles across migrations", () => {
    const merged = mergeBundledMethods([...demoMethods, privateDraft]);

    expect(merged.filter((article) => article.id === "method-1")).toHaveLength(1);
    expect(merged.filter((article) => article.id === "method-2")).toHaveLength(1);
  });
});
