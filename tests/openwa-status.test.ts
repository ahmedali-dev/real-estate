import assert from "node:assert/strict";
import { test } from "node:test";
import { openwaHealthIssue } from "../lib/openwa-status";

test("health diagnostics expose only supported startup issues, never the QR or raw details", () => {
  assert.equal(openwaHealthIssue({ qr: "secret-qr", license: { status: "invalid", key: "secret" } }), "licenseInvalid");
  assert.equal(openwaHealthIssue({ qr: "secret-qr", session: { status: "blocked", detail: "private" } }), "blocked");
  assert.equal(openwaHealthIssue({ connected: false, qr: "pairing-value", session: { ready: false } }), null);
  assert.equal(openwaHealthIssue(null), null);
});

test("ngrok gateway probe checks only the authenticated live connection state", async () => {
  const { probeOpenwaConnection } = await import("../lib/openwa-status");
  const config = { url: "https://office.ngrok-free.dev", key: "private-test-key" };
  const ready = await probeOpenwaConnection(config, async (url, options) => {
    assert.equal(url, `${config.url}/office/connection`);
    const headers = new Headers(options?.headers);
    assert.equal(headers.get("ngrok-skip-browser-warning"), "1");
    assert.equal(headers.get("X-API-Key"), config.key);
    assert.equal(headers.get("Accept"), "application/json");
    assert.equal(options?.redirect, "error");
    return Response.json({ connected: true, state: "READY", qr: "must-not-be-used" });
  });
  assert.deepEqual(ready, { connected: true, issue: null });
  assert.deepEqual(await probeOpenwaConnection(config, async () => Response.json({ connected: false, state: "AUTHENTICATING" })), { connected: false, issue: null });
  assert.deepEqual(await probeOpenwaConnection(config, async () => new Response("Not found", { status: 404 })), { connected: false, issue: "gatewayMissing" });
});

test("HTML interstitials, authentication failures and unavailable gateways never imply connected", async () => {
  const { probeOpenwaConnection, openwaAccountAvailable } = await import("../lib/openwa-status");
  const config = { url: "https://office.ngrok-free.dev", key: "key" };
  for (const status of [401, 403]) assert.deepEqual(await probeOpenwaConnection(config, async () => new Response("", { status })), { connected: false, issue: "authError" });
  assert.deepEqual(await probeOpenwaConnection(config, async () => new Response("<html>Visit Site</html>", { headers: { "Content-Type": "text/html" } })), { connected: false, issue: "tunnelPage" });
  assert.deepEqual(await probeOpenwaConnection(config, async () => { throw new Error("timeout"); }), { connected: false, issue: "offline" });
  assert.equal(await openwaAccountAvailable(config, async () => new Response("", { status: 404 })), false);
});
