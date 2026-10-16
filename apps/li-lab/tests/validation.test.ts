import { describe, expect, it } from "vitest";
import { isTextPdf, nextRunLabel, normalizeTopic, safeDisplayFileName, updateSettingsSchema } from "@/lib/validation";

describe("Updates validation", () => {
  it("accepts the product cadence and count contract", () => {
    expect(updateSettingsSchema.safeParse({ topics: ["DNA", "Catalysis"], cadence: "Every Monday", paperCount: 10, version: 1 }).success).toBe(true);
  });

  it("rejects case-insensitive duplicate topics", () => {
    expect(updateSettingsSchema.safeParse({ topics: ["DNA", "dna"], cadence: "Every Monday", paperCount: 10, version: 1 }).success).toBe(false);
  });

  it("normalizes whitespace and formats the next run", () => {
    expect(normalizeTopic("  DNA   catalysis ")).toBe("DNA catalysis");
    expect(nextRunLabel("Every Workday")).toContain("workday");
  });
});

describe("Analysis intake", () => {
  it("accepts PDFs under 30 MB and rejects other files", () => {
    expect(isTextPdf({ name: "paper.pdf", type: "application/pdf", size: 1024 })).toBe(true);
    expect(isTextPdf({ name: "paper.pdf", type: "application/pdf", size: 6_501_806 })).toBe(true);
    expect(isTextPdf({ name: "paper.txt", type: "text/plain", size: 1024 })).toBe(false);
    expect(isTextPdf({ name: "paper.pdf", type: "application/pdf", size: 31 * 1024 * 1024 })).toBe(false);
  });

  it("keeps Unicode display names while removing path traversal", () => {
    expect(safeDisplayFileName("../../论文阅读.pdf")).toBe("论文阅读.pdf");
  });
});
