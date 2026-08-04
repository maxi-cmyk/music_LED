# music_LED

A music-reactive LED project being extended with a Spotify now-playing OLED display.

## Current firmware structure

```text
music_LED.ino             # Arduino entry point: setup + loop only
src/
  audio/                  # microphone sampling and audio-frame data
  visual/                 # beat detection and LED rendering
  config/                 # board-specific pins and tuning constants
```

The original sketch has been split by responsibility while retaining its current AVR/Arduino behaviour:

- `AudioSampler` samples the microphone and produces amplitude/frequency-crossing data.
- `BeatDetector` owns adaptive beat-threshold, cooldown, active-LED, and brightness state.
- `LedController` maps frequency and brightness to the existing discrete LEDs and RGB LED.
- `config/` isolates values that will change during the ESP32 migration.

## ESP32 + Spotify OLED migration

The existing `LedController` is **AVR-specific**: it uses `DDRD` and `PORTD`, which do not exist on ESP32. Do not upload this legacy LED controller to the ESP32.

The next change should replace that hardware layer with ESP32 GPIO writes and add:

```text
src/display/   # SSD1306 OLED UI
src/spotify/   # Wi-Fi client for a token-safe playback-state bridge
```

Spotify playback state needs user OAuth. Keep the Spotify refresh token in a local/hosted bridge, not in the ESP32 firmware. The ESP32 should only request display-ready JSON from that bridge.

## Hardware details still needed

Before the ESP32 migration, record:

1. Exact ESP32 board model.
2. OLED driver and I2C address (commonly SSD1306 at `0x3C`, but verify with an I2C scan).
3. What the HW-479 module is and its pinout/link.
4. Which GPIO pins are already occupied by LEDs and microphone.

## Build

This repository needs Arduino CLI (or Arduino IDE) configured with the intended board core before it can be compiled. The current source targets the original AVR wiring; the ESP32 migration is deliberately pending the pin map above.
