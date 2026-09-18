# Ten-minute presentation outline

The story is: **the DFT is a linear transformation; the FFT computes the same result with structured reuse; the hardware makes selected frequency components visible.** Aim for about nine minutes in rehearsal.

| Time | Visual and action | Speaker point |
|---:|---|---|
| 0:00–0:30 | Original sound → samples → spectrum → RGB diagram | Introduce the question: how can sampled sound become colour? |
| 0:30–1:15 | Continuous signal and its continuous Fourier transform | The general transform decomposes a continuous signal into frequencies. |
| 1:15–2:00 | 128 sample dots replacing the curve | A computer has a finite vector, so this project uses the DFT. |
| 2:00–4:30 | Build the 4×4 Fourier matrix and multiply one row | Show `X = F x`, calculate `X[1] = 2`, then reveal `[0, 2, 0, 2]`. Explain the conjugate pair. |
| 4:30–5:00 | Two inputs adding before and after the transform | State linearity and connect the worked vector to microphone samples. |
| 5:00–6:15 | Controlled 200 Hz demo plus serial coefficient/bin result | The direct DFT performs the visible matrix row sums. Red is a display of the selected bass bins, not proof by itself. |
| 6:15–7:15 | One butterfly diagram, then FFT result beside DFT result | The FFT reuses even and odd sub-results and returns the same complex vector. |
| 7:15–8:00 | Device benchmark chart | Contrast measured time with `O(N²)` and `O(N log N)` algorithm structure. |
| 8:00–9:00 | 200, 1000, 2000, then 200+1000 Hz | Demonstrate red, green, blue, and a mixed colour with numerical serial evidence. |
| 9:00–9:30 | Limits card | Mention sampling accuracy, room response, leakage, fixed calibration, and unverified anti-alias filtering. |
| 9:30–10:00 | Return to the signal-path diagram | Efficient spectral decomposition makes live response practical on the ESP32. Invite questions. |

## Required original visuals

- A team-made signal-path diagram.
- The four-point matrix built one row at a time.
- A time-domain plot beside its frequency-domain coefficients.
- A butterfly showing `E + W O` and `E − W O`.
- The measured ESP32 timing chart, replacing the provisional host chart.
- A photograph or short backup video of the actual wired system.

Avoid code screenshots. When implementation detail matters, show the mathematical operation and one explicit variable name.

## Speaker assignment worksheet

| Section | Presenter | Backup presenter |
|---|---|---|
| Motivation, continuous FT, sampled vector |  |  |
| Matrix multiplication and worked example |  |  |
| DFT/FFT equivalence and butterfly |  |  |
| Benchmark, RGB mapping, live demo, limitations |  |  |

Every presenter should still be able to answer questions from every section.

## Delivery and peer-review check

- Define DFT, FFT, bin, and Nyquist frequency before relying on them.
- Keep equations readable and state the conclusion of each visual aloud.
- Face the audience, use deliberate handoffs, and let every member speak.
- Judge other teams using the same evidence categories: theoretical accuracy, application, significance, clarity, original visuals, timing, and Q&A readiness.

## Demo fallback

If acoustic input fails, show the saved startup synthetic benchmark and one clearly labelled previously recorded live run. Continue the mathematical explanation unchanged. Do not present saved data as a current measurement.
