import { createHash } from "node:crypto";
import { demoStore } from "./demo-store";
import { createSupabaseServiceClient, hasSupabaseServiceConfig } from "./supabase";
import { findResearchIssue } from "../research-issues";
import { loadLocalRadarIssues } from "./local-radar";
import type { ResearchIssue, UpdateSettings } from "../types";

type IssueEnvelope = ResearchIssue & { runId?: string; digestHash?: string };

function listLocalPublishedIssues() {
  const localIssues = loadLocalRadarIssues();
  if (!localIssues.length) return demoStore.listIssues();
  const byDate = new Map(demoStore.listIssues().map((issue) => [issue.date, issue]));
  for (const issue of localIssues) byDate.set(issue.date, issue);
  return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function settingsFromRow(row: Record<string, unknown>): UpdateSettings {
  return {
    topics: row.topics as string[],
    cadence: String(row.cadence),
    paperCount: row.paper_count as UpdateSettings["paperCount"],
    version: Number(row.version),
    updatedAt: String(row.updated_at)
  };
}

export async function getPreferences() {
  if (!hasSupabaseServiceConfig()) return demoStore.getSettings();
  const client = createSupabaseServiceClient();
  const { data, error } = await client.from("radar_preferences").select("*").eq("singleton", true).single();
  if (error) throw error;
  return settingsFromRow(data);
}

export async function updatePreferences(next: Omit<UpdateSettings, "updatedAt">, actorId?: string) {
  if (!hasSupabaseServiceConfig()) {
    const value = { ...next, version: next.version + 1, updatedAt: new Date().toISOString() };
    return demoStore.updateSettings(value, next.version);
  }

  const client = createSupabaseServiceClient();
  const previous = await getPreferences();
  const updatedAt = new Date().toISOString();
  const { data, error } = await client
    .from("radar_preferences")
    .update({ topics: next.topics, cadence: next.cadence, paper_count: next.paperCount, version: next.version + 1, updated_by: actorId, updated_at: updatedAt })
    .eq("singleton", true)
    .eq("version", next.version)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("VERSION_CONFLICT");
  await client.from("preference_audit").insert({ version: next.version + 1, previous_value: previous, next_value: settingsFromRow(data), actor_id: actorId });
  return settingsFromRow(data);
}

export async function listPublishedIssues() {
  if (!hasSupabaseServiceConfig()) return listLocalPublishedIssues();
  const client = createSupabaseServiceClient();
  const { data, error } = await client.from("research_issues").select("canonical_payload").not("published_at", "is", null).order("published_at", { ascending: false });
  if (error) {
    console.warn("Supabase research archive unavailable; using the bundled archive.", error.message);
    return listLocalPublishedIssues();
  }
  const cloudIssues = data.map((row) => row.canonical_payload as ResearchIssue);
  if (!cloudIssues.length) return listLocalPublishedIssues();
  return cloudIssues;
}

export async function getPublishedIssue(identifier: string) {
  const entry = findResearchIssue(await listPublishedIssues(), identifier);
  return entry?.issue ?? null;
}

export async function ingestIssue(issue: IssueEnvelope, rawBody: string) {
  if (!hasSupabaseServiceConfig()) return demoStore.upsertIssue(issue);
  const client = createSupabaseServiceClient();
  const runId = issue.runId ?? issue.id;
  const digestHash = issue.digestHash ?? createHash("sha256").update(rawBody).digest("hex");
  const { data: existing, error: lookupError } = await client
    .from("research_issues")
    .select("canonical_payload")
    .or(`id.eq.${issue.id},run_id.eq.${runId},digest_hash.eq.${digestHash}`)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) {
    if (JSON.stringify(existing.canonical_payload) !== JSON.stringify(issue)) throw new Error("DIGEST_CONFLICT");
    return { inserted: false, issue };
  }
  const { data: sameDate, error: dateLookupError } = await client
    .from("research_issues")
    .select("canonical_payload")
    .eq("issue_date", issue.date)
    .maybeSingle();
  if (dateLookupError) throw dateLookupError;
  if (sameDate) {
    const previous = sameDate.canonical_payload as ResearchIssue;
    if (issue.generatedAt <= previous.generatedAt) return { inserted: false, replaced: false, issue: previous };
    const { error: replaceError } = await client.from("research_issues").update({
      id: issue.id,
      run_id: runId,
      digest_hash: digestHash,
      title: issue.title,
      synthesis: issue.synthesis,
      paper_count: issue.papers.length,
      canonical_payload: issue,
      published_at: issue.papers.length > 0 ? issue.generatedAt : null
    }).eq("issue_date", issue.date);
    if (replaceError) throw replaceError;
    return { inserted: false, replaced: true, issue };
  }
  const { error } = await client.from("research_issues").insert({
    id: issue.id,
    run_id: runId,
    digest_hash: digestHash,
    issue_date: issue.date,
    title: issue.title,
    synthesis: issue.synthesis,
    paper_count: issue.papers.length,
    canonical_payload: issue,
    published_at: issue.papers.length > 0 ? issue.generatedAt : null
  });
  if (error) throw error;
  return { inserted: true, issue };
}
