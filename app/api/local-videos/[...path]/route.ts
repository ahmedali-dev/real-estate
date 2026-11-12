import { resolvedVideoUploadConfig } from "@/lib/video-upload-settings";
import { NextRequest, NextResponse } from "next/server";
import { requireListingsAccess } from "@/lib/auth/requireSession";
import { videoBackend, signVideo, readVideo, VIDEO_CHUNK_BYTES, VIDEO_MAX_BYTES } from "@/lib/local-video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const headers = { "Cache-Control": "no-store, private", Vary: "Cookie" };
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers });
async function handle(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { session, response } = await requireListingsAccess();
  if (response) return response;
  const origin = req.headers.get("origin");
  if (req.method !== "GET" && origin !== new URL(req.url).origin) return json({ error: "Same-origin request required." }, 403);
  const { path } = await context.params;
  try {
    const config = await resolvedVideoUploadConfig(req.url);
    if (!config) return json({ error: "Video uploads are disabled for this site or mode." }, 404);
    if (path.length === 1 && path[0] === "config" && req.method === "GET") return json({ enabled: true, mode: config.mode });
    let endpoint = ""; let ticket: Record<string, unknown> | undefined;
    let body: BodyInit | undefined;
    const upstreamHeaders: Record<string, string> = { Accept: "application/json", "X-API-Key": config.key, "ngrok-skip-browser-warning": "1" };
    if (path.join("/") === "uploads" && req.method === "POST") {
      const input = await req.json();
      if (typeof input.filename !== "string" || input.filename.length > 255 || /[\\/\u0000-\u001f]/.test(input.filename) || !/\.(mp4|mov|m4v|mkv|webm|avi)$/i.test(input.filename) || !Number.isSafeInteger(input.size) || input.size <= 0 || input.size > VIDEO_MAX_BYTES || !/^[a-f0-9]{64}$/.test(input.sha256)) return json({ error: "Choose a supported video (maximum 20 GB)." }, 400);
      endpoint = "/uploads"; body = JSON.stringify({ filename: input.filename, size: input.size, sha256: input.sha256 });
      upstreamHeaders["Content-Type"] = "application/json";
      ticket = { kind: "upload", user: session!.user.id, backend: videoBackend(config), filename: input.filename, size: input.size, sha256: input.sha256, expires: Date.now() + 24 * 60 * 60 * 1000 };
    } else {
      if (path.length < 2 || path.length > 3 || path[0] !== "uploads" || !/^[a-f0-9]{32}$/.test(path[1]) || (path[2] && path[2] !== "complete")) return json({ error: "Not found." }, 404);
      try { ticket = readVideo(req.headers.get("X-Upload-Ticket") || ""); } catch { return json({ error: "Reselect the file to start a new upload." }, 403); }
      if (ticket.kind !== "upload" || ticket.id !== path[1] || ticket.user !== session!.user.id || ticket.backend !== videoBackend(config) || Number(ticket.expires) < Date.now()) return json({ error: "Upload expired or belongs to another session." }, 403);
      if (path[2] ? req.method !== "POST" : !["GET", "PATCH", "DELETE"].includes(req.method)) return json({ error: "Method not allowed." }, 405);
      endpoint = `/uploads/${path[1]}${path[2] ? "/complete" : ""}`;
      if (req.method === "PATCH") {
        const offset = req.headers.get("Upload-Offset") || "";
        if (!/^\d+$/.test(offset) || !Number.isSafeInteger(Number(offset))) return json({ error: "Invalid upload offset." }, 422);
        // Read with a hard bound even when Content-Length is missing or untrusted.
        const reader = req.body?.getReader(); if (!reader) return json({ error: "No video chunk." }, 400);
        const chunks: Uint8Array[] = []; let size = 0;
        while (true) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > VIDEO_CHUNK_BYTES) { await reader.cancel(); return json({ error: "Chunk exceeds 8 MB." }, 413); } chunks.push(next.value); }
        if (!size || Number(offset) + size > Number(ticket.size)) return json({ error: "Invalid chunk size." }, 413);
        body = Buffer.concat(chunks); upstreamHeaders["Upload-Offset"] = offset; upstreamHeaders["Content-Type"] = "application/offset+octet-stream";
      }
    }
    const result = await fetch(`${config.url}${endpoint}`, { method: req.method, headers: upstreamHeaders, body, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(path[2] === "complete" ? 240000 : 60000) });
    if (result.status === 204) return new NextResponse(null, { status: 204, headers });
    const data = await result.json().catch(() => null);
    if (!result.ok) return json({ error: result.status === 401 ? "Check VIDEO_UPLOAD_API_KEY on the app server." : result.status === 409 ? "Upload changed. Resume to check the server offset." : result.status === 415 ? "The server rejected this video format." : result.status === 507 ? "The video server is out of storage." : "Video upload server rejected the request.", offset: typeof data?.detail?.offset === "number" ? data.detail.offset : undefined }, [401, 404, 409, 413, 415, 422, 507].includes(result.status) ? result.status : 502);
    if (!data || (path.length > 1 && data.upload_id !== path[1]) || !/^[a-f0-9]{32}$/.test(data.upload_id) || !Number.isSafeInteger(data.offset) || data.offset < 0 || data.offset > Number(ticket!.size)) return json({ error: "Invalid video server response." }, 502);
    const output: Record<string, unknown> = { upload_id: data.upload_id, offset: data.offset, size: ticket!.size, status: data.status, busy: data.busy === true, chunk_size: VIDEO_CHUNK_BYTES };
    if (endpoint === "/uploads") output.ticket = signVideo({ ...ticket, id: data.upload_id });
    if (path[2] === "complete") {
      if (data.status !== "complete" || data.offset !== ticket!.size || typeof data.stored_as !== "string" || data.stored_as.length > 512 || /[\\/\u0000-\u001f]/.test(data.stored_as)) return json({ error: "The server did not confirm a completed video." }, 502);
      output.receipt = signVideo({ kind: "complete", filename: ticket!.filename, size: ticket!.size, storedAs: data.stored_as, sha256: ticket!.sha256 });
    }
    return json(output, result.status);
  } catch { return json({ error: "Video server unavailable. Check VIDEO_UPLOAD_API_URL and resume the upload." }, 502); }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
