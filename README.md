# music_LED

An ESP32 Spotify now-playing display with a 0.96-inch monochrome OLED and an HW-479 / KY-016 common-cathode RGB status LED.

## Firmware structure

```text
music_LED.ino             # setup + display refresh loop
src/
  config/                 # pins and local network settings
  display/                # SSD1306 OLED rendering
  spotify/                # playback data model; bridge client comes next
  status/                 # HW-479 RGB status LED
```

There is intentionally **no microphone sampling or beat controller**. This project is now a Spotify-display add-on.

## Current hardware wiring

### OLED (assumes common SSD1306 I2C module)

| OLED | ESP32 GPIO |
|---|---:|
| VCC | 3V3 |
| GND | GND |
| SDA | 21 |
| SCL | 22 |

The code initially uses I2C address `0x3C`. If the screen remains blank, run an I2C scanner and update `kOledI2cAddress` in `src/config/PinConfig.h`.

### HW-479 / KY-016 RGB LED

The `B G R -` marking identifies a common-cathode RGB module. Connect `-` to GND.

| HW-479 pin | ESP32 GPIO |
|---|---:|
| R | 25 |
| G | 26 |
| B | 27 |
| - | GND |

The ESP32 uses PWM through `analogWrite()` to set LED colour. Red means OLED setup failed; amber means Wi-Fi/Spotify bridge credentials have not been configured; green means local credentials exist.

## Spotify architecture

Spotify playback state requires user OAuth. Do **not** put a Spotify refresh token inside ESP32 firmware.

1. Copy `src/config/Secrets.example.h` to `src/config/Secrets.h`.
2. Put Wi-Fi credentials and the URL of a local/hosted Spotify bridge in `Secrets.h`.
3. Keep the bridge responsible for the Spotify refresh token and return only safe display JSON to the ESP32.

`Secrets.h` is Git-ignored. The current firmware validates the OLED and shows a setup screen; the next module is the authenticated bridge client that turns JSON into `PlaybackState`.

## Compile

```bash
/Applications/Arduino\ IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli \
  compile --fqbn esp32:esp32:esp32 --output-dir build/esp32 .
```

Required on this Mac: ESP32 Arduino core and `Adafruit SSD1306` / `Adafruit GFX Library`.
