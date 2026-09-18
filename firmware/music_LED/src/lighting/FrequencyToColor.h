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

FrequencyBandStrengths
calculateFrequencyBandStrengths(const fourier::SpectrumMagnitudes &magnitudes);

// Applies one fixed common scale and fixed per-channel gains. Each frequency
// band controls only its assigned RGB channel; bands are never independently
// normalized to full brightness.
RgbBrightness
mapFrequencyBandsToRgb(const FrequencyBandStrengths &bandStrengths);
