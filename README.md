# music_LED

An ESP32 Spotify now-playing display with an SSD1306 OLED and an HW-479 / KY-016 common-cathode RGB status LED.

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

The OLED uses I2C address `0x3C`. Red means OLED setup failed, amber means Wi-Fi or the bridge failed, and green means playback data refreshed successfully.

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
set -a; source .env; set +a
npm start
```

From the repository root, compile the firmware with:

```bash
/Applications/Arduino\ IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli \
  compile --fqbn esp32:esp32:esp32 --output-dir build/esp32 firmware/music_LED
```

Run bridge tests with `cd bridge && npm test`. The firmware requires the ESP32 Arduino core, ArduinoJson, Adafruit SSD1306, and Adafruit GFX Library.
