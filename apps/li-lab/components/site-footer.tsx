import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>LEARN, THINK, CREATE</span>
      <span className="footer-meta"><Link href="/login">MANAGE WORKSPACE</Link><span className="mono">LI LAB · SINGAPORE · 2026</span></span>
    </footer>
  );
}
