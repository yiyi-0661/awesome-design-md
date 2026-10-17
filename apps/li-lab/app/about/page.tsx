import Image from "next/image";

export const metadata = { title: "About" };

const timeline = [
  ["01 · LEARN", "Follow emerging research and turn new papers into clear, structured understanding."],
  ["02 · THINK", "Question methods, trace the ideas behind them, and connect evidence across the literature."],
  ["03 · CREATE", "Transform what you learn into durable notes, new hypotheses, and experiments worth pursuing."]
] as const;

export default function AboutPage() {
  return (
    <main className="page narrow">
      <section className="about-hero">
        <div className="about-copy"><div className="eyebrow">PERSON + PRODUCT</div><h1>About</h1><p>A personal research workspace for learning in public while staying close to chemistry, DNA, and fast-moving scientific work.</p><div className="status">INDEPENDENT PROJECT · ACTIVE DEVELOPMENT</div></div>
        <figure className="about-figure"><Image src="/about-portrait-v1.png" alt="Watercolor illustration of two people surrounded by flowers and blue scientific brush motifs." width={1000} height={600} priority /></figure>
      </section>
      <section className="timeline">{timeline.map(([label, description]) => <div className="timeline-row" key={label}><h2>{label}</h2><p>{description}</p></div>)}</section>
    </main>
  );
}
