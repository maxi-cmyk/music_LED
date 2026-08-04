# music_LED

An ESP32 Spotify now-playing display with an SSD1306 OLED, an analog microphone, and an HW-479 / KY-016 common-cathode RGB light.

## Structure

```text
firmware/music_LED/  ESP32 Arduino sketch
bridge/              Mac-hosted Spotify OAuth and playback service
```

The bridge owns the Spotify tokens and exposes display-safe JSON over the local network. Its backend lives in `bridge/src`; the separate browser frontend lives in `bridge/frontend` and is served only to loopback clients. The ESP32 owns only Wi-Fi credentials, the bridge URL, and the shared bridge key.

## Wiring

| Component | Pin | ESP32 |
|---|---|---:|
| OLED | VCC | 3V3 |
| OLED | GND | GND |
| OLED | SDA | GPIO 21 |
| OLED | SCL | GPIO 22 |
| RGB LED | R | GPIO 19 |
| RGB LED | G | GPIO 18 |
| RGB LED | B | GPIO 5 |
| RGB LED | - | GND |
| Microphone | AO | GPIO 34 |
| Microphone | VCC | 3V3 |
| Microphone | GND | GND |

Use an analog microphone module such as a MAX4466 or the analog output of a KY-037. GPIO 34 is an ADC1 input, so it works while Wi-Fi is active.

While Spotify is playing, the microphone automatically calibrates its room-noise floor and splits the audio into bass (50-250 Hz), mids (300-1000 Hz), and treble (1050-2500 Hz). Bass transients establish tempo, and both detected and predicted beats produce sharp saturated flashes. RGB gains, gamma, sensitivity, decay, brightness, and palette source are adjustable from the local control deck. Album mode extracts three colours from each cover; club and spectrum modes remain available. The mascot sways, dances, or headbangs according to tempo, celebrates track changes, and sleeps when paused. The light turns off when playback pauses. Solid red means OLED setup failed; solid amber means Wi-Fi or the bridge failed.

## Configure

Follow [`bridge/README.md`](bridge/README.md) for Spotify OAuth setup. Then create the ignored firmware configuration:

```bash
cp firmware/music_LED/src/config/Secrets.example.h \
  firmware/music_LED/src/config/Secrets.h
```

Set the bridge URL to `http://<mac-lan-ip>:3000/api/now-playing` and use the same bridge key as `bridge/.env`. Keep Spotify tokens out of the firmware.

## Run and verify

```bash
cd bridge
npm install
npm run dev
```

`npm run dev` loads `bridge/.env`, starts the backend, and serves the control deck at <http://127.0.0.1:3000/>. Dashboard assets and tuning APIs reject non-loopback clients; only the authenticated ESP32 playback and telemetry routes are reachable over the LAN.

From the repository root, compile the firmware with:

```bash
/Applications/Arduino\ IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli \
  compile --fqbn esp32:esp32:esp32 --output-dir build/esp32 firmware/music_LED
```

The bridge renders track and artist text into OLED bitmaps, supporting Simplified Chinese, Korean, Japanese, Spanish, French, and Vietnamese through the Mac's system fonts. It also downloads, resizes, and dithers Spotify cover art into a permanent 32×32 monochrome thumbnail. The dashboard keeps artwork on the left, title, artist, and playback time on the right, the timeline across the bottom, and the dancing mascot at its side. Long names pause before scrolling, pause again at the end, and then loop smoothly; the artist line uses a smaller regular font. Playback time is displayed as `minutes:seconds`, and no volume indicator is shown.

The OLED has distinct playing, paused, nothing-playing, and reconnecting screens. During inactivity it dims after one minute, shifts the panel offset periodically, sleeps after five minutes, and wakes automatically when playback resumes.

After the first USB flash, authenticated Arduino OTA is advertised as `music-led.local`. Select the `music-led` network port in Arduino IDE and use the bridge key as its OTA password. Keep USB available as the recovery path.

Run bridge tests with `cd bridge && npm test`. The firmware requires the ESP32 Arduino core, ArduinoJson, Adafruit SSD1306, and Adafruit GFX Library.
