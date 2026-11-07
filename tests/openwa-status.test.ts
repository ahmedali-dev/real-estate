import assert from "node:assert/strict";
import { test } from "node:test";
import { openwaPairingStatus } from "../lib/openwa-status";

test("pairing status exposes QR only while disconnected, without raw diagnostics", () => {
  assert.deepEqual(openwaPairingStatus({ connected: false, qr: "pairing-value", license: "secret", session: { ready: false }, host: { private: true } }), { connected: false, qr: "pairing-value", issue: null });
  assert.deepEqual(openwaPairingStatus({ connected: true, session: { ready: true }, qr: "stale-code" }), { connected: true, qr: null, issue: null });
});

test("HTTP liveness alone is not session readiness; invalid and oversized QR data is dropped", () => {
  assert.deepEqual(openwaPairingStatus({ connected: true, session: { ready: false } }), { connected: false, qr: null, issue: null });
  for (const value of [null, {}, { qr: { url: "https://evil.example" } }, { qr: "a".repeat(8193) }]) {
    assert.deepEqual(openwaPairingStatus(value), { connected: false, qr: null, issue: null });
  }
});


test("invalid licenses and blocked startup show actionable states and hide stale QR", () => {
  assert.deepEqual(openwaPairingStatus({ connected: false, session: { status: "blocked" }, license: { status: "invalid", key: "secret" }, qr: "old" }), { connected: false, qr: null, issue: "licenseInvalid" });
  assert.deepEqual(openwaPairingStatus({ session: { status: "blocked" } }), { connected: false, qr: null, issue: "blocked" });
});

test("ngrok gateway probes retain authentication, request JSON and distinguish missing gateway",async()=>{
 const {probeOpenwaConnection}=await import('../lib/openwa-status');
 const config={url:'https://office.ngrok-free.dev',key:'private-test-key'};
 const good=await probeOpenwaConnection(config,async(url,options)=>{
  assert.equal(url,config.url+'/office/connection');
  const headers=new Headers(options?.headers);assert.equal(headers.get('ngrok-skip-browser-warning'),'1');assert.equal(headers.get('X-API-Key'),config.key);assert.equal(headers.get('Accept'),'application/json');assert.equal(options?.redirect,'error');
  return Response.json({connected:true});
 });assert.deepEqual(good,{connected:true,issue:null});
 assert.deepEqual(await probeOpenwaConnection(config,async()=>new Response('Not found',{status:404})),{connected:false,issue:'gatewayMissing'});
});
test("HTML interstitials, authentication failures and unavailable gateways never imply connected",async()=>{
 const {probeOpenwaConnection,openwaAccountAvailable}=await import('../lib/openwa-status');
 const config={url:'https://office.ngrok-free.dev',key:'key'};
 for(const status of [401,403])assert.deepEqual(await probeOpenwaConnection(config,async()=>new Response('',{status})),{connected:false,issue:'authError'});
 assert.deepEqual(await probeOpenwaConnection(config,async()=>new Response('<html>Visit Site</html>',{headers:{'Content-Type':'text/html'}})),{connected:false,issue:'tunnelPage'});
 assert.deepEqual(await probeOpenwaConnection(config,async()=>{throw new Error('timeout');}),{connected:false,issue:'offline'});
 assert.equal(await openwaAccountAvailable(config,async()=>new Response('',{status:404})),false);
 assert.deepEqual(await probeOpenwaConnection(config,async()=>Response.json({connected:false})),{connected:false,issue:null});
});
