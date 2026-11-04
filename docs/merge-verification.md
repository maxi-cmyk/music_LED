# Main/demo merge verification

Date: 2026-11-05 (Asia/Singapore).

Inputs: `main` at `0439472`, `demo` at `2ec86d9`.
Merge direction: demo into main. The demo Toy example and Live ESP32 routes
replace the older Presenter route. Firmware is identical on both inputs and
remains unchanged in the merge. No sh_branch files or prior stash were applied.
The root spectra directory is absent and is explicitly ignored.

| Check | Before merge | Merged result |
| --- | --- | --- |
| JavaScript suites: audio controller, capture analysis, signal analysis/serial protocol, vector workbench | All four pass on each input | All four pass |
| Native C++ Fourier, preprocessing and RGB mapping tests | Pass on each input | Pass |
| HTTP assets, route modules, JavaScript syntax, no-cache headers | 91 main assets; 86 demo assets pass | 86 assets pass |
| ESP32 Arduino compile (esp32:esp32:esp32, core 3.3.11) | Pass on shared firmware source | Pass |
| Firmware output size | 300427 bytes flash; 32792 bytes static RAM | Same |

Commands: `node --test tests/*.mjs`, `bash tests/run_fourier_tests.sh`,
`arduino-cli compile --fqbn esp32:esp32:esp32 firmware/music_LED`.
The tests directory already existed locally and is ignored by the repository;
it was copied alongside isolated archived snapshots to test both input commits.
The temporary HTTP asset checker and build outputs are in
`/private/tmp/music-led-merge-checks/` on this machine.

The HTTP checker starts the repository's no-cache handler on an ephemeral
localhost port and follows local HTML, application imports, router partials,
stylesheets and font URLs. It also runs `node --check` on fetched JavaScript.
It checks serving and syntax, not browser rendering or DOM interaction.

Browser control was unavailable. No ESP32 USB serial device was connected.
Physical sound capture, USB permissions, measured capture, RGB output, visual
layout and audible playback have not been verified in this run. Simulated
capture, serial parser and mocked audio tests do not establish physical behavior.

For physical acceptance: serve `webpage/serve.py` in desktop Chrome/Edge;
exercise Toy playback and tone changes, connect the ESP32, confirm live spectrum
and RGB response, capture a measured frame and inspect DFT/FFT agreement.
Exercise Shift+E separately and verify that it is labelled simulated.
