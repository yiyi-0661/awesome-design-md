import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { WorkspaceProvider } from "@/components/workspace-store";

export const metadata: Metadata = {
  title: { default: "Li Lab", template: "%s · Li Lab" },
  description: "A personal research workspace for DNA catalysis, chemistry, and scientific learning."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <WorkspaceProvider>
          <SiteNav />
          {children}
          <SiteFooter />
        </WorkspaceProvider>
      </body>
    </html>
  );
}
