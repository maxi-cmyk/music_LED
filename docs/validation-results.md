# Validation results

## Host Fourier checks

Command:

```bash
./tests/run_fourier_tests.sh
```

Result: all checks passed with strict C++ warnings enabled.

| Evidence | Result |
|---|---|
| Supported diagnostic sizes | 32, 64, 128, and 256 accepted |
| Non-power-of-two size | 30 samples accepted by direct DFT and rejected by radix-2 FFT |
| Oversized input | 257 samples rejected by both transforms before array access |
| Four-point worked example | `[0, 2, 0, 2]` |
| Zero input | All complex coefficients zero |
| Sample-zero impulse | All complex coefficients equal to one |
| Constant input | Only the DC coefficient is nonzero |
| Integer-bin cosine | Equal real coefficients in its conjugate bin pair |
| Phase-shifted cosine | Expected opposite-signed imaginary components |
| Two-tone input | Full complex DFT/FFT agreement |
| Linearity | `F(a x + b y) = a F x + b F y` passed numerically |

The maximum observed complex difference between direct DFT and FFT was approximately `0.002285` for a 256-sample single cosine. The comparison uses an absolute tolerance of `0.02` plus a relative tolerance of `0.0002` times the coefficient magnitude. Absolute tolerance handles coefficients whose expected value is zero.

Raw signals were tested without DC removal and without a window. This is deliberate: preprocessing would invalidate the constant-input expectation and obscure the transform-level proof.

The same runner also checks mean removal, Hamming-window behavior, the 200 Hz/bin 4 conversion, and fixed colour mapping for bass-only, midrange-only, treble-only, and mixed-band spectra.

## Provisional host timing

Command:

```bash
./tests/run_fourier_benchmark.sh
```

The development-computer result is useful as a pipeline check and fallback. It is not the required same-device ESP32 measurement and should not be used as the final presentation chart.

| N | Max complex error | Direct DFT median | FFT median | Speedup |
|---:|---:|---:|---:|---:|
| 32 | 0.000037 | 8.625 µs | 0.417 µs | 20.7× |
| 64 | 0.000284 | 39.292 µs | 0.917 µs | 42.8× |
| 128 | 0.000902 | 178.042 µs | 2.042 µs | 87.2× |
| 256 | 0.002175 | 695.042 µs | 4.709 µs | 147.6× |

Each size used one warm-up followed by nine timed runs. The median, minimum, and maximum are saved in `benchmark-host.csv`; a volatile checksum consumes transform output. Signal generation, serial output, and comparison are excluded. The FFT measurement includes its internal input copy and twiddle calculations.

## ESP32 compilation

Target: `esp32:esp32:esp32`, ESP32 Arduino platform 3.3.11.

Result after implementing the full pre-flash pipeline:

| Resource | Used | Available |
|---|---:|---:|
| Program storage | 298,707 bytes (22%) | 1,310,720 bytes |
| Global dynamic memory | 32,752 bytes (9%) | 327,680 bytes |

The firmware now contains a startup RGB channel self-test, an on-device DFT/FFT benchmark for 32, 64, 128, and 256 samples, acquisition diagnostics, a rate-limited live summary, and 5 Hz full-spectrum telemetry.

## Browser source check

`node --check` passed for `app.js`, `signal-analysis.mjs`, and `serial-source.mjs`. `node tests/signal_analysis_tests.mjs` passed the generated single- and mixed-frequency cases, non-bin-centred leakage, telemetry parsing, chunked serial buffering, and malformed-frame rejection.

## Flashed ESP32 telemetry

The updated sketch was uploaded to `/dev/cu.usbserial-0001`. Captured `LIVE_FRAME` and `SPECTRUM_FRAME` output established:

| Evidence | Observed result |
|---|---|
| Spectrum payload | 65 bins, covering DC through Nyquist |
| Achieved sample rate | Approximately 6399.92–6400.56 Hz |
| Maximum sample lateness | 2–4 µs in the captured frames |
| Missed deadlines | 0 |
| Silence handling | Zero-valued spectrum and RGB output |
| Active input | Non-zero spectrum, bands, dominant bin, and RGB output |

The browser-side spectrum parsing and colour-mapping mathematics have automated coverage. Selecting a Web Serial port remains a browser user-permission action, so the final live-page connection should be confirmed interactively on the presentation computer.

## Remaining presentation-environment checks

- reconnect through the page's Web Serial permission prompt;
- verify the final speaker distance, room acoustics, and clipping margin;
- rehearse closing the serial monitor before the website connects;
- confirm the final display layout at the presentation resolution.

These are live-environment checks, not gaps in the transform or telemetry implementation.
