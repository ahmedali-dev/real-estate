import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireSession";
import { VIDEO_MODES, videoSettingsSchema } from "@/lib/video-upload-config";
import { savedVideoSettings, defaultVideoSettings, videoSettingsCollection, readableVideoKey, encryptVideoKey, resolvedVideoUploadConfig, type VideoSettings } from "@/lib/video-upload-settings";
const headers = { "Cache-Control": "no-store, private", Vary: "Cookie" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
export async function GET() {
  const { response } = await requireAdmin(); if (response) return response;
  try {
    const saved = await savedVideoSettings(); const settings = saved || defaultVideoSettings();
    const profiles = Object.fromEntries(VIDEO_MODES.map(mode => [mode, { url: settings[mode].url, hasKey: saved ? Boolean(settings[mode].encryptedKey) : mode === "local" && Boolean(process.env.VIDEO_UPLOAD_API_KEY), requiresKey: !readableVideoKey(settings[mode]) }]));
    return json({ enabled: settings.enabled, mode: settings.mode, ...profiles, source: saved ? "database" : "environment" });
  } catch { return json({ error: "Could not load video settings." }, 500); }
}
export async function PUT(req: NextRequest) {
  const { response } = await requireAdmin(); if (response) return response;
  if (req.headers.get("origin") !== req.nextUrl.origin) return json({ error: "Forbidden." }, 403);
  try {
    const parsed = videoSettingsSchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.issues.map(issue => issue.message).join(" ") }, 400);
    const saved = await savedVideoSettings(); const old = saved || defaultVideoSettings();
    const input = parsed.data; const settings: VideoSettings = { enabled: input.enabled, mode: input.mode, local: { url: "", encryptedKey: "" }, online: { url: "", encryptedKey: "" } };
    for (const mode of VIDEO_MODES) {
      const profile = input[mode]; const previous = old[mode];
      const oldHasKey = Boolean(previous.encryptedKey || (!saved && mode === "local" && process.env.VIDEO_UPLOAD_API_KEY));
      const changedHost = profile.url && previous.url && new URL(profile.url).origin !== new URL(previous.url).origin;
      if (oldHasKey && !profile.apiKey && !profile.clearKey && (changedHost || !readableVideoKey(previous))) return json({ error: "Re-enter the API key when changing server host or repairing an unreadable saved key. Choose No API key to remove it explicitly." }, 409);
      const key = profile.clearKey ? "" : profile.apiKey || (!saved && mode === "local" ? process.env.VIDEO_UPLOAD_API_KEY || "" : "");
      settings[mode] = { url: profile.url.replace(/\/$/, ""), encryptedKey: profile.clearKey ? "" : key ? encryptVideoKey(key) : previous.encryptedKey };
    }
    await (await videoSettingsCollection()).updateOne({ _id: "video-upload" }, { $set: { ...settings, updatedAt: new Date() } }, { upsert: true });
    return json({ success: true });
  } catch { return json({ error: "Could not save video settings. Check the database and NEXTAUTH_SECRET." }, 500); }
}
export async function POST(req: NextRequest) {
  const { response } = await requireAdmin(); if (response) return response;
  if (req.headers.get("origin") !== req.nextUrl.origin) return json({ error: "Forbidden." }, 403);
  try {
    const config = await resolvedVideoUploadConfig(req.url);
    if (!config) return json({ error: "Uploads are disabled for this site or mode. Save settings and use localhost for local mode." }, 409);
    const result = await fetch(`${config.url}/health`, { headers: { Accept: "application/json", "X-API-Key": config.key, "ngrok-skip-browser-warning": "1" }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6000) });
    if (!result.ok || !result.headers.get("content-type")?.includes("json")) return json({ error: "The video server did not return a successful JSON health response. Check the URL and service." }, 502);
    return json({ success: true });
  } catch { return json({ error: "Cannot reach the video server or read its saved key. Check the configuration." }, 502); }
}
