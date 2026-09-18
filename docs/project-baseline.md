# Phase 1 baseline

## Preserved starting point

The original application remains recoverable from Git history. Commit `0d9bd9f` is the last remote-tracking revision before the retired integrations were removed. Commit `749843b` records their removal and the standalone microphone-to-RGB starting point for the Fourier refactor.

Do not rewrite this history or add credentials and generated firmware to future commits.

## Hardware assumptions

| Component | Assumption used by the code |
|---|---|
| Controller | ESP32 using the `esp32:esp32:esp32` Arduino board target |
| Microphone | Analog output connected to ADC1 GPIO 34 |
| RGB output | HW-479/KY-016 common-cathode RGB module |
| Red channel | GPIO 19 |
| Green channel | GPIO 18 |
| Blue channel | GPIO 5 |
| Tone source | A computer or phone speaker placed near the microphone |
| Programming and diagnostics | USB connection and a 115200-baud serial monitor |

The physical microphone model, speaker response, room noise, RGB channel balance, and actual sample timing must be measured after flashing. They cannot be established by a desktop build.

## Presentation constraints

- Week 13 live presentation.
- Ten minutes for the presentation.
- Five minutes for questions and answers.
- Five marks each for instructor evaluation, peer evaluation, and Q&A.
- No written report or slide deck submission is required.
- Equations must use the textbook glossary and LA4CS matrix/vector formatting.

## Build baseline

The verified toolchain is Arduino CLI with ESP32 platform version 3.3.11. From the repository root:

```bash
/Applications/Arduino\ IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli \
  compile --fqbn esp32:esp32:esp32 \
  --output-dir /tmp/music-led-build \
  firmware/music_LED
```

Before the Phase 2–4 refactor, the standalone sketch compiled at 297,671 bytes of flash and 24,112 bytes of global RAM. These sizes are reference measurements, not performance targets.

## Validation boundary

The desktop checks can prove known DFT results, complex DFT/FFT agreement, input validation, and linearity. The following evidence begins after flashing:

- microphone input and quiet-room noise level;
- physical RGB wiring and channel order;
- achieved sampling frequency and jitter;
- acoustic peak-bin accuracy;
- brightness and colour calibration.
