import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { NextRequest } from "next/server";

test("video proxy authenticates, resumes, verifies, and rejects public access", async () => {
  const id = "a".repeat(32); let offset = 0; const received: Buffer[] = [];
  const server = http.createServer(async (req, res) => {
    assert.equal(req.headers["x-api-key"], "private-video-key");
    const chunks = []; for await (const part of req) chunks.push(part);
    const body = Buffer.concat(chunks);
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/uploads") { res.statusCode = 201; res.end(JSON.stringify({ upload_id: id, offset: 0, size: 3 })); }
    else if (req.method === "PATCH") {
      if (Number(req.headers["upload-offset"]) !== offset) { res.statusCode = 409; res.end(JSON.stringify({ detail: { offset } })); return; }
      received.push(body); offset += body.length; res.end(JSON.stringify({ upload_id: id, offset, size: 3 }));
    } else res.end(JSON.stringify({ upload_id: id, offset, size: 3, status: req.url?.endsWith("complete") ? "complete" : "uploading", stored_as: "home-id.mp4", busy: false }));
  });
  const previous = { ...process.env };
  const folder = await mkdtemp(`${tmpdir()}/video-proxy-`);
  try {
    server.listen(0, "127.0.0.1"); await once(server, "listening"); const address = server.address() as { port: number };
    process.env.VIDEO_UPLOAD_API_URL = `http://127.0.0.1:${address.port}`; process.env.VIDEO_UPLOAD_API_KEY = "private-video-key"; process.env.NEXTAUTH_SECRET = "test-video-signing-secret";
    Object.assign(process.env, { NODE_ENV: "development" });
    // Exercise the real handler/transport with a test session instead of NextAuth's request context.
    const source = (await readFile("app/api/local-videos/[...path]/route.ts", "utf8")).replace('import { requireListingsAccess } from "@/lib/auth/requireSession";', 'const requireListingsAccess = async () => ({ session: { user: { id: "test-user" } }, response: null });');
    const file = `${folder}/route.ts`; await writeFile(file, source.replace('import { resolvedVideoUploadConfig } from "@/lib/video-upload-settings";', `import { localVideoEnabled, videoConfig } from ${JSON.stringify(path.resolve("lib/local-video.ts"))}; const resolvedVideoUploadConfig = async (url: string) => localVideoEnabled(url) ? { ...videoConfig(), mode: "local" } : null;`).replace('"next/server"', JSON.stringify(createRequire(import.meta.url).resolve("next/server"))).replace('"@/lib/local-video"', JSON.stringify(path.resolve("lib/local-video.ts"))));
    const route = await import(pathToFileURL(file).href);
    async function call(path: string, method = "GET", body?: string, ticket?: string, extra: Record<string, string> = {}) {
      const req = new NextRequest(`http://localhost:3000/api/local-videos/${path}`, { method, headers: { Origin: "http://localhost:3000", ...(ticket ? { "X-Upload-Ticket": ticket } : {}), ...extra }, body });
      const res = await route[method](req, { params: Promise.resolve({ path: path.split("/") }) });
      return { status: res.status, data: await res.json() };
    }
    const created = await call("uploads", "POST", JSON.stringify({ filename: "home.mp4", size: 3, sha256: "f".repeat(64) }));
    assert.equal(created.status, 201); assert.ok(created.data.ticket); assert.equal(JSON.stringify(created.data).includes("private-video-key"), false);
    assert.equal((await call(`uploads/${id}`, "GET")).status, 403);
    assert.equal((await call(`uploads/${id}`, "GET", undefined, created.data.ticket + "x")).status, 403);
    assert.equal((await call(`uploads/${id}`, "PATCH", "abc", created.data.ticket, { "Upload-Offset": "0" })).status, 200);
    const conflict = await call(`uploads/${id}`, "PATCH", "abc", created.data.ticket, { "Upload-Offset": "0" });
    assert.equal(conflict.status, 409); assert.equal(conflict.data.offset, 3);
    const status = await call(`uploads/${id}`, "GET", undefined, created.data.ticket); assert.equal(status.data.offset, 3);
    const complete = await call(`uploads/${id}/complete`, "POST", undefined, created.data.ticket); assert.equal(complete.status, 200); assert.ok(complete.data.receipt);
    assert.equal(Buffer.concat(received).toString(), "abc");
    const csrf = await call("uploads", "POST", "{}", undefined, { Origin: "https://evil.test" }); assert.equal(csrf.status, 403);
    const publicResponse = await route.GET(new NextRequest("https://example.com/api/local-videos/config"), { params: Promise.resolve({ path: ["config"] }) }); assert.equal(publicResponse.status, 404);
    Object.assign(process.env, { NODE_ENV: "production" }); assert.equal((await call("config")).status, 404);
  } finally {
    for (const key of ["NODE_ENV", "VIDEO_UPLOAD_API_URL", "VIDEO_UPLOAD_API_KEY", "NEXTAUTH_SECRET"]) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
    server.close(); server.closeAllConnections(); await rm(folder, { recursive: true, force: true });
  }
});
