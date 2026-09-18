#include "FastFourierTransform.h"

#include <math.h>

#include "../config/FourierConfig.h"

namespace fourier {

bool computeFastFourierTransform(
    const AudioSamples &timeDomainSamples,
    FrequencySpectrum *frequencyDomainCoefficients) {
  if (frequencyDomainCoefficients == nullptr)
    return false;
  frequencyDomainCoefficients->numberOfSamples = 0;

  const size_t numberOfSamples = timeDomainSamples.numberOfSamples;
  if (!fourier_config::isSupportedFFTSize(numberOfSamples))
    return false;

  for (size_t sampleIndex = 0; sampleIndex < numberOfSamples; ++sampleIndex) {
    frequencyDomainCoefficients->real[sampleIndex] =
        timeDomainSamples.amplitude[sampleIndex];
    frequencyDomainCoefficients->imaginary[sampleIndex] = 0.0f;
  }

  // Reorder input indices so each later butterfly combines the correct even
  // and odd subproblems. The destination index is the source index with its
  // binary digits reversed.
  for (size_t originalIndex = 1, bitReversedIndex = 0;
       originalIndex < numberOfSamples; ++originalIndex) {
    size_t bitPosition = numberOfSamples >> 1;
    while ((bitReversedIndex & bitPosition) != 0) {
      bitReversedIndex ^= bitPosition;
      bitPosition >>= 1;
    }
    bitReversedIndex ^= bitPosition;

    if (originalIndex < bitReversedIndex) {
      const float originalReal =
          frequencyDomainCoefficients->real[originalIndex];
      const float originalImaginary =
          frequencyDomainCoefficients->imaginary[originalIndex];
      frequencyDomainCoefficients->real[originalIndex] =
          frequencyDomainCoefficients->real[bitReversedIndex];
      frequencyDomainCoefficients->imaginary[originalIndex] =
          frequencyDomainCoefficients->imaginary[bitReversedIndex];
      frequencyDomainCoefficients->real[bitReversedIndex] = originalReal;
      frequencyDomainCoefficients->imaginary[bitReversedIndex] =
          originalImaginary;
    }
  }

  // Each stage doubles the transform length. A butterfly combines one value
  // from the even-indexed subtransform with a rotated value from the odd one.
  for (size_t transformLength = 2; transformLength <= numberOfSamples;
       transformLength <<= 1) {
    const float twiddleStepAngleRadians =
        -2.0f * fourier_config::kPi / static_cast<float>(transformLength);
    const float twiddleStepReal = cosf(twiddleStepAngleRadians);
    const float twiddleStepImaginary = sinf(twiddleStepAngleRadians);

    for (size_t transformStartIndex = 0; transformStartIndex < numberOfSamples;
         transformStartIndex += transformLength) {
      float twiddleFactorReal = 1.0f;
      float twiddleFactorImaginary = 0.0f;

      for (size_t butterflyOffset = 0; butterflyOffset < transformLength / 2;
           ++butterflyOffset) {
        const size_t evenComponentIndex = transformStartIndex + butterflyOffset;
        const size_t oddComponentIndex =
            evenComponentIndex + transformLength / 2;

        const float rotatedOddReal =
            frequencyDomainCoefficients->real[oddComponentIndex] *
                twiddleFactorReal -
            frequencyDomainCoefficients->imaginary[oddComponentIndex] *
                twiddleFactorImaginary;
        const float rotatedOddImaginary =
            frequencyDomainCoefficients->real[oddComponentIndex] *
                twiddleFactorImaginary +
            frequencyDomainCoefficients->imaginary[oddComponentIndex] *
                twiddleFactorReal;
        const float evenComponentReal =
            frequencyDomainCoefficients->real[evenComponentIndex];
        const float evenComponentImaginary =
            frequencyDomainCoefficients->imaginary[evenComponentIndex];

        frequencyDomainCoefficients->real[evenComponentIndex] =
            evenComponentReal + rotatedOddReal;
        frequencyDomainCoefficients->imaginary[evenComponentIndex] =
            evenComponentImaginary + rotatedOddImaginary;
        frequencyDomainCoefficients->real[oddComponentIndex] =
            evenComponentReal - rotatedOddReal;
        frequencyDomainCoefficients->imaginary[oddComponentIndex] =
            evenComponentImaginary - rotatedOddImaginary;

        const float nextTwiddleFactorReal =
            twiddleFactorReal * twiddleStepReal -
            twiddleFactorImaginary * twiddleStepImaginary;
        twiddleFactorImaginary = twiddleFactorReal * twiddleStepImaginary +
                                 twiddleFactorImaginary * twiddleStepReal;
        twiddleFactorReal = nextTwiddleFactorReal;
      }
    }
  }

  frequencyDomainCoefficients->numberOfSamples = numberOfSamples;
  return true;
}

} // namespace fourier
