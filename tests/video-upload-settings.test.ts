import { test } from "node:test";
import assert from "node:assert/strict";
import { videoSettingsSchema, videoServerUrl } from "../lib/video-upload-config";
import { resolveVideoSettings, encryptVideoKey, type VideoSettings } from "../lib/video-upload-settings";

test("local and online video profiles enforce their URL schemes", () => {
  assert.equal(videoServerUrl("http://127.0.0.1:8000", "local"), true);
  assert.equal(videoServerUrl("http://[::1]:8000", "local"), true);
  for (const value of ["http://192.168.1.200:8000", "http://10.0.0.2:8000", "https://172.16.0.2:8000", "http://172.31.255.254:8000"]) assert.equal(videoServerUrl(value, "local"), true);
  for (const value of ["http://172.15.0.2:8000", "http://172.32.0.2:8000", "http://192.169.1.200:8000", "http://8.8.8.8:8000", "http://169.254.169.254", "http://192.168.1.200.evil.test", "http://192.168.999.1", "http://user:key@192.168.1.200:8000"]) assert.equal(videoServerUrl(value, "local"), false);
  assert.equal(videoSettingsSchema.safeParse({ enabled: true, mode: "local", local: { url: "http://192.168.1.200:8000" }, online: { url: "" } }).success, true);
  for (const value of ["http://example.com", "https://example.com", "file:///tmp/video"]) assert.equal(videoServerUrl(value, "local"), false);
  assert.equal(videoServerUrl("https://videos.example.com/api", "online"), true);
  for (const value of ["http://videos.example.com", "https://localhost", "https://user:key@videos.example.com", "https://example.com?key=private", "https://example.com#key"]) assert.equal(videoServerUrl(value, "online"), false);
  const base = { enabled: true, mode: "online", local: { url: "http://localhost:8000" }, online: { url: "" } };
  assert.equal(videoSettingsSchema.safeParse(base).success, false);
  assert.equal(videoSettingsSchema.safeParse({ ...base, enabled: false }).success, true);
  assert.equal(videoSettingsSchema.safeParse({ ...base, online: { url: "https://videos.example.com", apiKey: "key", clearKey: true } }).success, false);
});

test("saved online mode enables deployed uploads; disabled/local modes fail closed", () => {
  const previous = process.env.NEXTAUTH_SECRET; process.env.NEXTAUTH_SECRET = "video-profile-test";
  try {
    const settings: VideoSettings = { enabled: true, mode: "online", local: { url: "http://localhost:8000", encryptedKey: "" }, online: { url: "https://videos.example.com", encryptedKey: encryptVideoKey("service-key") } };
    assert.equal(settings.online.encryptedKey.includes("service-key"), false);
    assert.deepEqual(resolveVideoSettings(settings, "https://www.41real-estate.site"), { url: "https://videos.example.com", key: "service-key", mode: "online" });
    assert.equal(resolveVideoSettings({ ...settings, enabled: false }, "https://www.41real-estate.site"), null);
    assert.equal(resolveVideoSettings({ ...settings, mode: "local" }, "https://www.41real-estate.site"), null);
    assert.throws(() => resolveVideoSettings({ ...settings, online: { ...settings.online, encryptedKey: "broken" } }, "https://www.41real-estate.site"));
    assert.throws(() => resolveVideoSettings({ ...settings, online: { ...settings.online, url: "http://localhost:8000" } }, "https://www.41real-estate.site"));
    assert.equal(resolveVideoSettings({ ...settings, online: { ...settings.online, encryptedKey: "" } }, "https://www.41real-estate.site")?.key, "");
  } finally { if (previous === undefined) delete process.env.NEXTAUTH_SECRET; else process.env.NEXTAUTH_SECRET = previous; }
});
