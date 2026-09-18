# Music LED Fourier demo

An ESP32 project that samples an analog microphone, computes a 128-point FFT, groups the detected spectrum into three frequency ranges, and drives a common-cathode RGB module.

The current firmware runs the microphone-to-RGB path continuously. The implementation roadmap is in [`nextSteps.md`](nextSteps.md), and the linear algebra explanation is in [`docs/fourier-walkthrough.md`](docs/fourier-walkthrough.md).

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

There are no project-specific Arduino libraries or network/service dependencies; the sketch uses the ESP32 Arduino core and standard C/C++ headers.

Connect the board over USB, identify its port with `arduino-cli board list`, and replace `<PORT>` below:

```bash
/Applications/Arduino\ IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli \
  upload --fqbn esp32:esp32:esp32 --port <PORT> \
  --input-dir /tmp/music-led-build \
  firmware/music_LED
```

Open a 115200-baud serial monitor and reset the board while the room is quiet. Startup cycles the red, green, and blue channels, runs a synthetic DFT/FFT benchmark, measures a fixed microphone noise floor, and then starts the live pipeline.

## Local tone generator

From the repository root:

```bash
python3 -m http.server 8080 --directory tone-generator
```

Open `http://127.0.0.1:8080`. The page generates 200, 500, 1000, and 2000 Hz tones through Web Audio and includes a 225 Hz leakage test. Sound travels through the speaker and room to the microphone; the browser has no data connection to the ESP32.

## Fourier modules

The transform code has no Arduino dependencies:

- `FourierConfig.h` defines the shared sample count, sampling frequency, derived bin spacing, frame duration, Nyquist frequency, and supported diagnostic sizes.
- `FourierTypes.h` distinguishes the real time-domain vector from the complex frequency-domain vector.
- `DirectDFT.cpp` implements each Fourier-matrix row multiplied by the sample vector.
- `FastFourierTransform.cpp` computes the same unnormalized forward transform using radix-2 butterflies.
- `SyntheticSignals.cpp` creates deterministic vectors used by the mathematical checks.

The live audio path uses the extracted FFT. The direct DFT remains available for the controlled comparison and presentation diagnostics.

## Host validation

Run the hardware-independent checks with:

```bash
./tests/run_fourier_tests.sh
```

The runner checks known zero, constant, impulse, single-tone, two-tone, phase-shifted, and four-point signals. It compares every real and imaginary DFT/FFT coefficient for 32, 64, 128, and 256 samples and verifies linearity before magnitude calculation.

These checks do not validate microphone timing, acoustic response, wiring, or RGB calibration. Those require the flashed ESP32 and are intentionally deferred to the next phase.

Run the provisional desktop benchmark with:

```bash
./tests/run_fourier_benchmark.sh
```

On-device startup records transform-only median/minimum/maximum timings and complex error between `FOURIER_BENCHMARK_BEGIN` and `FOURIER_BENCHMARK_END`. The live loop emits `LIVE_FRAME` records at most twice per second. These include acquisition timing, missed deadlines, clipping, RMS/noise values, dominant bin/frequency, band strengths, and RGB output. The first non-silent frame also prints a direct DFT/FFT comparison of identical prepared samples.

Follow [`docs/hardware-test-checklist.md`](docs/hardware-test-checklist.md) for the first flash and calibration. Presentation preparation is in [`docs/presentation-outline.md`](docs/presentation-outline.md) and [`docs/q-and-a.md`](docs/q-and-a.md).

## Troubleshooting

- If an RGB channel is absent during startup, check the GPIO and common-cathode ground before changing band logic.
- If clipping is reported, reduce speaker or microphone gain.
- If silence remains active, reset in a quiet room and record the startup RMS before changing the fixed gate.
- If every detected frequency is systematically shifted, inspect achieved sampling rate and missed deadlines in `LIVE_FRAME`.
- If a 225 Hz tone occupies several bins, that is expected spectral leakage rather than a transform failure.
