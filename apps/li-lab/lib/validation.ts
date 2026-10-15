import { z } from "zod";

export const updateSettingsSchema = z.object({
  topics: z
    .array(z.string().trim().min(2).max(80))
    .min(1)
    .max(20)
    .refine((items) => new Set(items.map((item) => item.toLocaleLowerCase())).size === items.length, "Topics must be unique"),
  cadence: z.enum([
    "Every Monday",
    "Every Tuesday",
    "Every Wednesday",
    "Every Thursday",
    "Every Friday",
    "Every Saturday",
    "Every Sunday",
    "Every Workday"
  ]),
  paperCount: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]),
  version: z.number().int().positive()
});

export const methodArticleSchema = z.object({
  title: z.string().trim().min(3).max(160),
  excerpt: z.string().trim().min(10).max(320),
  content: z.string().trim().min(20).max(100_000),
  tags: z.array(z.string().trim().min(2).max(40)).max(12),
  version: z.number().int().positive()
});

export function normalizeTopic(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isTextPdf(file: Pick<File, "name" | "type" | "size">) {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  return isPdf && file.size > 0 && file.size <= 30 * 1024 * 1024;
}

export function nextRunLabel(cadence: string) {
  return cadence === "Every Workday" ? "Next eligible workday · 09:00 SGT" : `${cadence.replace("Every ", "Next ")} · 09:00 SGT`;
}
