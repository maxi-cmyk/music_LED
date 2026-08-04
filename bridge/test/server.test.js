const test = require('node:test');
const assert = require('node:assert/strict');
const { createBridgeServer } = require('../src/server');

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
