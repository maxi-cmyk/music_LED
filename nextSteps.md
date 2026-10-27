# Music LED: next steps

- for main branch, remove the composite graph animation, fourier matrix breakdown and the F128 animation (will be on deployed website)
- only need to retain live esp32 page and the discrete frequencies demo 
- FFT is too much content, need to break it down 

## Fourier Analysis page plan (spectra)

Overview = "what happens"; Fourier Analysis = "why it works". Reuse the Overview's visual language and the same signal; Sandbox is free play.

Reuse: `docs/fourier-walkthrough.md`, `docs/how-the-fourier-matrix-arises.md`, `docs/presentation-run-of-show.md`, firmware `DirectDFT` / `FastFourierTransform`.

### Sections (each answers one question, ends on a visible result tied to the LED)
1. Samples are a vector: a 128-sample frame is a point in R^128.
2. Phase and Euler: sine check catches what cosine misses; e^{-i*theta} = cos - i sin; 3+4i has magnitude 5.
3. One frequency = one dot product: a Fourier-matrix row is a test pattern.
4. Stack rows into the matrix: X = Fx; N=4 worked example, 128x128 as a heatmap.
5. Orthogonality and linearity: each bin measures one thing, tones add, transform is invertible.
6. Bins to bands to colour: 6400/128 = 50 Hz spacing, magnitudes, bass/mid/treble sums, u = Gb (note the nonlinear steps).
7. Why FFT: one even/odd split, one butterfly; 128^2 products vs 7 stages x 64 butterflies. Keep to one beat; drop if short on time.

### Build order
1. One-page outline with time budget per section; cut what doesn't serve the LED story.
2. Shared math rendering (KaTeX) + one reusable step component.
3. Sections 3-5 first (core argument, interactive: row.signal dot product, orthogonality check, tone mixing).
4. Sections 1, 2, 6 (mostly reuse).
5. Section 7 last.
6. Sandbox: drag tones, see spectrum and LED colour; hosts the "simulated demo frame" fallback.
7. Small `.test.mjs` checks (DFT, FFT, band sums) so on-screen numbers match firmware.

### Open decisions
- One scroll-driven page (like Overview) or separate pages per topic?
- Audience comfort with complex numbers (full beat vs short bridge for section 2)?
- Still a ~10 min talk with live ESP32 demo? (decides whether section 7 survives)
