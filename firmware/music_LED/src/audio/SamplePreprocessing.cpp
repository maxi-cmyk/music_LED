#include "SamplePreprocessing.h"

#include <math.h>

#include "../config/FourierConfig.h"

namespace {

float windowCoefficient(WindowFunction windowFunction, size_t sampleIndex,
                        size_t numberOfSamples) {
  if (windowFunction == WindowFunction::None || numberOfSamples <= 1) {
    return 1.0f;
  }
  return 0.54f - 0.46f * cosf(2.0f * fourier_config::kPi *
                              static_cast<float>(sampleIndex) /
                              static_cast<float>(numberOfSamples - 1));
}

} // namespace

bool prepareAudioSamples(const fourier::AudioSamples &rawSamples,
                         WindowFunction windowFunction,
                         fourier::AudioSamples *preparedSamples,
                         SamplePreprocessingResults *results) {
  if (preparedSamples == nullptr || results == nullptr ||
      !fourier_config::isSupportedSampleCount(rawSamples.numberOfSamples)) {
    if (preparedSamples != nullptr)
      preparedSamples->numberOfSamples = 0;
    return false;
  }

  *results = SamplePreprocessingResults{};
  const size_t numberOfSamples = rawSamples.numberOfSamples;
  for (size_t sampleIndex = 0; sampleIndex < numberOfSamples; ++sampleIndex) {
    results->frameMean += rawSamples.amplitude[sampleIndex];
  }
  results->frameMean /= static_cast<float>(numberOfSamples);

  preparedSamples->numberOfSamples = numberOfSamples;
  float sumCenteredSquares = 0.0f;
  for (size_t sampleIndex = 0; sampleIndex < numberOfSamples; ++sampleIndex) {
    const float centeredSample =
        rawSamples.amplitude[sampleIndex] - results->frameMean;
    sumCenteredSquares += centeredSample * centeredSample;
    preparedSamples->amplitude[sampleIndex] =
        centeredSample *
        windowCoefficient(windowFunction, sampleIndex, numberOfSamples);
  }
  results->centeredRootMeanSquare =
      sqrtf(sumCenteredSquares / static_cast<float>(numberOfSamples));
  return true;
}
