import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('connection gateway serves authenticated requests while OpenWA awaits QR pairing', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'office-gateway-'));
  const source = (await readFile(new URL('../services/openwa/server.mjs', import.meta.url), 'utf8'))
    .replace("import { getCliOutputSink, setCliOutputSink, startCli, parseCliArgs } from '@open-wa/wa-automate';", 'const sink = { write() {}, status() {}, qr() {} }; const getCliOutputSink = () => sink; const setCliOutputSink = value => Object.assign(sink, value); const parseCliArgs = value => value; const startCli = () => { sink.qr({ qr: "pairing-test" }); return new Promise(() => {}); };');
  const file = path.join(folder, 'server.mjs');
  await writeFile(file, source);
  const child = spawn(process.execPath, [file, '--port', '19080'], { env: { ...process.env, OPENWA_API_KEY: 'test-key' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let childStderr = '';
  child.stderr.on('data', chunk => { childStderr += chunk; });
  try {
    await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(() => { throw new Error(`Gateway exited before startup: ${childStderr}`); }), new Promise((_, reject) => setTimeout(() => reject(new Error('Startup timeout')), 5000).unref())]);
    const denied = await fetch('http://127.0.0.1:19080/office/connection');
    assert.equal(denied.status, 401);
    const result = await fetch('http://127.0.0.1:19080/office/connection', { headers: { 'X-API-Key': 'test-key' } });
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { connected: false, qr: 'pairing-test' });
    assert.equal(result.headers.get('cache-control'), 'no-store');
  } finally { if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; } await rm(folder, { recursive: true, force: true }); }
});
