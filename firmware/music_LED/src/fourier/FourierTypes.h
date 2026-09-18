#pragma once

#include <stddef.h>

#include "../config/FourierConfig.h"

namespace fourier {

// A real-valued time-domain vector. amplitude[sampleIndex] represents x[n].
// Values are raw mathematical coefficients unless the caller documents a unit.
struct AudioSamples {
  size_t numberOfSamples = 0;
  float amplitude[fourier_config::kMaximumNumberOfSamples] = {};
};

// The unnormalized complex forward transform. For each frequencyBinIndex,
// real and imaginary together represent X[k]. Magnitude is deliberately not
// stored here because taking a magnitude is a separate, nonlinear operation.
struct FrequencySpectrum {
  size_t numberOfSamples = 0;
  float real[fourier_config::kMaximumNumberOfSamples] = {};
  float imaginary[fourier_config::kMaximumNumberOfSamples] = {};
};

} // namespace fourier
