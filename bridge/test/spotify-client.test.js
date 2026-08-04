const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildAuthoriseUrl } = require('../src/spotify-client');
const { TokenStore } = require('../src/token-store');

test('builds an authorisation URL with display-read scope and state validation', () => {
  const url = new URL(buildAuthoriseUrl({
    clientId: 'client-id',
    redirectUri: 'http://127.0.0.1:3000/callback',
    state: 'unpredictable-state',
  }));

  assert.equal(url.origin, 'https://accounts.spotify.com');
  assert.equal(url.pathname, '/authorize');
  assert.equal(url.searchParams.get('client_id'), 'client-id');
  assert.equal(url.searchParams.get('redirect_uri'), 'http://127.0.0.1:3000/callback');
  assert.equal(url.searchParams.get('state'), 'unpredictable-state');
  assert.equal(url.searchParams.get('scope'), 'user-read-currently-playing');
  assert.equal(url.searchParams.get('response_type'), 'code');
});

test('exchanges the callback code using the configured redirect URI', async () => {
  const { exchangeCode } = require('../src/spotify-client');
  let received;
  const result = await exchangeCode({
    clientId: 'client-id',
    clientSecret: 'client-secret',
    redirectUri: 'http://127.0.0.1:3000/callback',
    code: 'authorisation-code',
    fetchImplementation: async (url, options) => {
      received = { url, options };
      return { ok: true, json: async () => ({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 }) };
    },
  });

  assert.equal(received.url, 'https://accounts.spotify.com/api/token');
  assert.match(received.options.body, /grant_type=authorization_code/);
  assert.match(received.options.body, /code=authorisation-code/);
  assert.deepEqual(result, { access_token: 'access', refresh_token: 'refresh', expires_in: 3600 });
});

test('refreshes an expired Spotify access token without reauthorising', async () => {
  const { refreshAccessToken } = require('../src/spotify-client');
  const result = await refreshAccessToken({
    clientId: 'client-id', clientSecret: 'client-secret', refreshToken: 'refresh-token',
    fetchImplementation: async (_url, options) => {
      assert.match(options.body, /grant_type=refresh_token/);
      return { ok: true, json: async () => ({ access_token: 'new-access', expires_in: 3600 }) };
    },
  });
  assert.equal(result.access_token, 'new-access');
});

test("treats Spotify's no-content playback response as nothing playing", async () => {
  const { fetchCurrentlyPlaying } = require('../src/spotify-client');
  const result = await fetchCurrentlyPlaying({
    accessToken: 'access-token',
    fetchImplementation: async (_url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer access-token');
      return { status: 204 };
    },
  });
  assert.equal(result, null);
});

test('persists Spotify tokens outside the public bridge response', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'spotify-oled-'));
  const tokenPath = path.join(directory, 'tokens.json');
  const store = new TokenStore(tokenPath);

  assert.equal(store.load(), null);
  store.save({ access_token: 'access', refresh_token: 'refresh', expires_at: 123 });
  assert.deepEqual(store.load(), { access_token: 'access', refresh_token: 'refresh', expires_at: 123 });
});
