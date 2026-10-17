import type { User } from "@supabase/supabase-js";

export const DEFAULT_OWNER_GITHUB_ID = "129417133";

export function safeNextPath(value: string | null | undefined, fallback = "/methods/drafts") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  const resolved = new URL(value, "https://li-lab.local");
  if (resolved.origin !== "https://li-lab.local") return fallback;
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

export function githubIdentity(user: Pick<User, "identities" | "user_metadata"> | null | undefined) {
  if (!user) return { id: "", login: "" };
  const githubIdentity = user.identities?.find((identity) => identity.provider === "github");
  const identityData = githubIdentity?.identity_data ?? {};
  const metadata = user.user_metadata ?? {};

  return {
    id: String(identityData.provider_id ?? metadata.provider_id ?? ""),
    login: String(identityData.user_name ?? identityData.preferred_username ?? metadata.user_name ?? metadata.preferred_username ?? "")
  };
}

export function isOwnerUser(
  user: Pick<User, "identities" | "user_metadata"> | null | undefined,
  ownerGithubId = process.env.OWNER_GITHUB_ID ?? DEFAULT_OWNER_GITHUB_ID
) {
  const identity = githubIdentity(user);
  return Boolean(identity.id && identity.id === ownerGithubId);
}
