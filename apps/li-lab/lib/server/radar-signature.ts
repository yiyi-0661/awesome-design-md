import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const WINDOW_MS = 5 * 60 * 1000;

export function createRadarSignature(secret: string, timestamp: number, method: string, path: string, body: string) {
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const payload = `${timestamp}.${method.toUpperCase()}.${path}.${bodyHash}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyRadarRequest(request: Request, body: string, now = Date.now()) {
  const secret = process.env.RADAR_SHARED_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const timestampValue = request.headers.get("x-radar-timestamp");
  const signature = request.headers.get("x-radar-signature");
  if (!timestampValue || !signature) return false;
  const timestamp = Number(timestampValue);
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > WINDOW_MS) return false;
  const url = new URL(request.url);
  const expected = createRadarSignature(secret, timestamp, request.method, url.pathname, body);
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
