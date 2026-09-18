#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "$0")/.." && pwd)"
benchmark_binary="${TMPDIR:-/tmp}/music-led-fourier-benchmark"

clang++ \
  -std=c++20 \
  -O2 \
  -Wall \
  -Wextra \
  -Werror \
  -pedantic \
  "$repository_root/tests/fourier_benchmark.cpp" \
  "$repository_root/firmware/music_LED/src/fourier/DirectDFT.cpp" \
  "$repository_root/firmware/music_LED/src/fourier/FastFourierTransform.cpp" \
  "$repository_root/firmware/music_LED/src/demo/SyntheticSignals.cpp" \
  -o "$benchmark_binary"

"$benchmark_binary"
