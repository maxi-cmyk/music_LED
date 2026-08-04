# music_LED

An ESP32 Spotify now-playing display with an SSD1306 OLED, an analog microphone, and an HW-479 / KY-016 common-cathode RGB light.

## Structure

```text
firmware/music_LED/  ESP32 Arduino sketch
bridge/              Mac-hosted Spotify OAuth and playback service
```

The bridge owns the Spotify tokens and exposes display-safe JSON over the local network. The ESP32 owns only Wi-Fi credentials, the bridge URL, and the shared bridge key.

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

While Spotify is playing, the microphone splits the audio into bass (50-250 Hz), mids (300-1000 Hz), and treble (1050-2500 Hz). Each band adapts independently to the room volume, producing a cooler purple, cyan, blue, and hot-pink club palette instead of letting bass dominate the colour. Detected beats rotate through accent colours and drive the mini dancer beside the progress bar; it sleeps when playback is paused. The light turns off when playback pauses. Solid red means OLED setup failed; solid amber means Wi-Fi or the bridge failed.

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
set -a; source .env; set +a
npm start
```

From the repository root, compile the firmware with:

```bash
/Applications/Arduino\ IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli \
  compile --fqbn esp32:esp32:esp32 --output-dir build/esp32 firmware/music_LED
```

The bridge renders track and artist text into OLED bitmaps, supporting Simplified Chinese, Korean, Japanese, Spanish, French, and Vietnamese through the Mac's system fonts. Long names scroll smoothly from right to left; the artist line uses a smaller regular font. Playback time is displayed as `minutes:seconds`, and no volume indicator is shown.

Run bridge tests with `cd bridge && npm test`. The firmware requires the ESP32 Arduino core, ArduinoJson, Adafruit SSD1306, and Adafruit GFX Library.
