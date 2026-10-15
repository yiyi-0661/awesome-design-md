"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["Research", "/research"],
  ["Methods", "/methods"],
  ["Analysis", "/analysis"],
  ["Updates", "/updates"],
  ["About", "/about"]
] as const;

export function SiteNav() {
  const pathname = usePathname();
  return (
    <header className="site-nav">
      <Link className="wordmark" href="/" aria-label="Li Lab — return to homepage">
        Li Lab
      </Link>
      <nav aria-label="Primary navigation">
        {links.map(([label, href]) => (
          <Link key={href} href={href} aria-current={pathname.startsWith(href) ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
