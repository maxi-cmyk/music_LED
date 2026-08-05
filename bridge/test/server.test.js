const test = require('node:test');
const assert = require('node:assert/strict');
const { createBridgeServer, isLoopbackAddress } = require('../src/server');
const { TelemetryStore } = require('../src/telemetry-store');

async function startServer(options) {
  const server = createBridgeServer(options);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

test('reports healthy without exposing Spotify credentials', async (t) => {
  const { server, baseUrl } = await startServer({ getPlayback: async () => ({ title: 'Secret Song' }) });
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test('serves display-ready playback only to a request with the bridge key', async (t) => {
  const expected = { available: true, title: 'Song', artist: 'Artist', progressMs: 100, durationMs: 200, isPlaying: true };
  const { server, baseUrl } = await startServer({ bridgeKey: 'local-key', getPlayback: async () => expected });
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/now-playing`, { headers: { 'X-Bridge-Key': 'local-key' } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), expected);
});

test('rejects an unauthenticated playback request', async (t) => {
  const { server, baseUrl } = await startServer({ bridgeKey: 'local-key', getPlayback: async () => ({}) });
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/now-playing`);
  assert.equal(response.status, 401);
});

test('rejects routes other than the health and display endpoints', async (t) => {
  const { server, baseUrl } = await startServer({ getPlayback: async () => ({}) });
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/tokens`);
  assert.equal(response.status, 404);
});

test('recognises only loopback addresses as local dashboard clients', () => {
  assert.equal(isLoopbackAddress('127.0.0.1'), true);
  assert.equal(isLoopbackAddress('::1'), true);
  assert.equal(isLoopbackAddress('::ffff:127.0.0.1'), true);
  assert.equal(isLoopbackAddress('192.168.50.6'), false);
});

test('reads and updates display settings through the local-only API', async (t) => {
  let config = { beatSensitivity: 1 };
  const configStore = {
    get: () => config,
    update: (values) => (config = { ...config, ...values }),
  };
  const { server, baseUrl } = await startServer({ getPlayback: async () => ({}), configStore });
  t.after(() => server.close());

  const initial = await fetch(`${baseUrl}/api/config`);
  assert.deepEqual(await initial.json(), { beatSensitivity: 1 });
  const updated = await fetch(`${baseUrl}/api/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ beatSensitivity: 1.4 }),
  });
  assert.deepEqual(await updated.json(), { beatSensitivity: 1.4 });
});

test('accepts authenticated ESP32 telemetry and exposes it locally', async (t) => {
  const telemetryStore = new TelemetryStore();
  const { server, baseUrl } = await startServer({
    bridgeKey: 'local-key',
    getPlayback: async () => ({}),
    telemetryStore,
  });
  t.after(() => server.close());

  const rejected = await fetch(`${baseUrl}/api/telemetry`, {
    method: 'POST',
    body: JSON.stringify({ bpm: 120 }),
  });
  assert.equal(rejected.status, 401);

  const accepted = await fetch(`${baseUrl}/api/telemetry`, {
    method: 'POST',
    headers: { 'X-Bridge-Key': 'local-key', 'Content-Type': 'application/json' },
    body: JSON.stringify({ bpm: 120, beatConfidence: 87 }),
  });
  assert.equal(accepted.status, 202);
  const telemetry = await fetch(`${baseUrl}/api/telemetry`);
  assert.equal((await telemetry.json()).bpm, 120);
});

test('serves local scenes, RGB tests, calibration, and system health', async (t) => {
  let config = { beatSensitivity: 1 };
  const configStore = {
    get: () => config,
    update: (values) => (config = { ...config, ...values }),
  };
  const scene = { id: 'club', config: { beatSensitivity: 1.5 } };
  const sceneStore = {
    list: () => [scene],
    find: (id) => id === scene.id ? scene : null,
    save: (name, values) => ({ id: 'custom', name, config: values }),
    remove: () => true,
  };
  const rgbTestStore = {
    start: (mode) => ({ mode, remainingMs: 10_000 }),
    stop: () => ({ mode: 'off', remainingMs: 0 }),
  };
  const { server, baseUrl } = await startServer({
    getPlayback: async () => ({}), configStore, sceneStore, rgbTestStore,
    calibrate: () => ({ beatSensitivity: 1.25 }),
    getSystemHealth: () => ({ bridgeUptimeMs: 1234 }),
  });
  t.after(() => server.close());

  assert.equal((await (await fetch(`${baseUrl}/api/scenes`)).json())[0].id, 'club');
  const applied = await fetch(`${baseUrl}/api/scenes/club/apply`, { method: 'POST' });
  assert.equal((await applied.json()).beatSensitivity, 1.5);
  const tested = await fetch(`${baseUrl}/api/rgb-test`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'blue' }),
  });
  assert.equal((await tested.json()).mode, 'blue');
  const calibrated = await fetch(`${baseUrl}/api/calibrate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ samples: [] }),
  });
  assert.equal((await calibrated.json()).beatSensitivity, 1.25);
  assert.deepEqual(await (await fetch(`${baseUrl}/api/system`)).json(), { bridgeUptimeMs: 1234 });
});
