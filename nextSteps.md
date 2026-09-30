# Music LED: next steps

The implementation is complete. The direct DFT and FFT agree in automated tests, the synchronized live-capture protocol compiles, its browser transaction parser passes simulated serial tests, and the calibrated RGB build with a maximum-brightness startup self-test is flashed to the ESP32. The remaining work is physical microphone, LED, and presentation-setup verification.

## 1. Verify the presentation setup

- [ ] Use the final laptop, browser, USB cable, speaker, microphone position, and display.
- [x] Open the local page in Chrome or Edge, connect through the Web Serial permission prompt, and confirm that the spectrum, band meters, dominant frequency, and RGB values update.
- [x] Move between Demo and Presenter modes during playback and confirm that the shared tone and serial connection continue without interruption.
- [x] Dry-run Capture Frame with deterministic simulated samples and verify the measured-input, direct-DFT, complex-sum, FFT-reuse, coefficient-comparison, and colour-mapping stages.
- [x] In Demo mode, capture one synchronized live ESP32 frame and verify that its raw and prepared vectors, selected Fourier row, complex coefficient, spectrum bands, and RGB result agree.
- [x] Confirm the startup red, green, and blue self-test matches the physical LED channels.
- [x] Test silence and check that the LED turns off without a persistent 1000 Hz component.
- [x] Test 200 Hz, 500 Hz, 1000 Hz, and 2000 Hz. Confirm the dominant peak is within one 50 Hz bin of the target and that the expected red, green, or blue channel responds.
- [x] Test two- and three-tone mixtures and confirm that each constituent peak remains visible and the LED produces the expected mixed colour.
- [x] Test the 225 Hz off-bin tone and be ready to explain spectral leakage.
- [x] Increase the level until clipping is observed, then choose a safe presentation volume with suitable headroom.
- [x] Rehearse closing Arduino Serial Monitor before the browser connects to the serial port.

## 2. Capture final evidence

- [ ] Save the ESP32 startup benchmark for 32, 64, 128, and 256 samples, including direct DFT time, FFT time, speedup, and maximum complex error.
- [ ] Replace the provisional host benchmark chart with the ESP32 measurements used in the presentation.
- [ ] Record representative silence, single-tone, mixed-tone, leakage, and clipping results for the final slides.
- [ ] Record the final speaker distance, computer volume, noise floor, clipping margin, and RGB gains so the setup can be reproduced.
- [ ] Capture a clear photograph or short fallback video of the complete physical system.

## 3. Build the presentation

Target **9:20 of speaking and page transitions**, leaving 40 seconds of margin below the ten-minute limit. Rehearse using the actual browser, hardware, and speaker handoffs. The detailed cues are in [`docs/presentation-run-of-show.md`](docs/presentation-run-of-show.md).

| Time | Page and one point to make |
|---:|---|
| 0:00–1:15 | **Presenter · Phase & Euler:** the same frequency can start at different phases; cosine and sine checks form one complex result. Show one magnitude, then Euler’s formula. |
| 1:15–2:45 | **Presenter · Add signals → Toy example:** align and reverse equal waves to show reinforcement and cancellation; select bass and mids to build a mixed waveform. Define Hz, sample, and frame in place. |
| 2:45–4:25 | **Presenter · DFT matrix:** one row multiplies every sample to test one frequency; calculate one row of the four-sample example, then connect to 128 rows and the 200 Hz toy result. |
| 4:25–7:25 | **Live ESP32:** show the measured spectrum and one mixed music passage. Connect the coloured frequency groups to the RGB LED. Explain the band-strength column, calibrated diagonal gain matrix, and later nonlinear brightness steps without deriving each constant. |
| 7:25–9:00 | **Presenter · Why FFT:** the hardware computes the same DFT coefficients with seven stages of reuse; trace one butterfly and compare work growth. |
| 9:00–9:20 | State the result and limitations: sampled data, 50 Hz bin spacing, uncalibrated microphone amplitude, and RGB mapping as a design choice. |

**Speaking rule:** show one concrete example per idea. Continuous-transform integrals, basis-vector proofs, conjugate symmetry, the full recurrence, and every RGB calibration constant belong in Q&A or backup material. “Signal reformation” in the toy section means adding known component waves to build a mixture; do not claim this is an inverse DFT demonstration. Exact cancellation requires equal waves of the same frequency in opposite phase; mixed frequencies only cancel at some instants.

- [ ] Create original slides with a phase/Euler visual, four-sample reinforcement and cancellation, one Fourier matrix row, the live spectrum-to-RGB mapping, one FFT butterfly, and a hardware image. Keep the measured ESP32 benchmark chart as backup if final measurements are ready.
- [ ] Audit every equation against the CS103 glossary and LA4CS conventions, including square-bracket matrices and vectors.
- [x] Keep the distinction explicit: the DFT is the linear transformation; the FFT is a faster algorithm for computing it; magnitude and colour mapping make the full pipeline nonlinear.
- [ ] Label host, synthetic, recorded, and live evidence accurately.
- [ ] Keep the saved benchmark and hardware video available as a clearly labelled fallback.

## 4. Prepare the team

- [ ] Assign speaking sections and a backup presenter for each section.
- [ ] Ask each teammate to trace a 200 Hz input from microphone samples through the FFT, spectrum bands, and red LED output.
- [ ] Review [`docs/fourier-walkthrough.md`](docs/fourier-walkthrough.md), [`docs/how-the-fourier-matrix-arises.md`](docs/how-the-fourier-matrix-arises.md), and [`docs/comparison.md`](docs/comparison.md) together, then practise the team's Q&A topics and the timed cues in [`docs/presentation-run-of-show.md`](docs/presentation-run-of-show.md).
- [ ] Randomly direct Q&A questions to every teammate until everyone can answer across the theory, algorithm, experiment, and hardware.
- [ ] Run at least two timed rehearsals with speaker handoffs and the complete live demo.
- [ ] Run one failure rehearsal using the recorded fallback without implying that recorded data is live.

## Done when

- [ ] The final setup passes every controlled tone and serial/browser check.
- [ ] Slides contain the final ESP32 measurements and original, readable visuals.
- [ ] The full presentation consistently finishes within ten minutes.
- [ ] Every teammate can explain the mathematical result, implementation choice, evidence, and limitations during the five-minute Q&A.
