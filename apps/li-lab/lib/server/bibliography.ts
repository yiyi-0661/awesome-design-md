import { createHash } from "node:crypto";

export type CandidateRole = "cited" | "related";

export type PaperCandidate = {
  id: string;
  role: CandidateRole;
  title: string;
  authors: string[];
  year: number | null;
  doi: string | null;
  url: string;
  openAlexId: string | null;
  verificationSource: "openalex" | "crossref" | "both";
};

type FetchLike = typeof fetch;

function normalizeDoi(value: string) {
  return value.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/[).,;]+$/, "").toLowerCase();
}

export function extractDois(text: string) {
  const matches = text.match(/10\.\d{4,9}\/[\w.()/:+-]+/gi) ?? [];
  return [...new Set(matches.map(normalizeDoi))].slice(0, 24);
}

function candidateId(doi: string | null, title: string) {
  return createHash("sha256").update(doi ?? title.toLowerCase()).digest("hex").slice(0, 16);
}

function crossrefDate(item: Record<string, unknown>) {
  const parts = (item.published as { "date-parts"?: number[][] } | undefined)?.["date-parts"]?.[0]
    ?? (item.issued as { "date-parts"?: number[][] } | undefined)?.["date-parts"]?.[0];
  return parts?.[0] ?? null;
}

function fromCrossref(item: Record<string, unknown>, role: CandidateRole): PaperCandidate | null {
  const title = Array.isArray(item.title) ? String(item.title[0] ?? "").trim() : "";
  if (!title) return null;
  const doi = item.DOI ? normalizeDoi(String(item.DOI)) : null;
  const authors = Array.isArray(item.author)
    ? item.author.map((author) => {
        const value = author as { given?: string; family?: string };
        return [value.given, value.family].filter(Boolean).join(" ");
      }).filter(Boolean)
    : [];
  return {
    id: candidateId(doi, title),
    role,
    title,
    authors,
    year: crossrefDate(item),
    doi,
    url: doi ? `https://doi.org/${doi}` : String(item.URL ?? ""),
    openAlexId: null,
    verificationSource: "crossref"
  };
}

async function fetchJson(url: URL, fetcher: FetchLike) {
  const response = await fetcher(url, { headers: { accept: "application/json", "user-agent": `LiLabAnalysis/1.0 (${process.env.CROSSREF_POLITE_EMAIL ?? "no-contact-configured"})` }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`METADATA_${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}

async function crossrefByDoi(doi: string, fetcher: FetchLike) {
  const url = new URL(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  if (process.env.CROSSREF_POLITE_EMAIL) url.searchParams.set("mailto", process.env.CROSSREF_POLITE_EMAIL);
  const payload = await fetchJson(url, fetcher);
  return fromCrossref(payload.message as Record<string, unknown>, "cited");
}

async function crossrefSearch(query: string, fetcher: FetchLike) {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query.bibliographic", query.slice(0, 500));
  url.searchParams.set("rows", "8");
  url.searchParams.set("select", "DOI,title,author,published,issued,URL");
  if (process.env.CROSSREF_POLITE_EMAIL) url.searchParams.set("mailto", process.env.CROSSREF_POLITE_EMAIL);
  const payload = await fetchJson(url, fetcher);
  const message = payload.message as { items?: Array<Record<string, unknown>> };
  return (message.items ?? []).map((item) => fromCrossref(item, "related")).filter((item): item is PaperCandidate => Boolean(item));
}

type OpenAlexWork = {
  id?: string;
  display_name?: string;
  publication_year?: number;
  doi?: string;
  referenced_works?: string[];
  primary_location?: { landing_page_url?: string };
  authorships?: Array<{ author?: { display_name?: string } }>;
};

function fromOpenAlex(work: OpenAlexWork, role: CandidateRole): PaperCandidate | null {
  const title = work.display_name?.trim();
  if (!title) return null;
  const doi = work.doi ? normalizeDoi(work.doi) : null;
  return {
    id: candidateId(doi, title),
    role,
    title,
    authors: (work.authorships ?? []).map((entry) => entry.author?.display_name ?? "").filter(Boolean),
    year: work.publication_year ?? null,
    doi,
    url: doi ? `https://doi.org/${doi}` : work.primary_location?.landing_page_url ?? work.id ?? "",
    openAlexId: work.id ?? null,
    verificationSource: "openalex"
  };
}

async function openAlexReferences(ids: string[], fetcher: FetchLike) {
  if (!ids.length) return [];
  const shortIds = ids.slice(0, 12).map((id) => id.split("/").at(-1)).filter(Boolean);
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("filter", `openalex_id:${shortIds.join("|")}`);
  url.searchParams.set("per-page", String(shortIds.length));
  if (process.env.OPENALEX_API_KEY) url.searchParams.set("api_key", process.env.OPENALEX_API_KEY);
  const response = await fetcher(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`OPENALEX_${response.status}`);
  const payload = await response.json() as { results?: OpenAlexWork[] };
  return (payload.results ?? []).map((work) => fromOpenAlex(work, "cited")).filter((item): item is PaperCandidate => Boolean(item));
}

async function openAlexSearch(query: string, fetcher: FetchLike) {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query.slice(0, 500));
  url.searchParams.set("per-page", "8");
  if (process.env.OPENALEX_API_KEY) url.searchParams.set("api_key", process.env.OPENALEX_API_KEY);
  if (process.env.CROSSREF_POLITE_EMAIL) url.searchParams.set("mailto", process.env.CROSSREF_POLITE_EMAIL);
  const response = await fetcher(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`OPENALEX_${response.status}`);
  const payload = await response.json() as { results?: OpenAlexWork[] };
  const works = payload.results ?? [];
  const exact = works.find((work) => normalizedTitle(work.display_name ?? "") === normalizedTitle(query));
  const references = await openAlexReferences(exact?.referenced_works ?? [], fetcher).catch(() => []);
  const related = works.map((work) => fromOpenAlex(work, "related")).filter((item): item is PaperCandidate => Boolean(item));
  return [...references, ...related];
}

