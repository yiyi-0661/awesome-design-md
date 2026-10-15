import { notFound } from "next/navigation";
import { ResearchArchive } from "@/components/research-archive";
import { getPublishedIssue, listPublishedIssues } from "@/lib/server/repository";

export const dynamic = "force-dynamic";

export default async function ResearchIssuePage({ params }: PageProps<"/research/[date]">) {
  const { date } = await params;
  const [issues, selectedIssue] = await Promise.all([listPublishedIssues(), getPublishedIssue(date)]);
  if (!selectedIssue) notFound();
  return <main className="page narrow research-page"><ResearchArchive issues={issues} selectedIssue={selectedIssue} /></main>;
}
