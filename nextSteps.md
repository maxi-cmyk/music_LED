# Linear algebra Fourier demo: implementation roadmap

Status: All work possible before flashing is implemented and locally validated. The remaining work is physical microphone/RGB measurement, device calibration, final slide production, teammate training, and rehearsal. This roadmap incorporates the requirements in `Project Info & Rubric.pdf`; the course document remains the authoritative source for grading details.

## 1. Project objective

Refactor the existing application into a small, understandable linear algebra demonstration titled **From Sound to Colour: The DFT as a Linear Transformation**.

The demonstration follows this sequence:

**Sound → sampled vector → preprocessing → DFT/FFT → frequency magnitudes → RGB output.**

The main academic result is that the DFT is matrix multiplication and that the FFT computes the same transformation more efficiently. The hardware makes the result visible. LED colour alone is not evidence that the mathematics is correct.

Only one teammate currently knows the hardware and Fourier material. Readability, clear module boundaries, and a guided explanation are therefore acceptance requirements, not optional cleanup.

## 2. Scope and starting assumptions

The repository now contains a standalone ESP32 Arduino sketch, an analog microphone on GPIO 34, and an HW-479/KY-016 common-cathode RGB module on GPIOs 19/18/5. Its custom FFT already uses 128 samples and a nominal 6400 Hz sampling rate.

The current output is a single RGB module, not an addressable LED strip. Confirm the physical hardware before implementation; this plan assumes the existing module and wiring.

### Required deliverables

- A worked Fourier-matrix example and a short explanation of basis vectors, orthogonality, and linearity.
- A readable direct DFT and the extracted existing FFT.
- Deterministic synthetic inputs for correctness checks and timing comparisons.
- A standalone microphone-to-RGB demonstration.
- A simple localhost browser tone generator.
- Serial diagnostics and a teammate reading guide.
- Recorded validation results and a rehearsed presentation sequence.

### Excluded from the demo build

- Network authentication, remote playback polling, album artwork, and playback gating.
- Screen rendering, animation, beat prediction, scene presets, and schedules.
- Wi-Fi, OTA, and a device-control backend unless a later demonstrated requirement justifies them.
- A new build system, addressable LED hardware, live browser telemetry, or a general DSP framework.

Music playback is an optional final demonstration. Reproducing the original club-lighting effects is not a requirement.

## 3. Rubric alignment and project priorities

The course grades the live work rather than a submitted codebase or written report:

| Graded component | Marks | What this project must prepare |
|---|---:|---|
| Instructor evaluation of presentation | 5 | A clear, original, mathematically precise ten-minute explanation supported by useful visuals and a reliable demonstration. |
| Peer evaluation | 5 | A presentation classmates can follow, with a visible application, clear significance, and professional delivery. |
| Q&A performance | 5 | Every team member can accurately explain and defend the mathematics, algorithm, design choices, results, and limitations. |

The presentation takes place in Week 13, lasts 10 minutes, and is followed by 5 minutes of Q&A. The class is also expected to critique and evaluate other teams' presentations.

Although no written report or slide deck needs to be submitted, internal documentation and presentation slides are still useful preparation artifacts. Spend project time according to what is graded:

1. Correct understanding and team-wide explanation.
2. A concise presentation with original equations and visuals.
3. Q&A practice by every team member.
4. A dependable hardware demonstration and numerical evidence.
5. Code polish beyond what is necessary for clarity and reliability.

To target the highest rubric band:

- Keep standard classroom background concise. Concentrate on the DFT as a complex linear transformation, change of coordinates into frequency components, conjugate symmetry for real signals, and FFT factorization and computational efficiency.
- Clearly demonstrate the application's significance: efficient spectral decomposition enables real-time frequency-reactive output on a small microcontroller.
- Use original diagrams, plots, measured timings, and photographs or video of this project. Do not fill slides with copied web material, code screenshots, or decorative gimmicks.
- Format equations with LaTeX or Microsoft Word Equations. Before finalizing slides, compare every symbol with the CS103 textbook glossary in eLearn.
- Use square brackets for matrices and vectors according to LA4CS formatting. Avoid adding `*`, dot, or cross symbols for ordinary multiplication; use adjacency such as `F x` or the precise notation prescribed by the course glossary.
- Treat the provided Fourier topic as the approved starting point. Originality comes from the team's explanation, implementation, experiment, measurements, and insights rather than inventing a new transform.

