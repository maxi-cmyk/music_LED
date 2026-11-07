# Live demo script (about 3 minutes)

Where it sits: after the slides on the DFT as $\mathbf{X}=\boldsymbol{F}\mathbf{x}$ and the $N=4$ toy example. The slides carry the ideas. This demo is the `main` site (Toy example and Live ESP32 pages), and it ends by showing the FFT tab for the same captured frame. The `sh_branch` helper site is the "more info" link, not part of the live demo.

Spoken lines are in quotes. Actions are in brackets.

## Before the talk

- Run `python3 -B webpage/serve.py` and open `http://127.0.0.1:5137` in desktop Chrome or Edge.
- Close Arduino Serial Monitor (only one program can own the USB port). Connect the board on Live ESP32 and check the LED.
- Set the speaker volume to the rehearsed level (the page starts at 20%). Have a music track cued.
- Fallback if USB or the mic fails: press Shift+E on Live ESP32 for the labelled seeded frame, and say aloud that it is simulated.

## 1. Toy example: build a sound from frequencies (0:30)

[Toy example page. Press the **Bass + Mids** preset, then Play.]

"Here the sound is built from pure tones: 200 Hz and 500 Hz. With 128 samples at 6400 samples per second, the frequency bins are 50 Hz apart, so these are bin 4 and bin 10. The plot shows each tone and their sum, which is the wave the microphone will hear."

[Stop audio. Switch to Live ESP32.]

## 2. Live ESP32: the measured spectrum (0:40)

[Play the same two tones, then a short piece of music. Point at the bars, then at the LED.]

"The route is physical: speaker, air, microphone, ESP32. The bars are the spectrum the ESP32 computed. Bass bins drive red, mids drive green, treble drives blue. Two tones show up as two bars, and the LED mixes their colours. The exact colour depends on our speaker and microphone, so this shows the band mapping, not a calibrated measurement."

[Press **Capture frame** during a sustained sound.]

"I have frozen one frame: 128 readings, 20 milliseconds of sound. The rest of the demo uses this one frame."

## 3. Measured input and one DFT bin (0:50)

[Measured input tab.]

"The raw readings sit around the microphone's middle voltage. We subtract the mean and fade the edges with a Hamming window, and that gives the input vector $\mathbf{x}$."

[Direct DFT tab. Leave the bin on 4, press Replay.]

"This is one row of the Fourier matrix applied to $\mathbf{x}$. Each of the 128 samples adds one small complex vector, and the plot adds them head to tail. The endpoint is $X_4$, the 200 Hz coefficient. Now a bin with no tone in it [step the slider to a bin you checked in rehearsal]: the endpoint stays near the origin, so there is almost nothing at that frequency.

That was one bin. All 128 bins, each with 128 products, is 16,384 products. This is the cost we need to cut."

(Skip the Colour mapping tab. It is for questions.)

## 4. FFT tab: the same answer with less work (0:50)

[FFT tab. Step through the four panels without reading the equations.]

"The FFT computes exactly the same $\mathbf{X}$. Split the 128 samples into even and odd positions. Each half is a 64-point DFT, and one rotated product is shared by two outputs: $X_k = E_k + W^{k}O_k$ and $X_{k+64} = E_k - W^{k}O_k$. That pair is a butterfly. Keep halving, and there are seven stages of 64 butterflies."

[Final panel: 448 butterflies against 16,384 products. Replay the tree once.]

"So 448 butterflies against 16,384 products: $O(N\log N)$ against $O(N^2)$."

[Open **Numerical butterfly for this captured frame**.]

"And it is the same answer: for this frame, the FFT coefficients match the ones the ESP32 computed."

## 5. Close (0:10)

"One frame becomes 128 complex coefficients, then three band strengths, then one LED colour. The step-by-step matrix view of the FFT is on our helper website."

## Say carefully

- Say "448 butterflies against 16,384 products". They are different units of work, so do not call it a 36-fold speedup or an elapsed-time result.
- The timings in `docs/comparison.md` (for example 178 µs against 2 µs at $N=128$) were measured on the development computer, not the ESP32. Only quote them if you label them that way.
- The FFT is not an approximation. It is an exact factorisation, and the two routes differ only by rounding.
- The saving comes from reusing the half-size results. Bit operations only make the reordering cheap, so do not say "bit shifting makes it fast".
- The LED shows band strengths. It does not prove the transform is correct, and it cannot rebuild the sound.

## If time runs short

Cut in this order: the Toy example (start at section 2), the empty-bin comparison, the numerical butterfly. Keep the live LED, the one-bin trace and the 448 against 16,384 line.
