#pragma once

#include "FourierTypes.h"

namespace fourier {

// Computes the unnormalized forward DFT with a negative exponent.
// The input is unchanged. Returns false for an unsupported sample count or a
// null output pointer; a failed output has number_of_samples set to zero.
bool compute_direct_dft(const AudioSamples &time_domain_samples,
                        FrequencySpectrum *frequency_domain_coefficients);

} // namespace fourier
