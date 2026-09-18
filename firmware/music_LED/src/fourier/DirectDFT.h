#pragma once

#include "FourierTypes.h"

namespace fourier {

// Computes the unnormalized forward DFT with a negative exponent.
// The input is unchanged. Returns false for an unsupported sample count or a
// null output pointer; a failed output has numberOfSamples set to zero.
bool computeDirectDFT(const AudioSamples &timeDomainSamples,
                      FrequencySpectrum *frequencyDomainCoefficients);

} // namespace fourier
