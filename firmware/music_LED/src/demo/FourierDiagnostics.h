#pragma once

#include "../fourier/FourierTypes.h"

// Runs once at startup using synthetic bin-aligned cosines. It prints a CSV
// table for 32, 64, 128, and 256 samples. Signal generation and Serial output
// are excluded from transform timing; FFT input copying and twiddle generation
// inside the public transform function are included.
void printStartupFourierDiagnostics();

// Compares both transforms on the exact same prepared microphone frame. Call
// this outside sample acquisition and only on demand because the direct DFT
// temporarily interrupts continuous LED updates.
void printLiveFrameTransformComparison(
    const fourier::AudioSamples &preparedSamples);
