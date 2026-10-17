import { PrivateWorkspace } from "@/components/private-workspace";

export default function NewMethodLayout({ children }: { children: React.ReactNode }) {
  return <PrivateWorkspace next="/methods/new">{children}</PrivateWorkspace>;
}
