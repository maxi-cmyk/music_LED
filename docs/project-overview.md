# Project overview

Music LED turns sound into colour: low sounds glow red, middle sounds green, high sounds blue.

## The main mechanism

1. **Record a frame of sound.** The microphone is read 128 times in a row at 6400 readings per second. Together these readings cover 20 ms of sound (128 ÷ 6400 s) and form one *frame*. Each reading is one number: how far the sound wave is pushed at that instant.

2. **Clean the frame.**
   - *Centre it:* subtract the frame's average so the wave oscillates around zero.
   - *Taper the edges:* multiply by a Hamming window, which fades the frame in and out. Without it, the sharp cut at the frame's edges smears a single tone across many frequencies.
   - *Silence gate:* the frame's loudness (RMS) is compared with a noise level measured at start-up (×1.15). Below that, the LED stays off, so background hiss does not flicker.

3. **Break the frame into frequencies.** A fast Fourier transform (FFT) splits the frame into 50 Hz-wide slots called *bins* (6400 ÷ 128), covering 0–3200 Hz. This is like splitting a colour into its RGB amounts, except the "ingredients" are pure tones. The bins are grouped into three bands:

   | Band | Bins | Frequencies |
   |---|---|---|
   | Bass | 1–5 | 50–250 Hz |
   | Mids | 6–20 | 300–1000 Hz |
   | Treble | 21–50 | 1050–2500 Hz |

   Bin 0 (the constant offset) and bins above 50 are ignored.

4. **Turn bands into colour.** Bass drives red, mids green, treble blue. Each band's strength is:
   - multiplied by a per-channel gain (R 1.0, G 0.82, B 0.92) to balance perceived brightness,
   - cleaned of weak leakage (anything under 15% of the strongest band is removed, so a bass note does not tint the LED with stray green/blue),
   - scaled to 0–255 and sent to the LED as PWM.

   The three channels then mix in the eye: bass + treble looks purple, all three look white.

5. **Optional: show it on screen.** The same spectrum is sent over USB serial to the browser visualiser.

Source of the numbers: `firmware/music_LED/src/config/FourierConfig.h` and `LightingConfig.h`.
