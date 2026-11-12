import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { createSHA256 } from "hash-wasm";
import { localVideoEnabled, signVideo, readVideo, validVideoReceipt } from "../lib/local-video";
import { propertyInputSchema } from "../lib/validations/property";

test("video upload is disabled on public hosts and in production", () => {
  for (const url of ["http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000"]) assert.equal(localVideoEnabled(url, "development"), true);
  for (const url of ["https://www.41real-estate.site", "https://localhost.evil.test", "not a url"]) assert.equal(localVideoEnabled(url, "development"), false);
  assert.equal(localVideoEnabled("http://localhost:3000", "production"), false);
});

test("only signed completion receipts can be saved with listings", () => {
  const previous = process.env.NEXTAUTH_SECRET; process.env.NEXTAUTH_SECRET = "video-test-secret";
  try {
    const receipt = signVideo({ kind: "complete", storedAs: "video-id.mp4", filename: "home.mp4", size: 123 });
    assert.equal(validVideoReceipt(receipt), true);
    assert.equal(readVideo(receipt).filename, "home.mp4");
    assert.equal(validVideoReceipt(receipt + "x"), false);
    assert.equal(validVideoReceipt(signVideo({ kind: "upload", id: "a".repeat(32) })), false);
    const base = { title: "Test home", category: "apartment", listingType: "sale", description: "A test property description" };
    assert.equal(propertyInputSchema.safeParse({ ...base, localVideo: receipt }).success, true);
    assert.equal(propertyInputSchema.safeParse({ ...base, localVideo: "fake" }).success, false);
    assert.equal(propertyInputSchema.safeParse({ ...base, localVideo: null }).success, true);
    assert.equal(propertyInputSchema.safeParse(base).success, true);
  } finally { if (previous === undefined) delete process.env.NEXTAUTH_SECRET; else process.env.NEXTAUTH_SECRET = previous; }
});

test("incremental video hashing matches SHA256 without whole-file buffering", async () => {
  const hash = await createSHA256(); hash.init();
  for (const chunk of ["video", " chunk", " content"]) hash.update(chunk);
  assert.equal(hash.digest("hex"), createHash("sha256").update("video chunk content").digest("hex"));
});
