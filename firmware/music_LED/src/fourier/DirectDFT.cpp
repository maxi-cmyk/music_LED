#include "DirectDFT.h"

#include <math.h>

#include "../config/FourierConfig.h"

namespace fourier {

bool computeDirectDFT(const AudioSamples &timeDomainSamples,
                      FrequencySpectrum *frequencyDomainCoefficients) {
  if (frequencyDomainCoefficients == nullptr)
    return false;
  frequencyDomainCoefficients->numberOfSamples = 0;

  const size_t numberOfSamples = timeDomainSamples.numberOfSamples;
  if (!fourier_config::isSupportedSampleCount(numberOfSamples))
    return false;

  // Each outer-loop iteration is one row of the Fourier matrix multiplied by
  // the time-domain vector. Matrix entry F[k,n] is exp(-2 pi i k n / N).
  for (size_t frequencyBinIndex = 0; frequencyBinIndex < numberOfSamples;
       ++frequencyBinIndex) {
    float frequencyDomainReal = 0.0f;
    float frequencyDomainImaginary = 0.0f;

    for (size_t sampleIndex = 0; sampleIndex < numberOfSamples; ++sampleIndex) {
      const float angleRadians =
          -2.0f * fourier_config::kPi * static_cast<float>(frequencyBinIndex) *
          static_cast<float>(sampleIndex) / static_cast<float>(numberOfSamples);
      const float timeDomainAmplitude =
          timeDomainSamples.amplitude[sampleIndex];
      frequencyDomainReal += timeDomainAmplitude * cosf(angleRadians);
      frequencyDomainImaginary += timeDomainAmplitude * sinf(angleRadians);
    }

    frequencyDomainCoefficients->real[frequencyBinIndex] = frequencyDomainReal;
    frequencyDomainCoefficients->imaginary[frequencyBinIndex] =
        frequencyDomainImaginary;
  }

  frequencyDomainCoefficients->numberOfSamples = numberOfSamples;
  return true;
}

} // namespace fourier
