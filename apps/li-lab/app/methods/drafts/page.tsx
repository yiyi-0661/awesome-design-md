"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Markdown } from "@/components/markdown";
import { useWorkspace } from "@/components/workspace-store";
import { methodArticleSchema } from "@/lib/validation";
import type { MethodArticle } from "@/lib/types";

const starter = `# Untitled method note

Begin with the question this note should help you answer.

## What I learned

- Separate direct evidence from interpretation.
- Keep uncertainty visible.

## What I want to test next

Write the next useful question here.`;

type Collection = "active" | "trash";
type EditorMode = "edit" | "preview";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `note-${Date.now()}`;
}

function makeDraft(): MethodArticle {
  const id = `method-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    slug: `untitled-${id}`,
    title: "Untitled method note",
    excerpt: "A concise description of what this note helps explain.",
    content: starter,
    tags: ["DNA", "CATALYSIS"],
    status: "draft",
    author: "Li Lab member",
    updatedAt: new Date().toISOString(),
    version: 1
  };
}

function formatUpdated(value: string) {
  const date = new Date(value);
  const elapsed = Date.now() - date.getTime();
  if (elapsed >= 0 && elapsed < 60_000) return "Updated just now";
  if (elapsed >= 0 && elapsed < 3_600_000) return `Updated ${Math.max(1, Math.floor(elapsed / 60_000))}m ago`;
  if (elapsed >= 0 && elapsed < 86_400_000) return `Updated ${Math.max(1, Math.floor(elapsed / 3_600_000))}h ago`;
  return `Updated ${date.toLocaleDateString("en-SG", { day: "2-digit", month: "short" })}`;
}

function DraftWorkspace() {
  const router = useRouter();
  const params = useSearchParams();
  const { methods, hydrated, saveMethod, archiveMethod, restoreMethod, deleteMethod } = useWorkspace();
  const [collection, setCollection] = useState<Collection>("active");
  const [editorMode, setEditorMode] = useState<EditorMode>("edit");
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState("Saved");
  const initialized = useRef(false);
  const createdFromQuery = useRef(false);

  const activeDrafts = useMemo(() => methods.filter((item) => item.status === "draft").sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)), [methods]);
  const trashDrafts = useMemo(() => methods.filter((item) => item.status === "archived").sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)), [methods]);
  const selected = methods.find((item) => item.id === selectedId && (item.status === "draft" || item.status === "archived"));
  const visibleDrafts = (collection === "active" ? activeDrafts : trashDrafts).filter((item) => `${item.title} ${item.excerpt} ${item.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));

  const selectDraft = useCallback((id: string) => {
    setSelectedId(id);
    setEditorMode("edit");
    router.replace(`/methods/drafts?draft=${encodeURIComponent(id)}`, { scroll: false });
  }, [router]);

  const createDraft = useCallback(() => {
    const draft = makeDraft();
    saveMethod(draft);
    setCollection("active");
    selectDraft(draft.id);
  }, [saveMethod, selectDraft]);

  useEffect(() => {
    if (!hydrated || initialized.current) return;
    initialized.current = true;
    queueMicrotask(() => {
      const requestedId = params.get("draft");
      const requested = methods.find((item) => item.id === requestedId && (item.status === "draft" || item.status === "archived"));
      if (params.get("new") === "1" && !createdFromQuery.current) {
        createdFromQuery.current = true;
        createDraft();
        return;
      }
      if (requested) {
        setCollection(requested.status === "archived" ? "trash" : "active");
        setSelectedId(requested.id);
      } else if (activeDrafts[0]) {
        setSelectedId(activeDrafts[0].id);
        router.replace(`/methods/drafts?draft=${encodeURIComponent(activeDrafts[0].id)}`, { scroll: false });
      } else if (trashDrafts[0]) {
        setCollection("trash");
        setSelectedId(trashDrafts[0].id);
        router.replace(`/methods/drafts?draft=${encodeURIComponent(trashDrafts[0].id)}`, { scroll: false });
      }
    });
  }, [activeDrafts, createDraft, hydrated, methods, params, router, trashDrafts]);

  useEffect(() => {
    if (!selected) return;
    queueMicrotask(() => {
      setTitle(selected.title);
      setExcerpt(selected.excerpt);
      setContent(selected.content);
      setTags(selected.tags.join(", "));
      setDirty(false);
      setSaveMessage(selected.status === "archived" ? `Archived ${new Date(selected.updatedAt).toLocaleDateString("en-SG", { day: "2-digit", month: "short" })}` : `Saved at ${new Date(selected.updatedAt).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}`);
    });
  }, [selected]);

  const buildArticle = useCallback((status: MethodArticle["status"]) => {
    if (!selected) return null;
    return {
      ...selected,
      slug: status === "published" ? slugify(title) : selected.slug,
      title: title.trim(),
      excerpt: excerpt.trim(),
      content,
      tags: tags.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12),
      status,
      updatedAt: new Date().toISOString(),
      version: status === "published" ? selected.version + 1 : selected.version
    } satisfies MethodArticle;
  }, [content, excerpt, selected, tags, title]);

  const persistDraft = useCallback(() => {
    const article = buildArticle("draft");
    if (!article) return null;
    saveMethod(article);
    setDirty(false);
    setSaveMessage(`Saved at ${new Date(article.updatedAt).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}`);
    return article;
  }, [buildArticle, saveMethod]);

  useEffect(() => {
    if (!hydrated || !selected || selected.status !== "draft" || !dirty) return;
    const timer = window.setTimeout(() => {
      setSaveMessage("Saving…");
      persistDraft();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [content, dirty, excerpt, hydrated, persistDraft, selected, tags, title]);

  function markChanged(update: () => void) {
    update();
    setDirty(true);
    setSaveMessage("Unsaved changes");
  }

  function switchCollection(next: Collection) {
    setCollection(next);
    setQuery("");
    const first = next === "active" ? activeDrafts[0] : trashDrafts[0];
    if (first) selectDraft(first.id);
    else {
      setSelectedId("");
      router.replace("/methods/drafts", { scroll: false });
    }
  }

  function moveToTrash() {
    if (!selected) return;
    archiveMethod(selected.id);
    setCollection("trash");
    setSaveMessage("Moved to trash");
  }

  function restore() {
    if (!selected) return;
    restoreMethod(selected.id);
    setCollection("active");
    setSaveMessage("Restored to active drafts");
  }

  function deletePermanently() {
    if (!selected || !window.confirm(`Delete “${selected.title}” permanently? This cannot be undone.`)) return;
    const next = trashDrafts.find((item) => item.id !== selected.id);
    deleteMethod(selected.id);
    if (next) selectDraft(next.id);
    else {
      setSelectedId("");
      router.replace("/methods/drafts", { scroll: false });
    }
  }

  function publish() {
    const article = buildArticle("published");
    if (!article) return;
    const result = methodArticleSchema.safeParse(article);
    if (!result.success) {
      setSaveMessage(result.error.issues[0]?.message ?? "Complete the required fields before publishing.");
      return;
    }
    saveMethod(article);
    router.push(`/methods/${article.slug}`);
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <main className="page narrow drafts-page">
      <header className="drafts-header">
        <div className="stack">
          <Link className="back-link" href="/methods">← Back to Methods</Link>
          <div className="eyebrow">PRIVATE WRITING WORKSPACE</div>
          <h1>Drafts</h1>
          <p>Write, organize, and publish research notes.</p>
        </div>
        <div className="status">LOCAL WORKSPACE<br />{String(activeDrafts.length).padStart(2, "0")} ACTIVE · {String(trashDrafts.length).padStart(2, "0")} IN TRASH</div>
      </header>

      <section className="draft-workspace" aria-label="Private Methods draft workspace">
        <aside className="draft-rail">
          <button className="new-draft-button" type="button" onClick={createDraft}>+ New draft</button>
          <label className="draft-search"><span className="sr-only">Search drafts</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search drafts…" /></label>
          <div className="draft-filters" role="tablist" aria-label="Draft collections">
            <button className={collection === "active" ? "active" : ""} type="button" role="tab" aria-selected={collection === "active"} onClick={() => switchCollection("active")}>ACTIVE · {String(activeDrafts.length).padStart(2, "0")}</button>
            <button className={collection === "trash" ? "active" : ""} type="button" role="tab" aria-selected={collection === "trash"} onClick={() => switchCollection("trash")}>TRASH · {String(trashDrafts.length).padStart(2, "0")}</button>
          </div>
          <div className="draft-list">
            {visibleDrafts.map((article) => (
              <button className={`draft-list-item ${article.id === selectedId ? "selected" : ""}`} type="button" key={article.id} onClick={() => selectDraft(article.id)}>
                <strong><span aria-hidden="true" />{article.title}</strong>
                <small>{article.status === "archived" ? "Moved to trash" : formatUpdated(article.updatedAt)}</small>
              </button>
            ))}
            {hydrated && !visibleDrafts.length ? <div className="draft-list-empty">{query ? "No drafts match this search." : collection === "active" ? "No active drafts yet." : "Trash is empty."}</div> : null}
          </div>
        </aside>

        <div className="draft-editor">
          {!hydrated ? <div className="draft-editor-empty"><div><div className="eyebrow">LOADING LOCAL WORKSPACE</div><p>Restoring your private drafts…</p></div></div> : !selected ? <div className="draft-editor-empty"><div><div className="eyebrow">NO DRAFT SELECTED</div><h2>Begin a new method note.</h2><button className="button primary" type="button" onClick={createDraft}>+ New draft</button></div></div> : (
            <>
              <div className="draft-editor-bar">
                <span className="meta">CURRENT DRAFT · {selected.title}</span>
                <div className="draft-editor-actions">
                  <span className={`save-state ${dirty ? "unsaved" : ""}`} role="status">{saveMessage}</span>
                  {selected.status === "draft" ? <button className="danger-link" type="button" onClick={moveToTrash}>Move to trash</button> : null}
                </div>
              </div>

              <div className="draft-fields">
                <label className="control"><span className="label">Title</span><input className="draft-title-input" value={title} disabled={selected.status === "archived"} onChange={(event) => markChanged(() => setTitle(event.target.value))} /></label>
                <div className="draft-meta-fields">
                  <label className="control"><span className="label">Excerpt</span><input className="draft-line-input" value={excerpt} disabled={selected.status === "archived"} onChange={(event) => markChanged(() => setExcerpt(event.target.value))} /></label>
                  <label className="control"><span className="label">Topics · comma separated</span><input className="draft-line-input" value={tags} disabled={selected.status === "archived"} onChange={(event) => markChanged(() => setTags(event.target.value))} /></label>
                </div>
              </div>

              <div className="draft-mode-bar">
                <div className="draft-mode-tabs" role="tablist" aria-label="Editor mode">
                  <button className={editorMode === "edit" ? "active" : ""} type="button" role="tab" aria-selected={editorMode === "edit"} onClick={() => setEditorMode("edit")}>EDIT</button>
                  <button className={editorMode === "preview" ? "active" : ""} type="button" role="tab" aria-selected={editorMode === "preview"} onClick={() => setEditorMode("preview")}>PREVIEW</button>
                </div>
                <span className="meta">MARKDOWN · {wordCount} WORDS</span>
              </div>

              <div className="draft-content">
                {editorMode === "edit" ? <textarea aria-label="Markdown content" value={content} disabled={selected.status === "archived"} onChange={(event) => markChanged(() => setContent(event.target.value))} spellCheck /> : <Markdown>{content}</Markdown>}
              </div>

              <div className="draft-footer-actions">
                <span className="meta">{selected.status === "archived" ? "RECOVERABLE DRAFT · LOCAL WORKSPACE" : "PRIVATE UNTIL PUBLISHED"}</span>
                <div className="tag-list">
                  {selected.status === "archived" ? <><button className="button ghost" type="button" onClick={restore}>Restore</button><button className="button danger" type="button" onClick={deletePermanently}>Delete permanently</button></> : <><button className="button ghost" type="button" onClick={persistDraft}>Save draft</button><button className="button primary" type="button" onClick={publish}>Publish →</button></>}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function DraftsPage() {
  return <Suspense fallback={<main className="page"><div className="empty-state">Opening private workspace…</div></main>}><DraftWorkspace /></Suspense>;
}
