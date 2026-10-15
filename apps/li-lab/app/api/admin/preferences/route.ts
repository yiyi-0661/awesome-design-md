import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/server/supabase";
import { getPreferences, updatePreferences } from "@/lib/server/repository";
import { updateSettingsSchema } from "@/lib/validation";

export async function GET() {
  try { await requireOwner(); return NextResponse.json(await getPreferences()); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
}

export async function PUT(request: Request) {
  try {
    const owner = await requireOwner();
    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid settings", details: parsed.error.flatten() }, { status: 400 });
    return NextResponse.json(await updatePreferences(parsed.data, owner.id === "demo-owner" ? undefined : owner.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "VERSION_CONFLICT" ? 409 : message === "OWNER_REQUIRED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
