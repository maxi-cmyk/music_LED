#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "$0")/.." && pwd)"
test_binary="${TMPDIR:-/tmp}/music-led-fourier-tests"

clang++ \
  -std=c++17 \
  -Wall \
  -Wextra \
  -Werror \
  -pedantic \
  "$repository_root/tests/fourier_tests.cpp" \
  "$repository_root/firmware/music_LED/src/fourier/DirectDFT.cpp" \
  "$repository_root/firmware/music_LED/src/fourier/FastFourierTransform.cpp" \
  "$repository_root/firmware/music_LED/src/fourier/SpectrumAnalysis.cpp" \
  "$repository_root/firmware/music_LED/src/demo/SyntheticSignals.cpp" \
  "$repository_root/firmware/music_LED/src/audio/SamplePreprocessing.cpp" \
  "$repository_root/firmware/music_LED/src/lighting/FrequencyToColor.cpp" \
  -o "$test_binary"

"$test_binary"
