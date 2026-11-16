import { openwaRequestHeaders } from "./openwa-http";

export const WHATSAPP_VIDEO_MAX_BYTES = 64 * 1024 * 1024;
const SAFE_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/3gpp"]);
const SAFE_VIDEO_EXTENSIONS = /\.(mp4|mov|avi|mkv|3gp)$/i;

export type VideoMetadata = { uploadId: string; filename: string; size: number; contentType: string };

export async function getVideoMetadata(config: { url: string; key: string }, uploadId: string, fetcher = fetch): Promise<VideoMetadata | null> {
  if (!/^[a-f0-9]{32}$/.test(uploadId)) return null;
  const result = await fetcher(`${config.url}/videos/${uploadId}`, {
    headers: openwaRequestHeaders(config.key), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
  });
  if (!result.ok || !result.headers.get("content-type")?.includes("application/json")) return null;
  const value: unknown = await result.json().catch(() => null);
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (typeof data.filename !== "string" || !SAFE_VIDEO_EXTENSIONS.test(data.filename) || /[\\/\u0000-\u001f]/.test(data.filename) || !Number.isSafeInteger(data.size) || Number(data.size) <= 0) return null;
  const contentType = typeof data.content_type === "string" && SAFE_VIDEO_TYPES.has(data.content_type.toLowerCase()) ? data.content_type.toLowerCase() : "";
  if (!contentType) return null;
  return { uploadId, filename: data.filename, size: Number(data.size), contentType };
}

export function forwardedVideoHeaders(upstream: Response, disposition: "attachment" | "inline", filename?: string) {
  const safeName = (filename || "property-video.mp4").replace(/[\\/\u0000-\u001f\u007f";]/g, "_");
  const fallback = safeName.replace(/[^\x20-\x7e]/g, "_");
  const contentDisposition = disposition === "inline" ? "inline" : `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
  const headers = new Headers({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": contentDisposition });
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "etag"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}
