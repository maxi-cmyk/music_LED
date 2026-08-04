# Spotify OLED bridge (Mac)

This local Node backend owns Spotify OAuth tokens and returns display-ready playback JSON to the ESP32. It renders Unicode text, dithers album covers, extracts album colours, stores visual settings, and receives ESP32 diagnostics. The separate static frontend in `frontend/` is a loopback-only control deck. Node 18+ is required.

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
npm install
npm run dev
```

Open <http://127.0.0.1:3000/login> once to authorise Spotify, then use <http://127.0.0.1:3000/> for tuning and diagnostics. `npm run dev` loads `.env` itself; no shell export step is required. Tokens and display settings are stored under `bridge/data/` and remain ignored.

## Endpoints

- `GET /health` → `{ "ok": true }`
- `GET /api/now-playing` with `X-Bridge-Key: <MUSIC_LED_BRIDGE_KEY>` →
  ```json
  {
    "available": true,
    "trackId": "spotify-track-id",
    "title": "Track title",
    "artist": "Artist",
    "titleBitmap": "1-bit bitmap encoded as hexadecimal",
    "titleBitmapWidth": 128,
    "artistBitmap": "1-bit bitmap encoded as hexadecimal",
    "artistBitmapWidth": 96,
    "albumArtBitmap": "32x32 1-bit bitmap encoded as hexadecimal",
    "albumArtWidth": 32,
    "albumArtHeight": 32,
    "albumPalette": [[255, 0, 120], [20, 80, 255], [0, 220, 100]],
    "visualConfig": { "paletteMode": "album", "beatSensitivity": 1 },
    "progressMs": 12345,
    "durationMs": 180000,
    "isPlaying": true
  }
  ```

- `POST /api/telemetry` with the bridge key accepts ESP32 BPM, microphone, spectrum, and Wi-Fi diagnostics.
- `GET/PUT /api/config`, `GET /api/telemetry`, `/`, `/app.js`, and `/styles.css` accept loopback clients only.

Bitmap widths preserve long names so the ESP32 can scroll them smoothly. Album art is fetched once per cover, cached in memory, resized, dithered into 128 bytes, and analysed for three dominant colours. Artwork failure does not interrupt playback updates. The ESP32 integration must use the Mac’s LAN IP in `MUSIC_LED_BRIDGE_URL` and send the same bridge key.

## Start automatically at login

Stop any active development bridge, then run the one-time installer:

```bash
npm run service:install
```

This installs a user LaunchAgent that loads `.env`, starts the same backend/frontend process at login, restarts it after failure, and writes ignored logs inside `bridge/`. Remove it with `npm run service:uninstall`. Development still needs only `npm run dev`; installing the service is optional and is not performed automatically.

## Verify

```bash
npm test
```
