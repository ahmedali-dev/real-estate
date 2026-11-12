import { createHmac, timingSafeEqual, createHash } from "node:crypto";

export const VIDEO_CHUNK_BYTES = 8 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 20 * 1024 * 1024 * 1024;
export function localVideoEnabled(url: string, mode = process.env.NODE_ENV) {
  try { return mode === "development" && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname); }
  catch { return false; }
}
export function videoConfig() {
  const url = new URL(process.env.VIDEO_UPLOAD_API_URL || "http://127.0.0.1:8000");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw Error("Invalid video server configuration.");
  return { url: url.href.replace(/\/$/, ""), key: process.env.VIDEO_UPLOAD_API_KEY || "" };
}
function signature(body: string) {
  if (!process.env.NEXTAUTH_SECRET) throw Error("NEXTAUTH_SECRET is required.");
  return createHmac("sha256", process.env.NEXTAUTH_SECRET).update(`local-video:${body}`).digest("base64url");
}
export function signVideo(value: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${body}.${signature(body)}`;
}
export function readVideo(token: string): Record<string, unknown> {
  if (typeof token !== "string" || token.length > 4096) throw Error("Invalid video reference.");
  const [body, mac, extra] = token.split(".");
  if (!body || !mac || extra) throw Error("Invalid video reference.");
  const actual = Buffer.from(mac); const expected = Buffer.from(signature(body));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw Error("Invalid video reference.");
  return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
}
export function videoBackend(config = videoConfig()) { return createHash("sha256").update(config.url).update(config.key).digest("hex"); }
export function validVideoReceipt(token: string) {
  try { const value = readVideo(token); return value.kind === "complete" && typeof value.storedAs === "string" && typeof value.filename === "string" && typeof value.size === "number"; }
  catch { return false; }
}
