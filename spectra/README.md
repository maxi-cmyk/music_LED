# Spectra

Run `npm install`, then `npm run dev` from this folder. It serves Spectra at `http://127.0.0.1:8080`; root-level `npm run dev` and `python3 -B serve.py` start the same app. Use HTTPS or localhost for microphone access. `npm test` checks the microphone response and lifecycle; `npm run build` produces the static app.

When enabling the microphone, keep quiet for about one second so Spectra can estimate the room noise. Each restart repeats this check. One adaptive gain follows the strongest Fourier band, with fast attenuation for loud sounds and slow recovery for quieter sounds. Gain recovery pauses below the noise gate. The three colours share the same radius range and smoothing, preserving band proportions until the bounded display range clips a transient.

Spectra imports the original webpage's centring, Hamming window, FFT, and frequency bands. It uses raw band strengths rather than the ESP32 LED brightness calibration. Browser input is low-pass filtered and resampled to 128 samples at 6.4 kHz, including when the browser rejects a 6.4 kHz AudioContext. Unprocessed mono microphone input is requested where the browser supports it.

Adaptive gain compensates for overall microphone level, not differences in microphone frequency response. The noise estimate is conservative: unusually noisy rooms or sound playing during the initial quiet check can affect detection. Stop the microphone and restart in a quiet moment if needed. Physical microphone comparisons are still required; automated tests use synthetic signals and mocked microphone APIs.
