#pragma once

#include "FourierTypes.h"

namespace fourier {

// Computes the same unnormalized, negative-exponent forward DFT as
// compute_direct_dft, using an iterative radix-2 FFT. The input is unchanged.
// Returns false when the sample count is not a supported power of two or the
// output pointer is null.
bool compute_fast_fourier_transform(
        const AudioSamples &time_domain_samples,
        FrequencySpectrum *frequency_domain_coefficients);

} // namespace fourier