### Rubric evidence map

| Rubric category | Planned evidence |
|---|---|
| Theoretical background | Worked four-point Fourier matrix, basis interpretation, orthogonality, linearity, conjugate symmetry, and DFT/FFT distinction. |
| Application of concepts | Microphone samples represented as a vector, DFT implemented as matrix-row sums, FFT factorization, and spectrum-to-RGB demonstration. |
| Significance and benefits | Measured DFT/FFT timing comparison and explanation of why reduced computation makes real-time embedded response practical. |
| Delivery and language | Timed rehearsals, defined terminology, clean speaker handoffs, and no unexplained jargon. |
| Slide quality and originality | Team-created signal-flow graphic, matrix animation or build-up, original plots, benchmark chart, and hardware demonstration. |
| Visuals and equations | LA4CS-compatible equations, readable matrices, time-domain and frequency-domain plots, and colour mapping graphic. |
| Q&A defense | Shared question bank, individual practice, and random questioning so every member can answer across all project areas. |

## 4. Readability and module design

### Naming conventions

Use explicit names throughout public interfaces and mathematical loops. Keep conventional symbols in equations and map them to code in comments and documentation.

| Meaning | Mathematical notation | Suggested code name |
|---|---|---|
| Sample count | N | `numberOfSamples` |
| Sampling frequency | f_s | `samplingFrequencyHz` |
| Frequency-bin spacing | f_s / N | `frequencyBinSpacingHz` |
| Time sample index | n | `sampleIndex` |
| Frequency bin index | k | `frequencyBinIndex` |
| Input sample | x[n] | `timeDomainSamples[sampleIndex]` |
| Real coefficient | Re(X[k]) | `frequencyDomainReal[frequencyBinIndex]` |
| Imaginary coefficient | Im(X[k]) | `frequencyDomainImaginary[frequencyBinIndex]` |
| Magnitude | abs(X[k]) | `frequencyMagnitudes[frequencyBinIndex]` |
| FFT rotation factor | — | `twiddleFactorReal`, `twiddleFactorImaginary` |

Avoid unexplained names such as `re`, `im`, `mag`, `tmp`, or `k` in the implementation. Explain the mathematical purpose of operations rather than narrating C++ syntax.

### Proposed structure

Retain Arduino's existing sketch entry point. Paths below are relative to the repository root.

```text
firmware/music_LED/
  music_LED.ino
  src/
    config/
      PinConfig.h
      FourierConfig.h
    audio/
      AudioSampler.h / .cpp
      SamplePreprocessing.h / .cpp
    fourier/
      FourierTypes.h
      DirectDFT.h / .cpp
      FastFourierTransform.h / .cpp
      SpectrumAnalysis.h / .cpp
    lighting/
      FrequencyToColor.h / .cpp
      RgbLedOutput.h / .cpp
    demo/
      SyntheticSignals.h / .cpp
      FourierDiagnostics.h / .cpp
tone-generator/
  index.html
  app.js
  styles.css
docs/
  fourier-walkthrough.md
  validation-results.md
```

Use small functions and straightforward data structures. Group related helpers in their module; do not create one file for every function. Avoid inheritance, plugin systems, and unnecessary configuration layers.

| Module | Responsibility and boundary |
|---|---|
| `AudioSampler` | Acquire raw samples and report timing/clipping information; no transforms or lighting. |
| `SamplePreprocessing` | Center a sample frame and optionally apply a window; no hardware access. |
| `SyntheticSignals` | Generate known sample vectors without a microphone. |
| `DirectDFT` | Compute complex coefficients using explicit row-by-vector sums. |
| `FastFourierTransform` | Compute the same coefficients through bit reversal and butterflies. |
| `SpectrumAnalysis` | Calculate magnitudes, label bins, and identify peaks. |
| `FrequencyToColor` | Calculate RGB values from defined frequency-band strengths. |
| `RgbLedOutput` | Apply RGB values using the existing PWM approach and pins. |
| `FourierDiagnostics` | Run checks, compare transforms, benchmark, and print results. |

