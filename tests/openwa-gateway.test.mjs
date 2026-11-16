import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openwaConnectionSnapshot } from '../services/openwa/connection-state.mjs';

test('the connection gateway reports ready only after OpenWA finishes login and startup', () => {
  assert.deepEqual(openwaConnectionSnapshot({ client: { getState: () => 'READY' } }), { connected: true, state: 'READY' });
  for (const state of ['AUTHENTICATING', 'PAIRING', 'DISCONNECTED', 'STOPPED', 'STARTING']) {
    assert.deepEqual(openwaConnectionSnapshot({ client: { getState: () => state } }), { connected: false, state });
  }
  assert.deepEqual(openwaConnectionSnapshot(null), { connected: false, state: 'DISCONNECTED' });
  assert.deepEqual(openwaConnectionSnapshot({ client: { getState: () => { throw new Error('not ready'); } } }), { connected: false, state: 'DISCONNECTED' });
});
