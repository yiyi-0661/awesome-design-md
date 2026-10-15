import { PrivateWorkspace } from "@/components/private-workspace";

export default function DraftsLayout({ children }: { children: React.ReactNode }) {
  return <PrivateWorkspace next="/methods/drafts">{children}</PrivateWorkspace>;
}
