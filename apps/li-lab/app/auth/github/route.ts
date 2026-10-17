import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  if (!hasSupabaseConfig()) {
    return NextResponse.redirect(new URL(`/login?error=setup&next=${encodeURIComponent(next)}`, requestUrl.origin));
  }

  const client = await createSupabaseServerClient();
  const callback = new URL("/auth/callback", requestUrl.origin);
  callback.searchParams.set("next", next);
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: callback.toString() }
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL(`/login?error=oauth&next=${encodeURIComponent(next)}`, requestUrl.origin));
  }
  return NextResponse.redirect(data.url);
}
