"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ModePill, useWorkspace } from "@/components/workspace-store";
import { nextRunLabel, normalizeTopic, updateSettingsSchema } from "@/lib/validation";
import type { UpdateSettings } from "@/lib/types";

const suggestions = ["DNA", "RNA", "Biology", "Chemistry", "Catalysis", "Organic Synthesis"];
const cadenceOptions = ["Every Monday", "Every Tuesday", "Every Wednesday", "Every Thursday", "Every Friday", "Every Saturday", "Every Sunday", "Every Workday"];

export default function UpdatesPage() {
  const { settings, saveSettings } = useWorkspace();
  const [draft, setDraft] = useState(settings);
  const [topic, setTopic] = useState("");
  const [feedback, setFeedback] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const preview = useMemo(() => `${draft.cadence} · ${draft.paperCount} papers · ${draft.topics.length} selected topics`, [draft]);

  useEffect(() => { queueMicrotask(() => setDraft(settings)); }, [settings]);

  function addTopic(raw: string) {
    const value = normalizeTopic(raw);
    if (value.length < 2 || value.length > 80) { setFeedback("Topics must contain 2–80 characters."); return; }
    if (draft.topics.some((item) => item.toLowerCase() === value.toLowerCase())) { setFeedback("That topic is already selected."); return; }
    if (draft.topics.length >= 20) { setFeedback("You can follow up to 20 topics."); return; }
    setDraft({ ...draft, topics: [...draft.topics, value] }); setTopic(""); setFeedback("");
  }

  function submitTopic(event: FormEvent) { event.preventDefault(); addTopic(topic); }
  function removeTopic(value: string) { if (draft.topics.length === 1) { setFeedback("Keep at least one topic selected."); return; } setDraft({ ...draft, topics: draft.topics.filter((item) => item !== value) }); }
  async function save() {
    const candidate = { ...draft, version: settings.version, updatedAt: settings.updatedAt };
    const result = updateSettingsSchema.safeParse(candidate);
    if (!result.success) { setFeedback(result.error.issues[0]?.message ?? "Settings could not be saved."); return; }
    const next: UpdateSettings = { ...draft, version: settings.version, updatedAt: settings.updatedAt };
    try {
      const saved = await saveSettings(next);
      setDraft(saved); setFeedback("✓ Settings saved · effective from the next scheduled run");
    } catch (error) {
      setFeedback(error instanceof Error && error.message === "VERSION_CONFLICT" ? "Settings changed elsewhere. Reload before saving." : "Settings could not be saved.");
    }
  }

  return (
    <main className="page narrow">
      <PageHeader eyebrow="RADAR CONTROL" title="Updates" intro="Change what Chem Research Radar follows and when the next literature brief arrives." status={`LAST UPDATED ${new Date(settings.updatedAt).toLocaleDateString("en-SG")}\n${nextRunLabel(draft.cadence).toUpperCase()}`} />
      <div className="settings-layout">
        <div>
          <ModePill />
          <section className="settings-section">
            <div className="meta">01 · ADD A RESEARCH INTEREST</div>
            <form className="topic-composer" onSubmit={submitTopic}><input className="topic-input" aria-label="Research topic" placeholder="e.g. DNA-mediated asymmetric catalysis" value={topic} onChange={(event) => setTopic(event.target.value)} /><button className="button primary" type="submit">Add topic</button></form>
          </section>
          <section className="settings-section">
            <h2>Selected Topics</h2>
            <div className="tag-list">{draft.topics.map((item) => <span className="selected-topic" key={item}>{item}<button aria-label={`Remove ${item}`} onClick={() => removeTopic(item)}>×</button></span>)}</div>
            <div className="meta">SUGGESTED TOPICS</div>
            <div className="tag-list">{suggestions.map((item) => { const selected = draft.topics.some((topicItem) => topicItem.toLowerCase() === item.toLowerCase()); return <button className={`topic-button ${selected ? "selected" : ""}`} key={item} onClick={() => selected ? removeTopic(draft.topics.find((topicItem) => topicItem.toLowerCase() === item.toLowerCase())!) : addTopic(item)}>{selected ? "✓ " : "+ "}{item}</button>; })}</div>
          </section>
          <section className="settings-section">
            <div className="controls-grid">
              <label className="control"><span className="label">Delivery schedule</span><select className="select-input" value={draft.cadence} onChange={(event) => setDraft({ ...draft, cadence: event.target.value })}>{cadenceOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="control"><span className="label">Papers per delivery</span><select className="select-input" value={draft.paperCount} onChange={(event) => setDraft({ ...draft, paperCount: Number(event.target.value) as UpdateSettings["paperCount"] })}>{[5, 10, 15, 20].map((item) => <option key={item} value={item}>{item} papers</option>)}</select></label>
            </div>
          </section>
          <div className="toolbar"><span className={`feedback ${feedback.startsWith("✓") ? "" : "error"}`} role="status">{feedback}</span><button className="button primary" disabled={!dirty} onClick={() => void save()}>Save settings →</button></div>
        </div>
        <aside className="settings-preview">
          <div className="eyebrow">NEXT DELIVERY PREVIEW</div><div className="preview-value">{preview}</div><p>{nextRunLabel(draft.cadence)}</p><div className="mono">Changes affect the next run only.<br />No immediate email · no historical rewrite.</div>
        </aside>
      </div>
    </main>
  );
}
