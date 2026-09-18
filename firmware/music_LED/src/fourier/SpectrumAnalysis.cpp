#include "SpectrumAnalysis.h"

#include <math.h>

namespace fourier {

bool calculateSpectrumMagnitudes(
    const FrequencySpectrum &frequencyDomainCoefficients,
    SpectrumMagnitudes *magnitudes) {
  if (magnitudes == nullptr ||
      !fourier_config::isSupportedSampleCount(
          frequencyDomainCoefficients.numberOfSamples)) {
    if (magnitudes != nullptr)
      magnitudes->numberOfSamples = 0;
    return false;
  }

  magnitudes->numberOfSamples = frequencyDomainCoefficients.numberOfSamples;
  for (size_t frequencyBinIndex = 0;
       frequencyBinIndex < frequencyDomainCoefficients.numberOfSamples;
       ++frequencyBinIndex) {
    const float real = frequencyDomainCoefficients.real[frequencyBinIndex];
    const float imaginary =
        frequencyDomainCoefficients.imaginary[frequencyBinIndex];
    magnitudes->magnitude[frequencyBinIndex] =
        sqrtf(real * real + imaginary * imaginary);
  }
  return true;
}

float frequencyForBinHz(size_t frequencyBinIndex, size_t numberOfSamples,
                        float samplingFrequencyHz) {
  if (numberOfSamples == 0 || frequencyBinIndex >= numberOfSamples)
    return 0.0f;
  return static_cast<float>(frequencyBinIndex) * samplingFrequencyHz /
         static_cast<float>(numberOfSamples);
}

bool findDominantNonnegativeFrequency(const SpectrumMagnitudes &magnitudes,
                                      float samplingFrequencyHz,
                                      DominantFrequency *dominantFrequency) {
  if (dominantFrequency == nullptr || magnitudes.numberOfSamples < 2) {
    return false;
  }

  *dominantFrequency = DominantFrequency{};
  const size_t nyquistBin = magnitudes.numberOfSamples / 2;
  for (size_t frequencyBinIndex = 1; frequencyBinIndex <= nyquistBin;
       ++frequencyBinIndex) {
    const float magnitude = magnitudes.magnitude[frequencyBinIndex];
    if (magnitude > dominantFrequency->magnitude) {
      dominantFrequency->frequencyBinIndex = frequencyBinIndex;
      dominantFrequency->magnitude = magnitude;
    }
  }
  dominantFrequency->frequencyHz =
      frequencyForBinHz(dominantFrequency->frequencyBinIndex,
                        magnitudes.numberOfSamples, samplingFrequencyHz);
  return true;
}

float calculateBandStrength(const SpectrumMagnitudes &magnitudes,
                            size_t firstFrequencyBinIndex,
                            size_t lastFrequencyBinIndex) {
  if (magnitudes.numberOfSamples == 0 ||
      firstFrequencyBinIndex > lastFrequencyBinIndex ||
      lastFrequencyBinIndex >= magnitudes.numberOfSamples) {
    return 0.0f;
  }

  float sumSquaredMagnitudes = 0.0f;
  for (size_t frequencyBinIndex = firstFrequencyBinIndex;
       frequencyBinIndex <= lastFrequencyBinIndex; ++frequencyBinIndex) {
    const float magnitude = magnitudes.magnitude[frequencyBinIndex];
    sumSquaredMagnitudes += magnitude * magnitude;
  }
  return sqrtf(sumSquaredMagnitudes);
}

} // namespace fourier
