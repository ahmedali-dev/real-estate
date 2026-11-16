import assert from "node:assert/strict";
import { test } from "node:test";
import { forwardedVideoHeaders, getVideoMetadata, WHATSAPP_VIDEO_MAX_BYTES } from "../lib/video-delivery";

test("video metadata checks identifier, filename, MIME type and size", async () => {
  const config = { url: "https://video.example", key: "secret" };
  const valid = await getVideoMetadata(config, "a".repeat(32), async (url, options) => {
    assert.equal(url, `${config.url}/videos/${"a".repeat(32)}`);
    assert.equal(new Headers(options?.headers).get("X-API-Key"), config.key);
    return Response.json({ filename: "home.mp4", size: 2048, content_type: "video/mp4", sha256: "a".repeat(64) });
  });
  assert.deepEqual(valid, { uploadId: "a".repeat(32), filename: "home.mp4", size: 2048, contentType: "video/mp4" });
  assert.equal(WHATSAPP_VIDEO_MAX_BYTES, 64 * 1024 * 1024);
  for (const data of [
    { filename: "../secrets.mp4", size: 2, content_type: "video/mp4" },
    { filename: "home.mp4", size: -1, content_type: "video/mp4" },
    { filename: "home.webm", size: 2, content_type: "video/webm" },
  ]) assert.equal(await getVideoMetadata(config, "a".repeat(32), async () => Response.json(data)), null);
  assert.equal(await getVideoMetadata(config, "not-an-id", async () => { throw new Error("must not fetch"); }), null);
});

test("video proxy headers preserve ranges and use a safe download name", () => {
  const result = new Response(null, { status: 206, headers: { "Content-Type": "video/mp4", "Content-Length": "12", "Content-Range": "bytes 0-11/24", "Accept-Ranges": "bytes" } });
  const headers = forwardedVideoHeaders(result, "attachment", "estate tour.mp4");
  assert.equal(headers.get("Content-Type"), "video/mp4");
  assert.equal(headers.get("Content-Range"), "bytes 0-11/24");
  assert.match(headers.get("Content-Disposition") || "", /filename\*=UTF-8''estate%20tour.mp4/);
  assert.equal(headers.get("Cache-Control"), "private, no-store");
});
