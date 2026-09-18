# Music LED: next steps

The implementation is complete. The direct DFT and FFT agree in automated tests, the ESP32 firmware compiles and has been flashed, live timing is close to the 6400 Hz target with no missed deadlines in captured frames, and the browser can parse and visualize the emitted spectrum. The remaining work is to prepare and verify the final live presentation.

## 1. Verify the presentation setup

- [ ] Use the final laptop, browser, USB cable, speaker, microphone position, and display.
- [ ] Open the local page in Chrome or Edge, connect through the Web Serial permission prompt, and confirm that the spectrum, band meters, dominant frequency, and RGB values update.
- [ ] Confirm the startup red, green, and blue self-test matches the physical LED channels.
- [ ] Test silence and check that the LED turns off without a persistent 1000 Hz component.
- [ ] Test 200 Hz, 500 Hz, 1000 Hz, and 2000 Hz. Confirm the dominant peak is within one 50 Hz bin of the target and that the expected red, green, or blue channel responds.
- [ ] Test two- and three-tone mixtures and confirm that each constituent peak remains visible and the LED produces the expected mixed colour.
- [ ] Test the 225 Hz off-bin tone and be ready to explain spectral leakage.
- [ ] Increase the level until clipping is observed, then choose a safe presentation volume with suitable headroom.
- [ ] Rehearse closing Arduino Serial Monitor before the browser connects to the serial port.

## 2. Capture final evidence

- [ ] Save the ESP32 startup benchmark for 32, 64, 128, and 256 samples, including direct DFT time, FFT time, speedup, and maximum complex error.
- [ ] Replace the provisional host benchmark chart with the ESP32 measurements used in the presentation.
- [ ] Record representative silence, single-tone, mixed-tone, leakage, and clipping results in `docs/validation-results.md`.
- [ ] Record the final speaker distance, computer volume, noise floor, clipping margin, and RGB gains so the setup can be reproduced.
- [ ] Capture a clear photograph or short fallback video of the complete physical system.

## 3. Build the presentation

Target about nine minutes so the presentation remains below the ten-minute limit.

| Time | Content |
|---:|---|
| 0:00–0:30 | Introduce the sound → samples → spectrum → colour pipeline. |
| 0:30–2:00 | Connect the continuous Fourier-transform idea to the finite DFT used by the ESP32. |
| 2:00–4:30 | Work through `X = F x` with the four-sample example and explain basis vectors, orthogonality, conjugate symmetry, and linearity. |
| 4:30–6:15 | Show how the direct DFT implements the matrix row sums and connect the result to a controlled tone. |
| 6:15–7:15 | Explain one FFT butterfly and show that the FFT returns the same complex coefficients. |
| 7:15–8:00 | Present the ESP32 timing comparison and contrast `O(N²)` with `O(N log N)`. |
| 8:00–9:00 | Demonstrate individual and mixed tones using the browser spectrum and RGB output. |
| 9:00–9:30 | State limitations and the main conclusion, then transition to Q&A. |

- [ ] Create original slides with a signal-path diagram, four-point Fourier matrix, time/frequency plots, one FFT butterfly, the ESP32 benchmark chart, and a hardware image.
- [ ] Audit every equation against the CS103 glossary and LA4CS conventions, including square-bracket matrices and vectors.
- [ ] Keep the distinction explicit: the DFT is the linear transformation; the FFT is a faster algorithm for computing it; magnitude and colour mapping make the full pipeline nonlinear.
- [ ] Label host, synthetic, recorded, and live evidence accurately.
- [ ] Keep the saved benchmark and hardware video available as a clearly labelled fallback.

## 4. Prepare the team

- [ ] Assign speaking sections and a backup presenter for each section.
- [ ] Ask each teammate to trace a 200 Hz input from microphone samples through the FFT, spectrum bands, and red LED output.
- [ ] Review `docs/fourier-walkthrough.md`, `docs/notation-guide.md`, and `docs/q-and-a.md` together.
- [ ] Randomly direct Q&A questions to every teammate until everyone can answer across the theory, algorithm, experiment, and hardware.
- [ ] Run at least two timed rehearsals with speaker handoffs and the complete live demo.
- [ ] Run one failure rehearsal using the recorded fallback without implying that recorded data is live.

## Done when

- [ ] The final setup passes every controlled tone and serial/browser check.
- [ ] Slides contain the final ESP32 measurements and original, readable visuals.
- [ ] The full presentation consistently finishes within ten minutes.
- [ ] Every teammate can explain the mathematical result, implementation choice, evidence, and limitations during the five-minute Q&A.
