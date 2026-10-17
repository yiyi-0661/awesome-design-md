import { notFound } from "next/navigation";
import { ResearchArchive } from "@/components/research-archive";
import { buildResearchArchive, findResearchIssue } from "@/lib/research-issues";
import { listPublishedIssues } from "@/lib/server/repository";

export const revalidate = 3600;

export async function generateStaticParams() {
  const issues = await listPublishedIssues();
  return buildResearchArchive(issues).map((entry) => ({ date: entry.slug }));
}

export default async function ResearchIssuePage({ params }: PageProps<"/research/[date]">) {
  const { date } = await params;
  const issues = await listPublishedIssues();
  const selectedIssue = findResearchIssue(issues, date)?.issue;
  if (!selectedIssue) notFound();
  return <main className="page narrow research-page"><ResearchArchive issues={issues} selectedIssue={selectedIssue} /></main>;
}
