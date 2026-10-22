#pragma once

#include <stddef.h>

#include "../config/FourierConfig.h"

namespace fourier {

// A real-valued time-domain vector. amplitude[sample_index] represents x[n].
// Values are raw mathematical coefficients unless the caller documents a unit.
struct AudioSamples {
    size_t number_of_samples = 0;
    float amplitude[fourier_config::MAXIMUM_NUMBER_OF_SAMPLES] = {};
};

// The unnormalized complex forward transform. For each frequency_bin_index,
// real and imaginary together represent X[k]. Magnitude is deliberately not
// stored here because taking a magnitude is a separate, nonlinear operation.
struct FrequencySpectrum {
    size_t number_of_samples = 0;
    float real[fourier_config::MAXIMUM_NUMBER_OF_SAMPLES] = {};
    float imaginary[fourier_config::MAXIMUM_NUMBER_OF_SAMPLES] = {};
};

} // namespace fourier
