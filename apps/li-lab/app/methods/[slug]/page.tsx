"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { useWorkspace } from "@/components/workspace-store";

export default function MethodDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { methods } = useWorkspace();
  const article = methods.find((item) => item.slug === slug && item.status === "published");
  if (!article) return <main className="page"><div className="empty-state"><p>Reading note not found.</p><Link className="text-link" href="/methods">Return to Methods →</Link></div></main>;
  return (
    <main className="page narrow">
      <header className="page-header">
        <div className="stack"><div className="eyebrow">METHOD NOTE · V{article.version}</div><h1>{article.title}</h1><p>{article.excerpt}</p></div>
        <div className="status">UPDATED {new Date(article.updatedAt).toLocaleDateString("en-SG")}<br />BY {article.author}</div>
      </header>
      <div className="detail-grid">
        <aside className="detail-sidebar"><div className="meta">TOPICS</div><div className="tag-list">{article.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div><Link className="button small" href="/methods">Return to Methods</Link></aside>
        <Markdown>{article.content}</Markdown>
      </div>
    </main>
  );
}
