"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ModePill, useWorkspace } from "@/components/workspace-store";

export default function MethodsPage() {
  const { methods, hydrated } = useWorkspace();
  const published = methods.filter((item) => item.status === "published");
  const draftCount = methods.filter((item) => item.status === "draft").length;
  return (
    <main className="page narrow">
      <PageHeader eyebrow="READING NOTE LIBRARY" title="Methods" intro="Ideas become useful when they can be revisited, questioned, and connected." status={`${published.length} PUBLISHED NOTES\nCOLLABORATIVE WORKSPACE`} />
      <div className="toolbar">
        <ModePill />
        <Link className="button primary" href="/methods/drafts?new=1">Write a new note →</Link>
      </div>
      <div className="library-heading published-heading"><div><div className="meta">PUBLIC LIBRARY</div><h2>Published notes</h2></div><span className="meta">{published.length} PUBLISHED</span></div>
      {published.map((article) => (
        <article className="method-row" key={article.id}>
          <div className="stack"><div className="meta">{new Date(article.updatedAt).toLocaleDateString("en-SG")}<br />V{article.version} · {article.author}</div><div className="tag-list">{article.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div></div>
          <div className="row-copy"><h2>{article.title}</h2><p>{article.excerpt}</p><Link className="text-link" href={`/methods/${article.slug}`}>Open reading note →</Link></div>
        </article>
      ))}
      <Link className="drafts-entry" href="/methods/drafts" aria-label={`Open private drafts workspace, ${draftCount} active drafts`}>
        <span>DRAFTS</span><strong>{hydrated ? String(draftCount).padStart(2, "0") : "··"}</strong>
      </Link>
    </main>
  );
}
