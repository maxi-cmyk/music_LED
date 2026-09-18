#pragma once

#include <stddef.h>

#include "FourierTypes.h"

namespace fourier {

struct SpectrumMagnitudes {
  size_t numberOfSamples = 0;
  float magnitude[fourier_config::kMaximumNumberOfSamples] = {};
};

struct DominantFrequency {
  size_t frequencyBinIndex = 0;
  float frequencyHz = 0.0f;
  float magnitude = 0.0f;
};

bool calculateSpectrumMagnitudes(
    const FrequencySpectrum &frequencyDomainCoefficients,
    SpectrumMagnitudes *magnitudes);

float frequencyForBinHz(size_t frequencyBinIndex, size_t numberOfSamples,
                        float samplingFrequencyHz);

// Searches bins 1 through N/2. DC is excluded and the Nyquist bin is included.
bool findDominantNonnegativeFrequency(const SpectrumMagnitudes &magnitudes,
                                      float samplingFrequencyHz,
                                      DominantFrequency *dominantFrequency);

// Returns sqrt(sum(|X[k]|^2)) over an inclusive bin range.
float calculateBandStrength(const SpectrumMagnitudes &magnitudes,
                            size_t firstFrequencyBinIndex,
                            size_t lastFrequencyBinIndex);

} // namespace fourier
