import { NextResponse } from "next/server";
import { githubIdentity, isOwnerUser, safeNextPath } from "@/lib/auth";
import { createSupabaseServerClient, registerOwnerMember } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const code = requestUrl.searchParams.get("code");
  const client = await createSupabaseServerClient();

  if (!code) return NextResponse.redirect(new URL(`/login?error=callback&next=${encodeURIComponent(next)}`, requestUrl.origin));
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL(`/login?error=callback&next=${encodeURIComponent(next)}`, requestUrl.origin));

  const { data: { user } } = await client.auth.getUser();
  if (!user || !isOwnerUser(user)) {
    await client.auth.signOut();
    return NextResponse.redirect(new URL(`/login?error=unauthorized&next=${encodeURIComponent(next)}`, requestUrl.origin));
  }

  const identity = githubIdentity(user);
  try {
    await registerOwnerMember(user.id, identity.id, identity.login);
  } catch {
    await client.auth.signOut();
    return NextResponse.redirect(new URL(`/login?error=registration&next=${encodeURIComponent(next)}`, requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