The main loop should visibly read as: collect → prepare → transform → calculate magnitudes → map colours → update LED. Diagnostic mode can run separately from the live loop.

Document each public function's units, array length, input mutation, normalization, and output meaning. Keep raw samples, prepared samples, complex coefficients, magnitudes, and RGB values distinguishable. Preserve input frames when a comparison requires them; an in-place FFT must not overwrite the only copy.

## 5. Ordered implementation checklist

Complete and verify each phase before proceeding. Checked items have local evidence in the source, documentation, test runner, Git history, or compiler output. Physical checks remain unchecked or explicitly identified until they run on hardware.

### Phase 1 — Confirm and preserve the starting point

- [x] Confirm the ESP32 board, microphone module, RGB module, wiring, available speaker, and USB connection.
- [x] Record the fixed presentation constraints: Week 13, 10-minute presentation, 5-minute Q&A, and the 5/5/5 instructor/peer/Q&A grading split.
- [x] Obtain the CS103 textbook glossary from eLearn and create a short project notation sheet before producing final equations.
- [x] Preserve the original application in version control before removing its demo dependencies; avoid committing credentials or generated artifacts.
- [x] Record the current Arduino build command and required toolchain. Establish a baseline compile result and document the microphone/RGB checks deferred until hardware is flashed.
- [x] Remove the retired network playback and screen modules from the firmware and detach the live audio loop from them.
- [x] Permanently delete the retired service directory, including its local credentials, tokens, logs, installed dependencies, dashboard files, and tests, plus the old generated firmware build artifacts.

Acceptance: hardware assumptions are recorded, the original application can be recovered, and the build starting point is known.

Evidence: `docs/project-baseline.md`, Git history through `0d9bd9f` and `749843b`, and the ESP32 compile results in `docs/validation-results.md`.

### Phase 2 — Establish the mathematical explanation

- [x] Define the forward transform as X[k] = sum over n of x[n] exp(-2πikn/N), with indices from 0 to N−1 and no forward normalization. Reformat this with the textbook's notation before placing it on a slide.
- [x] Define F[k,n] = exp(-2πikn/N), giving X = F x. Explain that each output is one matrix row multiplied by the sample vector. Do not insert an extra multiplication symbol unless the glossary requires one.
- [x] Work through the following four-sample example, including at least one full row calculation:

```text
F4 = [ 1   1   1   1 ]       x = [ 1 ]       X = [ 0 ]
     [ 1  -i  -1   i ]           [ 0 ]           [ 2 ]
     [ 1  -1   1  -1 ]           [-1 ]           [ 0 ]
     [ 1   i  -1  -i ]           [ 0 ]           [ 2 ]
```

- [x] Explain complex sinusoidal basis vectors, projections through complex inner products, and orthogonality. State F*F = NI, where F* is the conjugate transpose, and show why x = (1/N)F*X recovers the input.
- [x] Demonstrate superposition: F(ax + by) = aFx + bFy, using two simple signals.
- [x] Explain conjugate symmetry for real input: the final coefficient in the four-point example represents a negative-frequency partner, not an independent extra tone.
- [x] Distinguish the continuous Fourier-transform concept, the finite DFT used in this project, and FFT as an efficient algorithm for the same DFT.
- [x] Explicitly state that magnitudes, thresholding, clipping, and colour mapping are generally nonlinear; the complete sound-to-colour pipeline is not a linear transformation.
- [x] Identify which parts extend beyond material already taught in CS103. Keep prerequisite review brief and spend presentation time on the new algorithm, application, measurements, and team insights.
- [x] Prepare one concise statement of significance: direct DFT exposes the linear algebra, while FFT reorganizes the same calculation so an embedded device can respond in real time.

