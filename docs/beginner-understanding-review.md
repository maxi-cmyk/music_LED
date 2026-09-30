# Beginner understanding review

Reviewed 1 October 2026. Audience: basic matrix multiplication, little familiarity with complex numbers or algorithmic complexity, and no assumed signal-processing or hardware knowledge.

Scope: all three website routes (Toy example, Live ESP32, Presenter), including their generated labels, plots, and captured-frame explanations. This is a source-based teaching review, informed by the supplied screenshot; it is not a learner usability study. Findings below remain recommendations unless explicitly marked implemented.

## Main finding

The site has useful worked calculations, but often explains a new idea using several other unfamiliar ideas. Adding paragraphs beside every formula makes this worse. Teach one concrete meaning first, show one example, then offer the derivation.

Keep three layers distinct:

1. **Always visible:** what the reader is looking at and what to notice.
2. **Worked example:** a small calculation tied to the visible graph or numbers.
3. **Optional detail:** derivations, hardware preparation, special cases, and proofs.

## Gaps, in learning order

| Priority | Where / evidence | Likely beginner question or mistaken inference | Suggested treatment |
| --- | --- | --- | --- |
| High | Toy example starts with “Discrete frequencies,” then “Composite waveform and constituent frequencies”; buttons use Hz. | What is frequency? Is a higher number louder? What do the curves show? | Start with “Choose tones.” Define frequency as repetitions per second, and 200 Hz as 200 cycles each second. Label the horizontal axis as time and the vertical axis as the generated signal value. Show that higher frequency means more cycles in the same time; distinguish this from a taller wave. |
| High | Toy example sample slider; Presenter “Sound becomes a column vector.” | What is being measured? Is one sample a sound, a frequency, or the entire recording? | Show a short bridge: air pressure → microphone voltage → a number. Name the ESP32 as the small computer board and ADC as the voltage-to-number converter. Highlight one dot on the waveform and the corresponding vector entry together. Define a frame as one group of 128 readings. |
| High | Toy example and Presenter use 6400 Hz sample rate, 200 Hz tones, 128 samples, and 50 Hz row spacing. | Are 6400 and 200 measuring the same thing? Why are there 128 readings rather than 6400? | Use a compact distinction: tone frequency = cycles/second; sample rate = readings/second; frame size = readings per calculation. Show 6400 readings/second × 0.020 seconds = 128 readings. Then explain 50 Hz as the spacing between tested patterns, not a sample rate. |
| High | Fourier overview uses x, F, X, real/complex spaces, and a row formula together. | Why does the output differ from the input? Does F contain recorded sound? Why is it square? | **Overview shortened in this change:** show input column, matrix dimensions, row count, and output column in three short definitions. Keep the hardware explanation expandable. A future small example should demonstrate that F contains fixed measuring weights while x contains changing readings. |
| High | Presenter starts the matrix lesson with “cosine alignment,” “phase,” and Euler’s formula; Toy example calculates complex results. | Why do sine, cosine, and imaginary numbers appear when the readings are ordinary numbers? | First show one tone shifted in time: its starting position changes, but its frequency does not. Introduce a complex number as a pair of measurements, then show a + bi as a point (a, b). Use 3 + 4i → length 5 before introducing the exponential notation. A worked visual explanation is still missing. |
| High | Presenter “Why FFT is faster” begins with an inner product and O(N²), then “radix-2,” partitions, and recursion. | Is Big-O a time in seconds? Why is log₂128 equal to 7? Is FFT a different answer? | Say first: DFT names the calculation; FFT is a faster way to obtain the same results. Count 128 rows × 128 products, then show the seven halvings from 128 to 1. Introduce Big-O only after explaining that it describes how work grows when the input grows. Put the recurrence proof behind optional detail. |
| Medium | Presenter FFT table shows 896; Live FFT shows 448 butterflies versus 16,384 weighted samples. | Why are there two FFT counts? Does dividing these numbers give an exact speedup? | Label 896 as N log₂N, a growth-model value; label 448 as the number of butterflies for this implementation size. Explain that one butterfly includes several operations. These are different counting units, and neither establishes measured runtime. |
| High | Live spectrum canvas draws magnitude numbers with a logarithmic mapping and changing scale; caption reports source/peak information. | Is a bar voltage, loudness, or decibels? Does twice the height mean twice the strength? | Add explicit axis meaning and a short “How to read this graph” note. State that bars show transform magnitude, not calibrated sound loudness; explain the compressed vertical scale and automatic rescaling. Prefer an illustrative two-tone example for waveform-versus-spectrum reading. |
| Medium | Live input lists mean, Hamming weight, and prepared input without explaining why preparation is necessary. | Why change measured numbers before analysing them? Does a negative value mean negative sound? | Explain mean subtraction as moving the resting level to zero. Show one subtraction, such as 2135 − 2125 = 10, labelled illustrative. Explain edge weighting as softening the abrupt beginning/end of the short recording, which reduces frequency spreading. Distinguish recording duration (“window”) from the weighting function. |
| Medium | Live bin slider mentions mirrored rows; Presenter row buttons introduce Nyquist and negative frequency. | Is bin 4 a 4 Hz tone? Are rows 65–127 additional high audible frequencies? | Define bin as a numbered frequency result; show bin 4 × 50 Hz = 200 Hz beside the control. Introduce the real-input paired results before the word “mirror.” Explain Nyquist only when selecting the half-sample-rate pattern. Keep negative-frequency detail optional. |
| Medium | Toy 225 Hz option is named “Leakage”; generated text says rows 4 and 5 “share its energy.” | Are there two tones? Does all the result appear in just those two rows? | Call it “Between frequency steps” initially. Explain that a tone between tested frequencies spreads across multiple results. The page shows two neighbouring rows as examples, not the full spread; say so explicitly. Keep “spectral leakage” as the term introduced after the observation. |
| Medium | Live colour mapping introduces band norms, G, leakage rejection, PWM, 2125, and ceiling notation. | Does Fourier automatically assign red to bass? Why square and add? What does PWM 255 mean? | Lead with the design choice: low, middle, and high frequency groups control red, green, and blue. Show the band calculation as the familiar vector length. Define a gain as a multiplier and brightness values as 0 = off, 255 = maximum. Separate calibration and filtering choices from Fourier mathematics; retain their numerical derivation as optional detail. |
| Medium | Presenter sample lesson introduces unit vectors, then a mixture with M and a sum indexed by m; later the matrix and FFT examples use different x vectors. | What are eₙ and M? Why did the sample values change? Does x always mean raw ADC counts? | Defer the basis-vector expansion. Define M as the number of chosen tones and explain averaging. Label each worked input “new four-sample example.” Keep raw a[n], prepared x[n], and generated toy x[n] distinct at the point of use. |
| Medium | Live page starts with Connect ESP32 / Close Arduino Serial Monitor. Simulated data is accessed through Shift+E. | Can I use this without owning the board? What is Serial Monitor? What does “seeded” mean? | Make “Load simulated example” a visible action with a simulation label; retain the shortcut as an alternative. Add one sentence explaining that connection reads measurements from the USB board. Keep hardware setup separate from the mathematical lesson. |

