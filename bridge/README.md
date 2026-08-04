# Spotify OLED bridge (Mac)

This local Node service owns Spotify OAuth tokens and returns only display-ready playback JSON to the ESP32. It has no npm dependencies; Node 18+ is enough.

## What it supports

The bridge reads the **currently playing track for the Spotify account that authorises it**. Playback can be started on the Spotify app on your phone, Mac, speaker, or another device. The phone does not call the bridge directly; Spotify reports account playback to the bridge, and the ESP32 fetches the result from the Mac over the local network.

## One-time Spotify setup

1. Go to <https://developer.spotify.com/dashboard> and create an app.
2. In its Redirect URIs, add this exact value:
   ```text
   http://127.0.0.1:3000/callback
   ```
   Spotify permits HTTP for explicit loopback IPs; `localhost` is not valid.
3. Copy `.env.example` to `.env` and fill in the dashboard Client ID, Client Secret, and a randomly generated bridge key.
4. Keep `.env` and `data/spotify-tokens.json` private. Both are ignored by Git.

Generate the bridge key on the Mac:
```bash
openssl rand -hex 32
```

## Run and authorise

```bash
cd bridge
set -a; source .env; set +a
OPEN_LOGIN=1 npm start
```

The browser opens Spotify’s consent page. Sign in to the Spotify account whose playback should appear on the OLED. Tokens are stored locally in `bridge/data/spotify-tokens.json` and refreshed automatically.

## Endpoints

- `GET /health` → `{ "ok": true }`
- `GET /api/now-playing` with `X-Bridge-Key: <MUSIC_LED_BRIDGE_KEY>` →
  ```json
  {
    "available": true,
    "title": "Track title",
    "artist": "Artist",
    "progressMs": 12345,
    "durationMs": 180000,
    "volumePercent": 70,
    "isPlaying": true
  }
  ```

The ESP32 integration must use the Mac’s LAN IP in `MUSIC_LED_BRIDGE_URL` and send the same bridge key. Do not expose this service to the public internet.

## Verify

```bash
npm test
```