Acceptance: a teammate can explain the matrix multiplication and why two frequency components appear in a mixture without relying on LED colour as proof.

Evidence: `docs/fourier-walkthrough.md` and `docs/notation-guide.md`.

### Phase 3 — Define configuration and data contracts

- [x] Set the live-demo sample count to 128 and target sampling frequency to 6400 Hz. Derive bin spacing rather than independently hard-coding it.
- [x] Document the nominal 20 ms frame duration, 50 Hz bin spacing, and 3200 Hz Nyquist frequency.
- [x] Allow a bounded set of power-of-two sizes for diagnostics: 32, 64, 128, and 256. Keep this simple and separate from the fixed live-demo configuration.
- [x] Define plain sample and spectrum structures, including the full real and imaginary coefficient arrays.
- [x] Document that the FFT requires a power-of-two length and reject unsupported sizes clearly.
- [x] Define one shared forward sign convention and normalization for both transforms.
- [x] Define raw coefficient magnitude separately from optional calibrated amplitude reporting. Do not label raw ADC or spectral values as physical sound pressure or decibels.

Acceptance: module inputs and outputs are understandable before their implementations are read.

Evidence: `FourierConfig.h`, `FourierTypes.h`, the transform headers, and `docs/notation-guide.md`.

### Phase 4 — Extract and validate the transforms with synthetic input

- [x] Implement the direct DFT as readable nested loops corresponding to Fourier-matrix rows. A stored 128×128 complex matrix is unnecessary; compute its entries as needed.
- [x] Extract the existing custom FFT from `AudioReactive.cpp`, preserving its mathematical convention while introducing explicit names and documented stages.
- [x] Make both transforms independent of Arduino hardware so deterministic checks can run on a host computer as well as the ESP32 where practical.
- [x] Add synthetic vectors for zero input, a constant signal, an impulse, the four-point example, one sinusoid, two sinusoids, and a phase-shifted sinusoid.
- [x] Run raw transform tests without DC removal or a window. In particular, a constant-input test must retain its DC component.
- [x] Check known expected coefficients, not only agreement between the two implementations. For an unnormalized transform, an impulse at sample zero produces all-one coefficients, and a unit cosine at an interior integer bin produces N/2 at each conjugate partner.
- [x] Compare all real and imaginary coefficients using a documented combined absolute/relative tolerance appropriate to float arithmetic and input scale. Report maximum complex error; use absolute tolerance around zero.
- [x] Check linearity numerically before magnitude calculation. Use phase-shifted signals to expose imaginary-sign mistakes.

Acceptance: known results and full complex DFT–FFT agreement pass for each supported diagnostic size. Magnitude agreement alone is insufficient.

Evidence: `tests/fourier_tests.cpp`, `tests/run_fourier_tests.sh`, and `docs/validation-results.md`.

### Phase 5 — Make microphone acquisition reliable

- [x] Extract the ADC sampling logic and retain the existing microphone pin configuration.
- [x] Correct the current integer interval truncation: 1,000,000 / 6400 is 156.25 microseconds, while the existing integer calculation uses 156 microseconds.
- [x] Implement an absolute fractional-microsecond sampling schedule that reports achieved frame timing, maximum lateness, and missed deadlines without burst catch-up.
- [ ] Verify achieved frame timing, jitter, and missed deadlines on the flashed ESP32.
- [x] Keep serial printing and other lengthy work outside the acquisition interval. Start with the simplest timing approach that passes measurement; consider timer/DMA acquisition only if necessary.
- [x] Implement frame-mean subtraction and optional Hamming windowing in `SamplePreprocessing`, retaining the existing window definition for live microphone input.
- [x] Compare DFT and FFT on identical copies of one prepared microphone frame, rather than separately acquired frames.
- [x] Detect microphone clipping and use a fixed startup noise measurement plus fixed gate so adaptation cannot silently change the comparison.
- [ ] Record the quiet-room level and confirm the fixed gate on hardware.
- [x] Document that a window broadens peaks and affects magnitude scaling. Describe 50 Hz as bin spacing rather than a guarantee of resolving tones 50 Hz apart.
- [x] Document the lack of a verified anti-alias filter unless the physical circuit provides one. Keep controlled tones below Nyquist and describe music analysis as qualitative.

