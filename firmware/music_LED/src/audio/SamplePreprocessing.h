#pragma once

#include "../fourier/FourierTypes.h"

enum class WindowFunction { None, Hamming };

struct SamplePreprocessingResults {
    float frame_mean = 0.0f;
    float centered_root_mean_square = 0.0f;
};

// Copies raw_samples into prepared_samples, removes the frame mean, and applies
// the selected window. The raw input is unchanged. RMS is measured after mean
// removal but before the window, in raw ADC units.
bool prepare_audio_samples(const fourier::AudioSamples &raw_samples,
                           WindowFunction window_function,
                           fourier::AudioSamples *prepared_samples,
                           SamplePreprocessingResults *results);
