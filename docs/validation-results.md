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
| Program storage | 297,623 bytes (22%) | 1,310,720 bytes |
| Global dynamic memory | 32,744 bytes (9%) | 327,680 bytes |

The firmware now contains a startup RGB channel self-test, an on-device DFT/FFT benchmark for 32, 64, 128, and 256 samples, acquisition diagnostics, and a rate-limited live serial record. Successful compilation does not establish their physical results.

## Browser source check

`node --check tone-generator/app.js` passed. A temporary localhost server returned the page, script, and stylesheet successfully. Audio start/stop behavior and the physical speaker path remain user-gesture and hardware checks.

## Evidence still requiring hardware

- microphone and RGB wiring;
- quiet-room level and clipping behavior;
- achieved sample rate, jitter, and missed deadlines;
- detected bins for acoustic test tones;
- fixed RGB channel calibration.

These checks begin after the updated sketch is flashed. No hardware result is claimed here.