Acceptance: measured timing supports the frequency labels, clipping is recognizable, and live preprocessing is clearly separated from raw mathematical tests.

### Phase 6 — Define spectrum interpretation and RGB mapping

- [x] Calculate coefficient magnitude as sqrt(real² + imaginary²).
- [x] Retain the complete transform for correctness checks. Display the nonnegative-frequency half for real microphone input; handle DC and Nyquist explicitly.
- [x] Label interior positive-frequency bins using frequencyBinIndex × samplingFrequencyHz / numberOfSamples. Document that upper-half full-transform bins represent negative frequencies.
- [x] Use the following nominal live-demo band mapping:

Preserve the frequency-to-colour mapping from the existing project:

| Bin indices, inclusive | Bin-centre frequencies | Frequency range | RGB channel |
|---|---|---|---|
| 1–5 | 50, 100, 150, 200, 250 Hz | Bass | Red |
| 6–20 | 300–1000 Hz | Midrange | Green |
| 21–50 | 1050–2500 Hz | Treble | Blue |

These are adjacent bin groups, not continuous-frequency gaps. At 50 Hz per bin, there is no bin between 250 and 300 Hz or between 1000 and 1050 Hz. DC and bins above 50 do not contribute to colour.

- [x] Define band strength consistently as sqrt(sum of squared coefficient magnitudes in the band). Avoid calling magnitude, squared magnitude, and energy interchangeable quantities.
- [x] Apply explicit provisional fixed channel gains, a documented common brightness scale, output limits, and a simple silence threshold. Avoid independently normalizing every band to full brightness.
- [x] Extract the existing PWM output into `RgbLedOutput`, keeping hardware details out of `FrequencyToColor`.
- [x] Remove beat flashes, automatic palettes, and other effects that obscure the frequency-to-colour relationship.
- [ ] Calibrate the red/green mixture using the actual speaker and microphone. Equal browser tone amplitudes do not guarantee equal measured band strengths or a visually balanced yellow.
- [x] Keep the same mapping in the code, serial diagnostics, browser labels, documentation, and presentation materials so teammates never have to translate between different band definitions.

Acceptance: single controlled tones primarily activate their assigned channels, a mixture retains both components, and quiet input turns the LED off.

### Phase 7 — Create the localhost tone generator and independent live loop

- [x] Create a small static page served on localhost with Play, Stop, volume, and independent selections for 200, 500, 1000, and 2000 Hz, plus a 225 Hz leakage test.
- [x] Generate sine waves in the browser using Web Audio, starting audio in response to a user gesture.
- [x] Leave sufficient output headroom when multiple tones play. Use brief gain ramps when starting and stopping to reduce clicks.
- [x] Explain the physical route on the page or in the guide: browser → speaker → air → microphone → ESP32. The browser does not send sample vectors to the board.
- [x] Provide a simple local serving command without credentials, external assets, or a backend.
- [x] Make the demo sketch's sampling path independent of network playback and screen initialization.
- [x] Run the live pipeline independently and expose numerical results through USB serial at a limited rate.
- [ ] Verify the complete browser → speaker → microphone → ESP32 path after flashing.

Acceptance: the page works without internet access once locally served, and the ESP32 processes sound as a standalone device.

### Phase 8 — Benchmark and record evidence

