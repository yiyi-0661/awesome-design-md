import Link from "next/link";
import { DnaHelix } from "@/components/dna-helix";

export default function Home() {
  return (
    <main className="home">
      <section className="home-copy">
        <div className="eyebrow">CHEMISTRY × DNA</div>
        <h1>Learning the language of living systems.</h1>
        <p className="intro">
          I am a chemistry researcher at the National University of Singapore, developing DNA as a programmable chiral platform for asymmetric catalysis in water. I explore how the molecular architecture of DNA can guide chemical reactivity—opening cleaner, more selective pathways for chemical synthesis.
        </p>
        <Link className="text-link" href="/research">
          Begin exploring →
        </Link>
      </section>
      <DnaHelix />
    </main>
  );
}
