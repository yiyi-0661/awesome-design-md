import { redirect } from "next/navigation";

export default async function LegacyMethodsEditorPage({ searchParams }: PageProps<"/methods/new">) {
  const params = await searchParams;
  const edit = typeof params.edit === "string" ? params.edit : "";
  redirect(edit ? `/methods/drafts?draft=${encodeURIComponent(edit)}` : "/methods/drafts?new=1");
}
