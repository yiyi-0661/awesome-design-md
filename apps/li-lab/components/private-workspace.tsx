import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/server/supabase";

export async function PrivateWorkspace({ children, next }: { children: React.ReactNode; next: string }) {
  try {
    await requireOwner();
  } catch {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  return children;
}
