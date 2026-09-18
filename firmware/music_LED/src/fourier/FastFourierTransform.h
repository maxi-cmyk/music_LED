#pragma once

#include "FourierTypes.h"

namespace fourier {

// Computes the same unnormalized, negative-exponent forward DFT as
// computeDirectDFT, using an iterative radix-2 FFT. The input is unchanged.
// Returns false when the sample count is not a supported power of two or the
// output pointer is null.
bool computeFastFourierTransform(
    const AudioSamples &timeDomainSamples,
    FrequencySpectrum *frequencyDomainCoefficients);

} // namespace fourier
