#pragma once

#include "../fourier/FourierTypes.h"

enum class WindowFunction { None, Hamming };

struct SamplePreprocessingResults {
  float frameMean = 0.0f;
  float centeredRootMeanSquare = 0.0f;
};

// Copies rawSamples into preparedSamples, removes the frame mean, and applies
// the selected window. The raw input is unchanged. RMS is measured after mean
// removal but before the window, in raw ADC units.
bool prepareAudioSamples(const fourier::AudioSamples &rawSamples,
                         WindowFunction windowFunction,
                         fourier::AudioSamples *preparedSamples,
                         SamplePreprocessingResults *results);
