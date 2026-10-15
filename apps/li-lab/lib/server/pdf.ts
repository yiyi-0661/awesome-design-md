import { PDFParse } from "pdf-parse";

const MAX_TEXT_CHARACTERS = 120_000;

export type ExtractedPaper = {
  text: string;
  title: string;
  totalPages: number;
  truncated: boolean;
};

function cleanText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function inferredTitle(text: string, metadataTitle?: string) {
  const metadata = metadataTitle?.trim();
  if (metadata && metadata.length >= 6 && metadata.toLowerCase() !== "untitled") return metadata.slice(0, 300);
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 35);
  if (/^arxiv:/i.test(lines[0] ?? "")) {
    const titleParts: string[] = [];
    for (const line of lines.slice(1)) {
      if (/^(abstract|e-mail|keywords?|doi\b)/i.test(line) || /[∗†‡¶]/.test(line) || /\b(university|institute|department|laboratory)\b/i.test(line)) break;
      titleParts.push(line);
      if (titleParts.join(" ").length >= 300) break;
    }
    const arxivTitle = titleParts.join(" ").trim();
    if (arxivTitle.length >= 12) return arxivTitle.slice(0, 300);
  }
  return lines.find((line) => line.length >= 12 && line.length <= 300 && !/^(abstract|introduction|research article|article)$/i.test(line)) ?? "Uploaded research paper";
}

function boundedText(text: string) {
  if (text.length <= MAX_TEXT_CHARACTERS) return { text, truncated: false };
  const head = text.slice(0, 88_000);
  const tail = text.slice(-32_000);
  return { text: `${head}\n\n[... middle of paper omitted for context limit ...]\n\n${tail}`, truncated: true };
}

export async function extractPaper(file: File): Promise<ExtractedPaper> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const parser = new PDFParse({ data: bytes });
  try {
    const [content, info] = await Promise.all([
      parser.getText(),
      parser.getInfo().catch(() => null)
    ]);
    const cleaned = cleanText(content.text);
    if (cleaned.length < 400) throw new Error("PDF_TEXT_UNAVAILABLE");
    const bounded = boundedText(cleaned);
    const metadataTitle = info?.info?.Title ? String(info.info.Title) : undefined;
    return {
      text: bounded.text,
      title: inferredTitle(cleaned, metadataTitle),
      totalPages: content.total,
      truncated: bounded.truncated
    };
  } finally {
    await parser.destroy();
  }
}