## Recommended learning sequence

1. A tone repeats; Hz counts repetitions each second.
2. A waveform shows a value changing over time.
3. Sampling records that value at separate instants; a column stores the readings.
4. One row of weights checks for one pattern using a familiar dot product.
5. Two measurements handle different starting positions; complex numbers store the pair.
6. Stack rows to obtain X; magnitude produces the spectrum.
7. FFT reuses arithmetic to obtain the same X; explain growth only after counting work.
8. Hardware preparation and RGB mapping apply the method to this project.

The Toy example should remain usable without reading Presenter first. Give each control its essential meaning locally, then link to a specific lesson for the explanation. Do not solve missing prerequisites by adding a large glossary before the user can try anything.

## Scope of the applied change

The Toy example’s Fourier overview now explains the 128-by-128 shape with a four-sample analogy, then gives the row result and mirrored bins in three definitions and one compact formula. The 50 Hz spacing stays beside the worked rows. It distinguishes a scalar sample x[n] from the input column, uses 128-by-1 and 128-by-128 dimensions, and labels generated samples and results as unitless. Only microphone conversion and ADC-count units remain expandable. The worked per-tone calculations remain visible. Other findings above are an implementation backlog, not completed changes.

## Checks for a future learner walkthrough

Ask the learner to explain, without reading a formula aloud:

- What does one entry of x represent, and what does its position tell you?
- How does 200 Hz differ from 6400 readings per second?
- What does one row of F do, and where does its answer go?
- Why might the answer need two numbers, and what does its magnitude mean?
- What does bin 4 mean in this example?
- Why do DFT and FFT give the same answer, and what work is reused?
- Which parts of the LED mapping are chosen for this device rather than required by Fourier theory?

These are proposed comprehension checks; no learner testing has been performed.

## Presentation path applied on 1 October 2026

The ten-minute route now begins with phase, a simple complex-number magnitude, and Euler's formula. It then shows four sampled values reinforcing or cancelling, moves to the controlled tone mixture, calculates a Fourier matrix row, shows the live spectrum and RGB gain matrix, and closes with FFT reuse. The timed speaking cues and failure route are in [`presentation-run-of-show.md`](presentation-run-of-show.md).

The Presenter and Live pages were changed for these teaching points. The larger backlog above still includes a true phase-shifted waveform visual, clearer axes in the Toy example, a more approachable off-bin example, hardware terminology throughout the captured-frame workbench, and real learner testing.
