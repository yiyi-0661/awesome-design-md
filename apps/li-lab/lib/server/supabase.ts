import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { githubIdentity, isOwnerUser } from "@/lib/auth";

function publicKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && publicKey());
}

export function hasSupabaseServiceConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role is not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function createSupabaseServerClient() {
  const store = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = publicKey();
  if (!url || !key) throw new Error("Supabase is not configured");
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components cannot write cookies. proxy.ts performs refresh writes.
        }
      }
    }
  });
}

export async function currentOwner() {
  if (!hasSupabaseConfig()) {
    return process.env.NODE_ENV !== "production" ? { id: "demo-owner", githubId: "129417133", githubLogin: "local-demo" } : null;
  }
  const client = await createSupabaseServerClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user || !isOwnerUser(user)) return null;
  const identity = githubIdentity(user);
  return { id: user.id, githubId: identity.id, githubLogin: identity.login };
}

export async function requireOwner() {
  const owner = await currentOwner();
  if (!owner) throw new Error("OWNER_REQUIRED");
  return owner;
}

export async function registerOwnerMember(userId: string, githubId: string, githubLogin: string) {
  const client = createSupabaseServiceClient();
  const { error } = await client.from("members").upsert({
    user_id: userId,
    github_id: githubId,
    github_login: githubLogin || `github-${githubId}`,
    enabled: true
  }, { onConflict: "user_id" });
  if (error) throw new Error(`MEMBER_REGISTRATION_FAILED:${error.message}`);
}
