# Music LED Fourier demo

Music LED is an ESP32 demonstration that turns sound into colour. An analog microphone captures a short audio frame, a custom fast Fourier transform (FFT) separates it into frequency components, and a common-cathode RGB LED displays the strength of three frequency bands.

The project was built as a linear algebra teaching aid. It includes both a readable direct discrete Fourier transform (DFT), which mirrors Fourier-matrix multiplication, and a radix-2 FFT, which computes the same result efficiently enough for a live embedded demo.

## How it works

```text
sound → microphone → 128 samples → centre and window → FFT → band strengths → RGB LED
                                                        ↓
                                             USB spectrum telemetry
                                                        ↓
                                           localhost browser visualizer
```

The live configuration samples at a nominal 6400 Hz. With 128 samples, adjacent FFT bins are 50 Hz apart and the non-negative spectrum extends to the 3200 Hz Nyquist frequency.

| Frequency bins | Range | LED channel |
|---|---:|---|
| 1–5 | 50–250 Hz | Red |
| 6–20 | 300–1000 Hz | Green |
| 21–50 | 1050–2500 Hz | Blue |

The LED is a visualization of selected frequency bands, not proof that the transform is correct. The direct DFT and FFT have also been checked against known signals and compared coefficient by coefficient.

## Project components

- `firmware/music_LED/` contains the Arduino sketch and separate audio, Fourier, lighting, configuration, and diagnostic modules.
- `tone-generator/` contains an offline browser tone generator and Web Serial spectrum visualizer.
- `docs/fourier-walkthrough.md` explains the mathematics and maps equations to the implementation.
- `docs/how-the-fourier-matrix-arises.md` derives the sample vector, Fourier matrix, and frequency-domain vector step by step.
- `nextSteps.md` tracks only the work still needed before the presentation.

## Hardware

The current setup uses an ESP32, a KY-037 analog microphone output, and an HW-479/KY-016 common-cathode RGB module.

| Connection | ESP32 pin |
|---|---:|
| Microphone `A0` | GPIO 4 |
| RGB red | GPIO 19 |
| RGB green | GPIO 18 |
| RGB blue | GPIO 5 |
| Microphone and RGB ground | GND |
| Microphone power | 3V3 |

Wi-Fi remains disabled because GPIO 4 uses ADC2 on the classic ESP32. The RGB channels use 32 kHz PWM to avoid the measured 1 kHz coupling produced by the core's default PWM frequency.

## Build and use the demo

Compile the firmware with the ESP32 Arduino core:

```bash
/Applications/Arduino\ IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli \
  compile --fqbn esp32:esp32:esp32 \
  --output-dir /tmp/music-led-build \
  firmware/music_LED
```

After uploading the sketch, serve the browser interface from the repository root:

```bash
python3 -m http.server 8080 --directory tone-generator
```

Open `http://127.0.0.1:8080` in desktop Chrome or Edge. The page can generate controlled tones through the computer speaker and, after the user approves the serial port, display the spectrum and RGB values reported by the ESP32. Close Arduino Serial Monitor first because only one application can own the USB serial port at a time.

The audio path remains physical: browser → speaker → air → microphone → ESP32. The browser does not send test samples directly to the firmware.

## Current status

The modular firmware, direct DFT, FFT, RGB mapping, serial telemetry, browser visualizer, ESP32 compilation, and initial device telemetry are complete. The remaining work is presentation-environment verification, final calibration and evidence capture, slide production, and team rehearsal; see [`nextSteps.md`](nextSteps.md).
