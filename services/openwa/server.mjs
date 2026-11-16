import http from 'node:http';
import { startCli, parseCliArgs } from '@open-wa/wa-automate';
import { openwaConnectionSnapshot } from './connection-state.mjs';

// Register the gateway before OpenWA waits for pairing. Its Hono router is
// finalized on the first request, so routes added after startup are unreliable.
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const publicPort = Number(portIndex >= 0 ? args[portIndex + 1] : 8080);
const upstreamPort = publicPort + 1;
if (portIndex >= 0) args[portIndex + 1] = String(upstreamPort);
else args.push('--port', String(upstreamPort));
const cliConfig = parseCliArgs(args);
// Keep terminal login visible even if a stale config or env-derived value
// tries to suppress the CLI's QR renderer.
cliConfig.cliOverrides.qrLogSkip = false;
let runtime;
const webhookStatus = { enabled: false, received: 0, forwarded: 0, ignored: 0, lastResult: null };
const gateway = http.createServer(async (request, response) => {
  // Protect every route, including health/QR data, before proxying upstream.
  if (!process.env.OPENWA_API_KEY || request.headers['x-api-key'] !== process.env.OPENWA_API_KEY) {
    response.writeHead(401, { 'Content-Type': 'application/json' }); response.end('{"error":"Unauthorized"}'); return;
  }
  if (request.url?.split('?')[0] === '/office/webhook-status') {
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'GET' || request.headers['x-api-key'] !== process.env.OPENWA_API_KEY) { response.writeHead(401); response.end('{}'); return; }
    response.end(JSON.stringify(webhookStatus)); return;
  }
  if (request.url?.split('?')[0] === '/office/connection') {
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'GET' || request.headers['x-api-key'] !== process.env.OPENWA_API_KEY) {
      response.writeHead(401); response.end(JSON.stringify({ connected: false })); return;
    }
    try {
      // Avoid inspecting WhatsApp Web's private DOM; use OpenWA's runtime state.
      response.end(JSON.stringify(openwaConnectionSnapshot(runtime)));
    } catch { response.end(JSON.stringify({ connected: false, state: 'DISCONNECTED' })); }
    return;
  }
  const upstream = http.request({ hostname: '127.0.0.1', port: upstreamPort, path: request.url, method: request.method, headers: request.headers }, result => {
    response.writeHead(result.statusCode || 502, result.headers);
    result.pipe(response);
  });
  upstream.on('error', () => { if (!response.headersSent) response.writeHead(503); response.end(); });
  request.pipe(upstream);
});
await new Promise((resolve, reject) => {
  gateway.once('error', reject);
  gateway.listen(publicPort, '127.0.0.1', resolve);
});
console.log(`Office connection gateway ready: http://127.0.0.1:${publicPort}. Point ngrok at this port; the internal API uses ${upstreamPort}.`);
console.log('WhatsApp login runs in this terminal. Scan its QR from WhatsApp → Linked devices when requested.');
console.log('OpenWA terminal QR output is enabled.');
let messagePoll;
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  gateway.close();
  clearInterval(messagePoll);
  if (runtime) { runtime.dispose(); await runtime.client.stop(); await runtime.server.stop(); }
  process.exit(0);
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
try {
  runtime = await startCli(cliConfig);
  let state = 'UNKNOWN';
  try { state = runtime.client.getState(); } catch { /* The dashboard continues polling until state is readable. */ }
  console.log(`WhatsApp runtime state: ${state}.`);
  if (state === 'READY') console.log('WhatsApp is already connected; no QR code is needed.');
  else if (['AUTHENTICATING', 'PAIRING', 'STARTING'].includes(state)) console.log('Waiting for WhatsApp login. Scan the QR in this terminal when it appears.');
  else console.error(`WhatsApp startup did not reach a login-ready state (${state}). Review the startup error above, then restart the service.`);
}
catch { console.error('OpenWA startup failed. Restart the service to try again.'); gateway.close(); process.exitCode = 1; }

