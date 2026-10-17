import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/server/supabase";

export async function POST(request: Request) {
  if (hasSupabaseConfig()) {
    const client = await createSupabaseServerClient();
    await client.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login?signedOut=1", request.url), { status: 303 });
}
