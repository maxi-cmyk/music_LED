#pragma once

#include <stddef.h>

#include "FourierTypes.h"

namespace fourier {

struct SpectrumMagnitudes {
    size_t number_of_samples = 0;
    float magnitude[fourier_config::MAXIMUM_NUMBER_OF_SAMPLES] = {};
};

struct DominantFrequency {
    size_t frequency_bin_index = 0;
    float frequency_hz = 0.0f;
    float magnitude = 0.0f;
};

bool calculate_spectrum_magnitudes(
        const FrequencySpectrum &frequency_domain_coefficients,
        SpectrumMagnitudes *magnitudes);

float frequency_for_bin_hz(size_t frequency_bin_index, size_t number_of_samples,
                           float sampling_frequency_hz);

// Searches bins 1 through N/2. DC is excluded and the Nyquist bin is included.
bool find_dominant_nonnegative_frequency(const SpectrumMagnitudes &magnitudes,
                                         float sampling_frequency_hz,
                                         DominantFrequency *dominant_frequency);

// Returns sqrt(sum(|X[k]|^2)) over an inclusive bin range.
float calculate_band_strength(const SpectrumMagnitudes &magnitudes,
                              size_t first_frequency_bin_index,
                              size_t last_frequency_bin_index);

} // namespace fourier