function mergeCandidates(items: PaperCandidate[]) {
  const merged = new Map<string, PaperCandidate>();
  for (const item of items) {
    const key = normalizedTitle(item.title) || item.doi || item.id;
    const previous = merged.get(key);
    if (!previous) {
      merged.set(key, item);
      continue;
    }
    const primaryDoi = [previous.doi, item.doi].find((doi) => doi && !/\.s\d+$/i.test(doi)) ?? previous.doi ?? item.doi;
    merged.set(key, {
      ...previous,
      ...item,
      id: previous.id,
      role: previous.role === "cited" || item.role === "cited" ? "cited" : "related",
      authors: previous.authors.length ? previous.authors : item.authors,
      doi: primaryDoi,
      url: primaryDoi ? `https://doi.org/${primaryDoi}` : previous.url || item.url,
      openAlexId: previous.openAlexId ?? item.openAlexId,
      verificationSource: previous.verificationSource === item.verificationSource ? previous.verificationSource : "both"
    });
  }
  return [...merged.values()].slice(0, 24);
}

function normalizedTitle(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "");
}

const TITLE_STOP_WORDS = new Set([
  "about", "after", "against", "among", "based", "between", "from", "into", "over", "study", "that", "their", "these", "this", "through", "toward", "using", "with"
]);

function titleTokens(value: string) {
  return new Set(value.toLowerCase().normalize("NFKD").match(/[a-z0-9]+/g)?.filter((token) => token.length > 3 && !TITLE_STOP_WORDS.has(token)) ?? []);
}

export function isTitleRelated(uploaded: string, candidate: string) {
  const source = titleTokens(uploaded);
  const target = titleTokens(candidate);
  if (!source.size || !target.size) return false;
  const overlap = [...source].filter((token) => target.has(token)).length;
  const required = source.size <= 4 ? 2 : Math.min(3, Math.ceil(source.size * 0.25));
  return overlap >= required;
}

export async function findVerifiedCandidates(text: string, title: string, fetcher: FetchLike = fetch) {
  const doiLookups = extractDois(text).map((doi) => crossrefByDoi(doi, fetcher).catch(() => null));
  const [cited, crossrefRelated, openAlexRelated] = await Promise.all([
    Promise.all(doiLookups),
    crossrefSearch(title, fetcher).catch(() => []),
    openAlexSearch(title, fetcher).catch(() => [])
  ]);
  const uploadedTitle = normalizedTitle(title);
  const candidates = mergeCandidates([...cited.filter((item): item is PaperCandidate => Boolean(item)), ...crossrefRelated, ...openAlexRelated])
    .filter((candidate) => normalizedTitle(candidate.title) !== uploadedTitle)
    .filter((candidate) => candidate.role === "cited" || isTitleRelated(title, candidate.title));
  if (!candidates.length) throw new Error("BIBLIOGRAPHY_UNAVAILABLE");
  return candidates;
}
