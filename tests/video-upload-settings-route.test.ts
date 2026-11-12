import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { NextRequest } from "next/server";

test("settings API restricts admins, encrypts/redacts keys and preserves or clears them explicitly", async () => {
  const folder = await mkdtemp(`${tmpdir()}/video-settings-`);
  const previous = process.env.NEXTAUTH_SECRET; process.env.NEXTAUTH_SECRET = "settings-route-test";
  try {
    let source = await readFile("app/api/video-upload/settings/route.ts", "utf8");
    source = source.replace('import { requireAdmin } from "@/lib/auth/requireSession";', `export const fixture = { admin: true, saved: null as any }; const requireAdmin = async () => ({ response: fixture.admin ? null : NextResponse.json({ error: "Forbidden" }, { status: 403 }) });`);
    source = source.replace(/import \{ savedVideoSettings[^\n]+\n/, `import { defaultVideoSettings, readableVideoKey, encryptVideoKey, type VideoSettings } from ${JSON.stringify(path.resolve("lib/video-upload-settings.ts"))};
const savedVideoSettings = async () => fixture.saved;
const videoSettingsCollection = async () => ({ updateOne: async (_filter: unknown, update: any) => { fixture.saved = { _id: "video-upload", ...update.$set }; } });
const resolvedVideoUploadConfig = async (_url: string) => null;
`);
    source = source.replace('"next/server"', JSON.stringify(createRequire(import.meta.url).resolve("next/server"))).replace('"@/lib/video-upload-config"', JSON.stringify(path.resolve("lib/video-upload-config.ts")));
    const file = `${folder}/route.ts`; await writeFile(file, source); const route = await import(pathToFileURL(file).href);
    async function put(body: unknown, origin = "http://localhost:3000") { return route.PUT(new NextRequest("http://localhost:3000/api/video-upload/settings", { method: "PUT", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) })); }
    const input = { enabled: true, mode: "online", local: { url: "http://localhost:8000", clearKey: true }, online: { url: "https://video.example.com", apiKey: "private-upload-key" } };
    route.fixture.admin = false; assert.equal((await route.GET()).status, 403); assert.equal((await put(input)).status, 403);
    route.fixture.admin = true; assert.equal((await put(input, "https://evil.test")).status, 403);
    assert.equal((await put({ ...input, online: { url: "http://video.example.com" } })).status, 400);
    assert.equal((await put(input)).status, 200);
    assert.notEqual(route.fixture.saved.online.encryptedKey, input.online.apiKey);
    const encrypted = route.fixture.saved.online.encryptedKey;
    const read = await route.GET(); const data = await read.json(); assert.equal(read.headers.get("cache-control"), "no-store, private"); assert.equal(data.online.hasKey, true); assert.equal(JSON.stringify(data).includes("private-upload-key"), false); assert.equal(JSON.stringify(data).includes(encrypted), false);
    const blank = { ...input, online: { url: input.online.url, apiKey: "" } };
    assert.equal((await put(blank)).status, 200); assert.equal(route.fixture.saved.online.encryptedKey, encrypted);
    assert.equal((await put({ ...blank, online: { url: "https://another.example.com" } })).status, 409);
    route.fixture.saved.online.encryptedKey = "unreadable";
    assert.equal((await route.GET()).status, 200); assert.equal((await (await route.GET()).json()).online.requiresKey, true);
    assert.equal((await put(blank)).status, 409);
    assert.equal((await put({ ...blank, online: { url: input.online.url, clearKey: true } })).status, 200); assert.equal(route.fixture.saved.online.encryptedKey, "");
    assert.equal((await put({ ...input, enabled: false })).status, 200); assert.equal(route.fixture.saved.enabled, false);
  } finally { if (previous === undefined) delete process.env.NEXTAUTH_SECRET; else process.env.NEXTAUTH_SECRET = previous; await rm(folder, { recursive: true, force: true }); }
});
