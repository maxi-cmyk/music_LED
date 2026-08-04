const crypto = require('node:crypto');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { createBridgeServer } = require('./server');
const { TokenStore } = require('./token-store');
const { buildAuthoriseUrl, exchangeCode, refreshAccessToken, fetchCurrentlyPlaying } = require('./spotify-client');
const { normalizePlayback } = require('./normalize-playback');
const { renderAlbumArtBitmap } = require('./album-art');
const { loadEnv } = require('./load-env');
const { ConfigStore } = require('./config-store');
const { TelemetryStore } = require('./telemetry-store');

loadEnv(path.join(__dirname, '..', '.env'));

const open = promisify(execFile);
const port = Number(process.env.PORT || 3000);
const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `http://127.0.0.1:${port}/callback`;
const required = ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'MUSIC_LED_BRIDGE_KEY'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
}

const config = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  bridgeKey: process.env.MUSIC_LED_BRIDGE_KEY,
  redirectUri,
};
const tokens = new TokenStore(path.join(__dirname, '..', 'data', 'spotify-tokens.json'));
const displayConfig = new ConfigStore(path.join(__dirname, '..', 'data', 'display-config.json'));
const telemetry = new TelemetryStore();
let expectedState = null;

async function accessToken() {
  let current = tokens.load();
  if (!current) {
    throw new Error('Spotify is not linked. Visit http://127.0.0.1:3000/login on this Mac.');
  }
  if (Date.now() < current.expires_at - 60_000) {
    return current.access_token;
  }
  const refreshed = await refreshAccessToken({ ...config, refreshToken: current.refresh_token });
  current = {
    ...current,
    ...refreshed,
    refresh_token: refreshed.refresh_token || current.refresh_token,
    expires_at: Date.now() + refreshed.expires_in * 1000,
  };
  tokens.save(current);
  return current.access_token;
}

async function getPlayback() {
  const playback = await fetchCurrentlyPlaying({ accessToken: await accessToken() });
  const images = playback?.item?.album?.images || [];
  const artworkUrl = images.at(-1)?.url || images[0]?.url;
  const albumArt = await renderAlbumArtBitmap(artworkUrl);
  return { ...normalizePlayback(playback, undefined, albumArt), visualConfig: displayConfig.get() };
}

const server = createBridgeServer({
  bridgeKey: config.bridgeKey,
  getPlayback,
  configStore: displayConfig,
  telemetryStore: telemetry,
  frontendRoot: path.join(__dirname, '..', 'frontend'),
  onLogin: async () => {
    expectedState = crypto.randomBytes(24).toString('hex');
    return buildAuthoriseUrl({ ...config, state: expectedState });
  },
  onCallback: async ({ code, state, error }) => {
    if (error) throw new Error(`Spotify authorisation failed: ${error}`);
    if (!code || !state || state !== expectedState) throw new Error('Invalid Spotify callback state. Start again at /login.');
    const result = await exchangeCode({ ...config, code });
    if (!result.refresh_token) throw new Error('Spotify did not provide a refresh token. Revoke this app and authorise it again.');
    tokens.save({ ...result, expires_at: Date.now() + result.expires_in * 1000 });
    expectedState = null;
  },
});

server.listen(port, '0.0.0.0', async () => {
  const loginUrl = `http://127.0.0.1:${port}/login`;
  console.log(`Spotify OLED bridge listening on port ${port}.`);
  console.log(`Local control deck: http://127.0.0.1:${port}/`);
  console.log(`Open ${loginUrl} to link Spotify.`);
  if (process.env.OPEN_LOGIN === '1') {
    await open('open', [loginUrl]);
  }
});
