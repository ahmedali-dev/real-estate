import assert from "node:assert/strict";
import { test } from "node:test";
import { whatsappRecipient } from "../lib/property-share";
import { propertyTextMessage, propertyVideoCaption, sendOpenwa, sendPropertyOpenwa, sendPropertyVideoOpenwa, openwaConfig, OpenwaSendError } from "../lib/openwa";
import type { PropertyDTO } from "../types/property";

const property: PropertyDTO = {
  _id: "abc", title: "Apartment 12", description: "", category: "apartment", listingType: "rent",
  price: 2500, rentalPeriod: "monthly", status: "available", visibility: "public",
  location: { mapUrl: "https://maps.app.goo.gl/example" }, units: [], images: [], createdAt: "", updatedAt: "",
  owner: { name: "Private owner", phone: "private" }, tenant: { name: "Private tenant" },
};
const config = { url: "https://wa.example", key: "test-key" };

test("professional message includes description, TikTok and selected-language labels", () => {
  const listing = { ...property, description: "Spacious apartment with a balcony.", tiktokUrl: "https://www.tiktok.com/@office/video/123" };
  const en = propertyTextMessage(listing, "https://example.com", "en");
  const ar = propertyTextMessage(listing, "https://example.com", "ar");
  assert.match(en, /\*Description\*/);
  assert.match(ar, /\*الوصف\*/);
  for (const message of [en, ar]) {
    assert.match(message, /Spacious apartment with a balcony/);
    assert.match(message, /tiktok.com\/@office\/video\/123/);
    assert.doesNotMatch(message, /Private|private/);
  }
});

test("property send uses text only even when the listing has images", async () => {
  const listing = { ...property, description: "Long description ".repeat(100), images: ["https://res.cloudinary.com/office/image/upload/photo.png"] };
  let calls = 0;
  await sendPropertyOpenwa(config, "966501234567@c.us", listing, "https://example.com", "ar", async (url, options) => {
    if (String(url).endsWith("/office/connection")) return Response.json({ connected: true });
    calls++;
    assert.equal(url, "https://wa.example/api/messages/sendText");
    assert.deepEqual(JSON.parse(options?.body as string), { to: "966501234567@c.us", content: propertyTextMessage(listing, "https://example.com", "ar") });
    return Response.json({ data: "false_966501234567@c.us_text" });
  });
  assert.equal(calls, 1);
});

test("uploaded property videos use OpenWA sendFile with a private-data-free caption", async () => {
  const listing = { ...property, description: "Secret long description", tiktokUrl: "https://tiktok.com/video/1" };
  let calls = 0;
  await sendPropertyVideoOpenwa(config, "966501234567@c.us", listing, "https://example.com", "en", "https://example.com/api/property-video/signed-token", "home.mp4", async (url, options) => {
    if (String(url).endsWith("/office/connection")) return Response.json({ connected: true });
    calls++;
    assert.equal(url, "https://wa.example/api/messages/sendFile");
    assert.deepEqual(JSON.parse(options?.body as string), { to: "966501234567@c.us", file: "https://example.com/api/property-video/signed-token", filename: "home.mp4", options: { type: "video", caption: propertyVideoCaption(listing, "https://example.com", "en") } });
    return Response.json({ success: true, data: "false_966501234567@c.us_media" });
  });
  assert.equal(calls, 1);
  assert.doesNotMatch(propertyVideoCaption(listing, "https://example.com", "en"), /Secret|Private|tiktok/);
});

test("license failures return an actionable code without exposing provider details", async () => {
  await assert.rejects(sendOpenwa(config, "966501234567@c.us", propertyTextMessage(property, "https://example.com", "en"), async (url) => String(url).endsWith("/office/connection") ? Response.json({ connected: true }) : Response.json({ error: "An Insiders license is required" }, { status: 403 })), (error: unknown) => error instanceof OpenwaSendError && error.code === "openwaLicense");
});

test("recipient requires international digits and rejects groups or arbitrary chat IDs", () => {
  assert.equal(whatsappRecipient("+966 50-123-4567"), "966501234567@c.us");
  for (const phone of ["0501234567", "group@g.us", "123", "966501234567@c.us", "https://example.com"]) assert.equal(whatsappRecipient(phone), null);
});

test("free text includes public listing, location and price, omitting private details", () => {
  const message = propertyTextMessage(property, "https://example.com", "en");
  assert.match(message, /View property:\nhttps:\/\/example.com\/properties\/abc/);
  assert.match(message, /Open location:\nhttps:\/\/maps.app.goo.gl\/example/);
  assert.match(message, /2,500 SAR/);
  assert.doesNotMatch(message, /Private|private/);
  assert.doesNotMatch(propertyTextMessage({ ...property, location: undefined }, "https://example.com", "en"), /Open location/);
  assert.match(propertyTextMessage({ ...property, price: undefined }, "https://example.com", "ar"), /السعر/);
});

test("HTTP transport uses documented endpoint, authentication and data envelope", async () => {
  const content = propertyTextMessage(property, "https://example.com", "en");
  const mock: typeof fetch = async (url, options) => {
    if (String(url).endsWith("/office/connection")) return Response.json({ connected: true });
    assert.equal(url, "https://wa.example/api/messages/sendText");
    assert.equal((options?.headers as Record<string, string>)["X-API-Key"], "test-key");
    assert.equal(options?.redirect, "error");
    assert.deepEqual(JSON.parse(options?.body as string), { to: "966501234567@c.us", content });
    return Response.json({ success: true, data: "false_966501234567@c.us_id" });
  };
  assert.equal(await sendOpenwa(config, "966501234567@c.us", content, mock), "false_966501234567@c.us_id");
});

test("failed and ambiguous sends are not retried or reported successful", async () => {
  const content = propertyTextMessage(property, "https://example.com", "en");
  for (const response of [Response.json({ error: "license" }, { status: 403 }), Response.json({ success: false }), Response.json({ data: false }), Response.json({ data: "Not a contact" })]) {
    let calls = 0;
    await assert.rejects(sendOpenwa(config, "966501234567@c.us", content, async (url) => { if (String(url).endsWith("/office/connection")) return Response.json({ connected: true }); calls++; return response; }));
    assert.equal(calls, 1);
  }
});

test("configuration requires a key and HTTPS except loopback development", () => {
  const oldUrl = process.env.OPENWA_API_URL, oldKey = process.env.OPENWA_API_KEY;
  try {
    process.env.OPENWA_API_KEY = "test";
    process.env.OPENWA_API_URL = "http://remote.example";
    assert.equal(openwaConfig(), null);
    process.env.OPENWA_API_URL = "http://127.0.0.1:8080";
    assert.equal(openwaConfig()?.url, "http://127.0.0.1:8080");
    delete process.env.OPENWA_API_KEY;
    assert.equal(openwaConfig(), null);
  } finally {
    if (oldUrl === undefined) delete process.env.OPENWA_API_URL; else process.env.OPENWA_API_URL = oldUrl;
    if (oldKey === undefined) delete process.env.OPENWA_API_KEY; else process.env.OPENWA_API_KEY = oldKey;
  }
});



test("logged out runtime prevents submission even if service readiness is stale", async () => {
  let submissions = 0;
  await assert.rejects(sendOpenwa(config, "966501234567@c.us", "Test", async (url) => {
    if (String(url).endsWith("/office/connection")) return Response.json({ success: false, error: "Logged out" });
    submissions++;
    return Response.json({ data: "false_966501234567@c.us_id" });
  }), (error: unknown) => error instanceof OpenwaSendError && error.code === "openwaNotReady");
  assert.equal(submissions, 0);
});
