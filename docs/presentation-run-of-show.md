# Ten-minute Fourier and Music LED presentation

Aim for **9:20**, leaving 40 seconds for page changes or a slow hardware response. Use the Presenter, Toy example, and Live ESP32 pages in that order. The presenters should say the main sentence in each stage and let the live result carry the explanation. All times include switching pages and speakers.

| Time | Show | Say and do | Beginner bridge |
| --- | --- | --- | --- |
| 0:00–1:15 | Presenter → Phase & Euler | Show that the same repeating wave can start at different positions. A cosine check alone can miss it; a sine check catches it. Use $3+4i$ as two stored measurements and $|3+4i|=5$ as their combined strength. Then show $e^{-i\theta}=\cos\theta-i\sin\theta$. | Define *phase* as the starting position in a cycle and $i^2=-1$ before the formula. No complex-plane derivation. |
| 1:15–2:45 | Presenter → Add signals, then Toy example | Press “Peaks together,” then “Peak meets dip.” Compare the four entries of each sum. Switch to Toy example; play bass, then add mids and point to the component curves and combined waveform. | Hz means cycles per second. One sample is one number measured at one instant; a frame is 128 samples. Two equal opposite-phase waves cancel throughout the example. The mixed tones add to *build* a signal; the DFT later measures its ingredients. |
| 2:45–4:25 | Presenter → DFT matrix | Use the $N=4$ input to demonstrate one row-by-column product. State that four rows produce four outputs. With 128 samples, the same rule needs 128 columns and 128 rows; 200 Hz is row 4 at 50 Hz spacing. | $F$ holds fixed test patterns; $x$ holds samples; $X$ holds one answer per row. Explain a frequency “bin” as one numbered result. Do not explain all 128 weights. |
| 4:25–7:25 | Live ESP32 → spectrum and RGB; one capture only if ready | Connect before speaking if possible. Play a short complex music passage and point out several bars, then the red/green/blue LED strengths. Point to the always-visible $\mathbf u=G\mathbf b$ relationship; if the capture is ready, open Colour mapping for the three numerical gains. | Spectrum bars are frequency-pattern strengths computed by the ESP32 FFT, not calibrated loudness. Red/bass, green/mids, blue/treble are design choices. The square-and-sum band strengths, threshold, clipping, and PWM brightness occur outside the linear gain matrix. |
| 7:25–9:00 | Presenter → Why FFT | Return to the presenter page. Trace one even/odd split and one butterfly: it combines two smaller answers into the same DFT result. Show the four-sample split, one rotated odd answer, and the pair of butterfly outputs. Then state that 128 samples need seven stages of 64 butterflies. | DFT names the desired calculation; FFT names the faster method. Seven comes from halving 128 to 1 seven times. Big-O describes growth with input size; a butterfly and a sample product are different counting units. |
| 9:00–9:20 | Presenter or live image | Close with “one frame becomes frequency results, then three LED strengths.” State 50 Hz spacing, uncalibrated microphone magnitude, and the chosen colour mapping. | End on the physical result. |

## Stage transitions and recovery

- Open the site locally before the talk, connect USB, and verify the LED. Start with the Presenter page at the phase section. Set the Toy example to a simple bass tone. Keep volume at the rehearsed safe level.
- Moving to Toy example retains the shared browser session. The four-number cancellation demonstration lives in Presenter; Toy example adds different generated tones to form a mixture. Do not say the Toy example proves exact cancellation or performs inverse DFT reconstruction.
- If USB or the microphone fails, use the clearly labelled **simulated demo frame** (Shift+E on Live ESP32) or a prepared recording. Say aloud that it is simulated or recorded. Do not present it as a live measurement.
- If time slips, skip the live capture workbench and the second FFT pair. Keep the matrix row example, the live colour result, and one FFT butterfly.
- Have one presenter handle the serial permission and audio controls while the speaker continues the explanation. Rehearse both the normal route and the failure route with a stopwatch; shorten any segment that exceeds its time box.

## Accuracy checks for rehearsal

- The four-number “Peak meets dip” example uses the same frequency at opposite phase. A combination of different frequencies can cancel at individual times but generally does not disappear from the full frequency analysis.
- $G$ is a diagonal matrix of calibrated channel gains. The complete audio-to-colour pipeline is not a single matrix multiplication because magnitudes, band aggregation, thresholds, and brightness mapping are nonlinear.
- The 448 butterflies at $N=128$ and $128\log_2 128=896$ compare different units of work. Neither is an exact speedup or elapsed-time measurement. Use actual ESP32 timing only if final measured values are on hand and labelled.
- A 128-sample frame at 6400 samples per second lasts 20 ms. The last sample is taken at about 19.84 ms; this is consistent with 20 ms frame duration.
