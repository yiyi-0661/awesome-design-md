export function PageHeader({ eyebrow, title, intro, status }: { eyebrow: string; title: string; intro: string; status?: string }) {
  return (
    <header className="page-header">
      <div className="stack">
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
      {status ? <div className="status">{status}</div> : null}
    </header>
  );
}