- [x] Implement same-device direct DFT and FFT benchmarking with the same build, sample size, and input data; collect the final rows after flashing.
- [x] Time the transform alone; exclude acquisition, preprocessing, magnitude calculation, serial output, LED updates, and test-signal construction. The FFT timing includes its internal copy and twiddle calculations.
- [x] Warm up, repeat measurements, and report median elapsed time and variation. Consume output through a checksum so compiler optimization cannot discard the work.
- [x] Compare 32, 64, 128, and 256 samples using the same normalized-bin construction at each size.
- [x] Explain O(N²) versus O(N log N) from algorithm structure. Do not claim a finite timing table proves asymptotic complexity or that every FFT implementation must win at every size.
- [x] Record the provisional host table containing sample count, complex-output error, direct DFT time, FFT time, and measured speedup.
- [ ] Record the on-device table from the startup diagnostic after flashing.
- [x] Create an original provisional host chart with labelled axes, units, sample sizes, and measurement conditions.
- [ ] Replace the provisional chart with the ESP32 measurement for the presentation.
- [x] Keep direct DFT comparison and benchmarking out of the continuous live loop; invoke them at startup and once for an above-threshold live frame.

Acceptance: the report distinguishes mathematical complexity, measured implementation performance, and full live-system latency.

### Phase 9 — Perform end-to-end checks and rehearse

- [x] Compile the simplified Arduino sketch with the established ESP32 toolchain and document the reduced dependency list.
- [x] Run the deterministic transform and signal-processing checks and retain their results.
- [x] Implement a labelled red/green/blue startup self-test before acoustic testing.
- [ ] Observe and verify the individual RGB channels on hardware.
- [ ] Test 200 Hz → bin 4/red, 500 Hz → bin 10/green, 1000 Hz → bin 20/green, and 2000 Hz → bin 40/blue at the nominal sampling rate.
- [ ] Test 200 + 1000 Hz and confirm two distinct spectral peak regions, alongside the calibrated mixed colour. Do not count neighbouring window lobes as separate tones.
- [x] Define the live frequency acceptance tolerance before testing: initially use a dominant peak within one nominal bin, and investigate systematic offsets using measured sample timing.
- [ ] Test silence, excess volume/clipping, and an off-bin tone such as 225 Hz. Explain leakage rather than expecting a single populated bin.
- [ ] Rehearse using the actual room, speaker, microphone distance, and power setup. Keep the implemented synthetic diagnostic and saved results available as a fallback, clearly labelled as synthetic or previously recorded.
- [ ] Optionally play music after the controlled demonstrations. Explain that RGB channels summarize selected bands and do not reconstruct the original audio.
- [x] Record which checks ran on the host and compiler, and leave ESP32, browser-audio, and physical-hardware observations explicitly pending.

Acceptance: controlled demonstrations are repeatable, numerical evidence is available, and any hardware limitations are stated accurately.

### Phase 10 — Prepare teammates and presentation materials

- [x] Write `docs/fourier-walkthrough.md` as an internal learning aid with the project goal, signal path, notation-to-variable table, module map, and worked four-point multiplication. It is not a required submitted report.
- [x] Set the reading order: main sketch → mathematical example → `DirectDFT` → spectrum/colour mapping → FFT explanation → optional hardware internals.
- [x] Explain the FFT as structured reuse of smaller transforms, supported by one butterfly example. Teammates need not memorize the entire implementation to explain its role.
- [x] Write `docs/validation-results.md` with correctness results, provisional timings, pending acoustic observations, and remaining limitations.
- [x] Update `README.md` with demo wiring, build/upload steps, browser startup, diagnostic mode, expected results, and troubleshooting.
- [ ] Create an original slide deck for live delivery even though no slide submission is required. Use equations, diagrams, plots, and measured results rather than code-heavy slides.
- [ ] Audit every final equation against the CS103 textbook glossary: notation, square-bracket matrices and vectors, multiplication formatting, subscripts, complex conjugation, and indices.
- [ ] Assign presentation sections by concept: sample vector and matrix multiplication; DFT/FFT equivalence and efficiency; spectrum and physical demonstration. Ensure everyone understands the full shared mathematical story, not only their assigned section.
- [ ] Ask a teammate unfamiliar with the implementation to trace a 200 Hz input through the modules and explain why the DFT and FFT outputs agree. Revise names or documentation wherever they get stuck.
- [x] Build a Q&A bank covering definitions, matrix dimensions, complex numbers, conjugate symmetry, sampling, Nyquist frequency, leakage, windowing, FFT complexity, timing methodology, colour mapping, limitations, and hardware failure cases.
- [ ] Rehearse Q&A by randomly directing every question to any team member. Continue until all members can answer accurately and concisely without handing technical questions back to the hardware/FFT specialist.
- [ ] Run at least two timed full rehearsals including speaker handoffs and the live demo. Target about nine minutes so a minor delay does not exceed the ten-minute limit.
- [x] Prepare a graceful demo fallback using clearly labelled synthetic or previously recorded results; the verbal explanation must remain complete if the acoustic hardware misbehaves.
- [x] Write a professional delivery guide: define terms before using them, speak to the audience rather than the screen, and explain each visual's conclusion.
- [x] Review the rubric in the presentation outline so peer critiques use the assigned categories and specific evidence.

