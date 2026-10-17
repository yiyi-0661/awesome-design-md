import { NextResponse } from "next/server";
import { verifyRadarRequest } from "@/lib/server/radar-signature";
import { getPreferences } from "@/lib/server/repository";

export async function GET(request: Request) {
  if (!verifyRadarRequest(request, "")) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  const settings = await getPreferences();
  return NextResponse.json({ schemaVersion: 1, timezone: "Asia/Singapore", ...settings });
}
