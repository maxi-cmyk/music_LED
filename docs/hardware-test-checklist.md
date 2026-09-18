# First flash, test, and calibration checklist

Use this after the pre-flash checks pass. Record observations instead of changing constants during the first run.

## Setup

- [ ] Connect the microphone analog output to GPIO 34, VCC to 3V3, and GND to GND.
- [ ] Connect the common-cathode RGB module: red to GPIO 19, green to GPIO 18, blue to GPIO 5, and minus to GND.
- [ ] Place the speaker about 10–20 cm from the microphone and start at low volume.
- [ ] Keep the room quiet during reset because the firmware measures its fixed startup noise floor.
- [ ] Open a 115200-baud serial monitor, reset the ESP32, and save the full output.

## Flash

Find the board port with `arduino-cli board list`, then replace `<PORT>`:

```bash
/Applications/Arduino\ IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli \
  compile --fqbn esp32:esp32:esp32 \
  --output-dir /tmp/music-led-build \
  firmware/music_LED

/Applications/Arduino\ IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli \
  upload --fqbn esp32:esp32:esp32 --port <PORT> \
  --input-dir /tmp/music-led-build \
  firmware/music_LED
```

## Startup checks

- [ ] The LED shows red, green, and blue, in that order, for about 0.3 seconds each.
- [ ] Serial prints `RGB_SELF_TEST,complete`.
- [ ] The `FOURIER_BENCHMARK_BEGIN` block contains rows for 32, 64, 128, and 256 samples.
- [ ] Every row has a small maximum complex error and the FFT becomes faster than the DFT as size grows.
- [ ] Serial prints the measured startup noise level and `Microphone-to-RGB frequency demo ready.`

If an LED channel is missing or in the wrong order, check wiring before changing the frequency mapping.

## Controlled tone checks

Serve the local page from the repository root:

```bash
python3 -m http.server 8080 --directory tone-generator
```

Open `http://127.0.0.1:8080`. For every row below, start with one selected tone and moderate volume. A dominant frequency within one 50 Hz bin of the target is the initial acceptance tolerance.

| Input | Expected bin/region | Expected colour | Observed bin/Hz | Observed colour | Pass? |
|---|---|---|---|---|---|
| Silence | Below fixed gate | Off |  |  |  |
| 200 Hz | Bin 4 | Red |  |  |  |
| 500 Hz | Bin 10 | Green |  |  |  |
| 1000 Hz | Bin 20 | Green |  |  |  |
| 2000 Hz | Bin 40 | Blue |  |  |  |
| 200 + 1000 Hz | Bass and mid regions | Red + green |  |  |  |
| 225 Hz | Energy shared across nearby bins | Mostly red |  |  |  |

- [ ] Save at least one `LIVE_TRANSFORM_COMPARISON` line showing DFT/FFT agreement on the same prepared microphone frame.
- [ ] Save representative `LIVE_FRAME` lines for silence and each controlled tone.
- [ ] Confirm the 225 Hz test spreads energy across bins; explain this as spectral leakage.
- [ ] Increase volume carefully until clipping is reported, then reduce it for the demo.
- [ ] Confirm silence turns the LED off without a changing automatic threshold.

## Timing and calibration record

| Quantity | Result |
|---|---|
| Room and speaker used |  |
| Speaker distance |  |
| Computer volume |  |
| Quiet RMS |  |
| Fixed noise gate |  |
| 127-sample timestamp span, expected about 19,844 µs |  |
| Achieved sample rate |  |
| Maximum sample lateness |  |
| Missed deadlines |  |
| Clipped samples at demo volume |  |
| Red gain/scale adjustment |  |
| Green gain/scale adjustment |  |
| Blue gain/scale adjustment |  |

Change fixed gains or the common brightness scale only after recording the uncalibrated result. Re-run every controlled tone after a calibration change.

## Evidence boundary

Desktop tests establish transform correctness and compilation. Only this procedure can establish microphone timing, acoustic response, wiring, and colour balance. Do not mark those results complete until the observations are recorded.
