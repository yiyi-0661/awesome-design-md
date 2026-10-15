import { PrivateWorkspace } from "@/components/private-workspace";

export default function UpdatesLayout({ children }: { children: React.ReactNode }) {
  return <PrivateWorkspace next="/updates">{children}</PrivateWorkspace>;
}
