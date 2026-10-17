import { PrivateWorkspace } from "@/components/private-workspace";

export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
  return <PrivateWorkspace next="/analysis">{children}</PrivateWorkspace>;
}
