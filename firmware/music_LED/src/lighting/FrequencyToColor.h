#pragma once

#include <stdint.h>

#include "../fourier/SpectrumAnalysis.h"

struct FrequencyBandStrengths {
    float bass = 0.0f;
    float midrange = 0.0f;
    float treble = 0.0f;
};

struct RgbBrightness {
    uint8_t red = 0;
    uint8_t green = 0;
    uint8_t blue = 0;
};

FrequencyBandStrengths calculate_frequency_band_strengths(
        const fourier::SpectrumMagnitudes &magnitudes);

// Applies fixed gains, suppresses weak cross-band leakage relative to the
// strongest channel, then applies the calibrated absolute PWM scale.
RgbBrightness
map_frequency_bands_to_rgb(const FrequencyBandStrengths &band_strengths);
