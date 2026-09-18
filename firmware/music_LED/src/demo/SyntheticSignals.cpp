#include "SyntheticSignals.h"

#include <math.h>

#include "../config/FourierConfig.h"

namespace synthetic_signals {
namespace {

bool prepareOutput(size_t numberOfSamples, fourier::AudioSamples *output) {
  if (output == nullptr ||
      !fourier_config::isSupportedSampleCount(numberOfSamples)) {
    if (output != nullptr)
      output->numberOfSamples = 0;
    return false;
  }
  output->numberOfSamples = numberOfSamples;
  for (size_t sampleIndex = 0; sampleIndex < numberOfSamples; ++sampleIndex) {
    output->amplitude[sampleIndex] = 0.0f;
  }
  return true;
}

float cosineAmplitude(size_t sampleIndex, size_t numberOfSamples,
                      size_t frequencyBinIndex, float amplitude,
                      float phaseRadians) {
  const float angleRadians = 2.0f * fourier_config::kPi *
                                 static_cast<float>(frequencyBinIndex) *
                                 static_cast<float>(sampleIndex) /
                                 static_cast<float>(numberOfSamples) +
                             phaseRadians;
  return amplitude * cosf(angleRadians);
}

} // namespace

bool generateZeroSignal(size_t numberOfSamples, fourier::AudioSamples *output) {
  return prepareOutput(numberOfSamples, output);
}

bool generateConstantSignal(size_t numberOfSamples, float amplitude,
                            fourier::AudioSamples *output) {
  if (!prepareOutput(numberOfSamples, output))
    return false;
  for (size_t sampleIndex = 0; sampleIndex < numberOfSamples; ++sampleIndex) {
    output->amplitude[sampleIndex] = amplitude;
  }
  return true;
}

bool generateImpulseSignal(size_t numberOfSamples, size_t impulseSampleIndex,
                           float amplitude, fourier::AudioSamples *output) {
  if (!prepareOutput(numberOfSamples, output) ||
      impulseSampleIndex >= numberOfSamples) {
    if (output != nullptr)
      output->numberOfSamples = 0;
    return false;
  }
  output->amplitude[impulseSampleIndex] = amplitude;
  return true;
}

bool generateFourPointWorkedExample(fourier::AudioSamples *output) {
  if (!prepareOutput(4, output))
    return false;
  output->amplitude[0] = 1.0f;
  output->amplitude[1] = 0.0f;
  output->amplitude[2] = -1.0f;
  output->amplitude[3] = 0.0f;
  return true;
}

bool generateCosineAtBin(size_t numberOfSamples, size_t frequencyBinIndex,
                         float amplitude, float phaseRadians,
                         fourier::AudioSamples *output) {
  if (!prepareOutput(numberOfSamples, output) ||
      frequencyBinIndex >= numberOfSamples) {
    if (output != nullptr)
      output->numberOfSamples = 0;
    return false;
  }
  for (size_t sampleIndex = 0; sampleIndex < numberOfSamples; ++sampleIndex) {
    output->amplitude[sampleIndex] =
        cosineAmplitude(sampleIndex, numberOfSamples, frequencyBinIndex,
                        amplitude, phaseRadians);
  }
  return true;
}

bool generateTwoCosinesAtBins(size_t numberOfSamples,
                              size_t firstFrequencyBinIndex,
                              float firstAmplitude, float firstPhaseRadians,
                              size_t secondFrequencyBinIndex,
                              float secondAmplitude, float secondPhaseRadians,
                              fourier::AudioSamples *output) {
  if (!prepareOutput(numberOfSamples, output) ||
      firstFrequencyBinIndex >= numberOfSamples ||
      secondFrequencyBinIndex >= numberOfSamples) {
    if (output != nullptr)
      output->numberOfSamples = 0;
    return false;
  }
  for (size_t sampleIndex = 0; sampleIndex < numberOfSamples; ++sampleIndex) {
    output->amplitude[sampleIndex] =
        cosineAmplitude(sampleIndex, numberOfSamples, firstFrequencyBinIndex,
                        firstAmplitude, firstPhaseRadians) +
        cosineAmplitude(sampleIndex, numberOfSamples, secondFrequencyBinIndex,
                        secondAmplitude, secondPhaseRadians);
  }
  return true;
}

} // namespace synthetic_signals