Acceptance: the demo and its explanation can be operated and presented without the original author narrating every step.

## 6. Suggested ten-minute presentation sequence

| Target time | Content | Rubric purpose |
|---:|---|---|
| 0:00–0:30 | Introduce the question and sound-to-colour signal path. | Motivation and clear application. |
| 0:30–1:15 | Introduce the continuous Fourier transform as decomposition of a continuous signal into frequencies. | Establish the general idea without spending too long on background. |
| 1:15–2:00 | Explain why sampled computer input requires the discrete Fourier transform. | Connect the continuous and discrete forms. |
| 2:00–4:30 | Work through the four-point DFT matrix, including one complete row calculation, basis interpretation, and the resulting frequency coefficients. | Theoretical depth, linear algebra, and precise equations. |
| 4:30–5:00 | State linearity and transition from the worked calculation to the physical sample vector. | Interconnections and a clear handoff to the demo. |
| 5:00–6:30 | Run the direct DFT on a controlled input and show its detected coefficient or frequency bin and RGB result. | Make the matrix calculation concrete. |
| 6:30–7:45 | Run the FFT on the same input, show matching complex results, and explain butterfly reuse. | Establish that FFT computes the same DFT. |
| 7:45–8:30 | Show the measured DFT/FFT timing comparison and explain the embedded-computing benefit. | Significance and efficiency. |
| 8:30–9:30 | Demonstrate individual and mixed tones through the microphone and RGB output. | Original physical application and audience interest. |
| 9:30–10:00 | State limitations, restate the main finding, and transition to Q&A. | Critical evaluation and a cohesive close. |

Music should only be used if rehearsal shows there is spare time; it must not displace the controlled evidence.

## 7. Final completion checklist

- [x] The project explicitly demonstrates matrix multiplication, orthogonality, and linearity.
- [x] Direct DFT and FFT agree on full complex outputs and known expected results.
- [x] Timing results use comparable inputs and clearly defined measurement boundaries; final device values remain pending.
- [ ] The hardware works without Wi-Fi or internet dependencies.
- [ ] The colour mapping is simple, documented, and calibrated.
- [ ] Teammates can navigate the implementation and explain their presentation sections.
- [ ] Every team member can answer questions across the theory, algorithm, experiment, and hardware rather than only their assigned section.
- [ ] The talk completes within ten minutes and the team is ready for five minutes of Q&A.
- [ ] Slides use original visuals and LA4CS-compatible, glossary-checked mathematical notation.
- [x] The presentation outline explicitly explains the significance and benefits of FFT-based real-time analysis.
- [x] Documentation separates mathematical proof, automated checks, and physical observations.
- [x] No unrelated features or build-system migration were introduced.

## 8. Mathematical references

- [Julius O. Smith, Mathematics of the DFT: derivation and matrix formulation](https://dsprelated.com/freebooks/mdft/DFT_Derived.html) — basis vectors, orthogonality, matrix form, and normalization.
- [FFTW: complex DFT conventions](https://www.fftw.org/fftw3_doc/Complex-DFTs.html) — forward sign, normalization, and frequency ordering. Reference only; replacing the custom FFT with FFTW is not part of this plan.