if (runtime) {
  let runtimeState = 'DISCONNECTED';
  try { runtimeState = runtime.client.getState(); } catch { /* Keep the TikTok listener disabled if the client has closed. */ }
  if (runtimeState !== 'READY') {
    webhookStatus.lastResult = 'client_not_ready';
    console.error(`Incoming TikTok lookup is disabled because the WhatsApp client is ${runtimeState}.`);
  } else {
    const webhook = new URL(process.env.WHATSAPP_WEBHOOK_URL || 'http://127.0.0.1:3000/api/webhooks/whatsapp');
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(webhook.hostname);
    if ((webhook.protocol !== 'https:' && !(local && webhook.protocol === 'http:')) || webhook.username || webhook.password) throw new Error('Invalid WhatsApp webhook URL');
    const observed = new Set();
    const startedAt = Math.floor(Date.now() / 1000);
    async function handleIncoming(message) {
      const id = typeof message.id === 'string' ? message.id : message.id?._serialized;
      const from = typeof message.from === 'string' ? message.from : message.from?._serialized;
      webhookStatus.received++;
      const text = typeof message.body === 'string' ? message.body : typeof message.caption === 'string' ? message.caption : '';
      if (message.fromMe || message.id?.fromMe || !id || !from || !/https:\/\/[^\s]*tiktok\.com\//i.test(text)) { webhookStatus.ignored++; return; }
      if (observed.has(id)) return;
      observed.add(id);
      if (observed.size > 2000) observed.delete(observed.values().next().value);
      try {
        const response = await fetch(webhook.href, {
          method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.OPENWA_API_KEY },
          body: JSON.stringify({ messageId: id, from, text, fromMe: false }), signal: AbortSignal.timeout(55000),
        });
        const result = await response.json().catch(() => ({}));
        webhookStatus.forwarded++;
        webhookStatus.lastResult = result.sent ? 'sent' : result.duplicate ? 'duplicate' : result.ignored ? 'ignored' : result.matched === false ? 'not_found' : 'failed';
        console.log(`TikTok webhook: ${webhookStatus.lastResult} (HTTP ${response.status}).`);
        if (!response.ok) console.error('TikTok webhook could not confirm the reply; no automatic retry.');
      } catch { webhookStatus.lastResult = 'unreachable'; console.error('TikTok webhook unavailable; no automatic retry.'); }
    }
    let listenerAttached = false;
    try {
      runtime.client.onMessage(handleIncoming);
      listenerAttached = true;
    } catch (error) {
      webhookStatus.lastResult = 'listener_unavailable';
      const detail = error instanceof Error ? error.message : String(error);
      console.error(`Incoming TikTok lookup listener could not attach: ${detail}`);
    }
    if (listenerAttached) {
      // Some OpenWA versions do not deliver incoming runtime events reliably.
      // Read recent incoming models as a fallback; never replay pre-start messages.
      let polling = false;
      messagePoll = setInterval(async () => {
        if (polling || stopping) return;
        polling = true;
        try {
          const messages = await runtime.client.evaluate(since => {
            const store = window.Store || (typeof window.require === 'function' ? window.require('WAWebCollections') : null);
            const collection = store?.Msg;
            const models = collection?.getModelsArray?.() || collection?.models || collection?._models;
            if (!Array.isArray(models)) return [];
            return models.slice(-100).filter(message => !message.id?.fromMe && Number(message.t) >= since && typeof message.body === 'string' && /https:\/\/[^\s]*tiktok\.com\//i.test(message.body)).map(message => ({
              id: message.id?._serialized,
              from: message.from?._serialized || message.id?.remote?._serialized,
              body: message.body,
              fromMe: false,
            }));
          }, startedAt);
          for (const message of messages) await handleIncoming(message);
        } catch { webhookStatus.lastResult = 'poll_unavailable'; }
        finally { polling = false; }
      }, 3000);
      webhookStatus.enabled = true;
      console.log('Incoming TikTok property lookup enabled.');
    }
  }
}
