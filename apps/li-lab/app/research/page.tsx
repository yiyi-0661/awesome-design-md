import { ResearchArchive } from "@/components/research-archive";
import { buildResearchArchive } from "@/lib/research-issues";
import { listPublishedIssues } from "@/lib/server/repository";

export const metadata = { title: "Research" };
export const revalidate = 3600;

export default async function ResearchPage() {
  const issues = await listPublishedIssues();
  const latest = buildResearchArchive(issues)[0]?.issue;
  if (!latest) return <main className="page"><div className="empty-state">No published research briefs yet.</div></main>;
  return <main className="page narrow research-page"><ResearchArchive issues={issues} selectedIssue={latest} /></main>;
}
