# Music LED Fourier demo

An ESP32 project that samples an analog microphone, computes a 128-point FFT, groups the detected spectrum into three frequency ranges, and drives a common-cathode RGB module.

The current firmware runs the microphone-to-RGB path continuously. The full refactor into separate direct DFT, FFT, sampling, spectrum, diagnostic, and lighting modules is specified in [`../nextSteps.md`](../nextSteps.md).

## Signal path

```text
microphone → 128 ADC samples → centre and window → FFT → frequency bands → RGB PWM
```

At the nominal 6400 Hz sample rate, adjacent FFT bins are 50 Hz apart.

| Bin indices | Bin-centre frequencies | Colour |
|---|---|---|
| 1–5 | 50–250 Hz | Red |
| 6–20 | 300–1000 Hz | Green |
| 21–50 | 1050–2500 Hz | Blue |

## Wiring

| Component | Pin | ESP32 |
|---|---|---:|
| RGB module | R | GPIO 19 |
| RGB module | G | GPIO 18 |
| RGB module | B | GPIO 5 |
| RGB module | − | GND |
| Microphone | AO | GPIO 34 |
| Microphone | VCC | 3V3 |
| Microphone | GND | GND |

The existing HW-479/KY-016 RGB module is common-cathode. Use an analog microphone module such as a MAX4466 or the analog output of a KY-037. GPIO 34 is an ADC1 input.

## Build

The firmware requires the ESP32 Arduino core. Compile it from the repository root with:

```bash
/Applications/Arduino\ IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli \
  compile --fqbn esp32:esp32:esp32 --output-dir /tmp/music-led-build \
  firmware/music_LED
```

Connect the board over USB to upload and view the 115200-baud serial output.
