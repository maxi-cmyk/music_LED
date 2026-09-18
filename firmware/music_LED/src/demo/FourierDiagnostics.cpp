#include "FourierDiagnostics.h"

#include <Arduino.h>
#include <math.h>

#include "../fourier/DirectDFT.h"
#include "../fourier/FastFourierTransform.h"
#include "SyntheticSignals.h"

namespace {

constexpr size_t kBenchmarkRepetitions = 5;
fourier::AudioSamples diagnosticSamples{};
fourier::FrequencySpectrum directDFTResult{};
fourier::FrequencySpectrum fastFourierTransformResult{};
volatile float diagnosticResultChecksum = 0.0f;

float maximumComplexDifference(const fourier::FrequencySpectrum &first,
                               const fourier::FrequencySpectrum &second) {
  if (first.numberOfSamples != second.numberOfSamples)
    return INFINITY;
  float maximumDifference = 0.0f;
  for (size_t frequencyBinIndex = 0; frequencyBinIndex < first.numberOfSamples;
       ++frequencyBinIndex) {
    const float realDifference =
        first.real[frequencyBinIndex] - second.real[frequencyBinIndex];
    const float imaginaryDifference = first.imaginary[frequencyBinIndex] -
                                      second.imaginary[frequencyBinIndex];
    const float difference = sqrtf(realDifference * realDifference +
                                   imaginaryDifference * imaginaryDifference);
    if (difference > maximumDifference)
      maximumDifference = difference;
  }
  return maximumDifference;
}

void sortDurations(uint32_t *durations) {
  for (size_t currentIndex = 1; currentIndex < kBenchmarkRepetitions;
       ++currentIndex) {
    const uint32_t durationToInsert = durations[currentIndex];
    size_t insertionIndex = currentIndex;
    while (insertionIndex > 0 &&
           durations[insertionIndex - 1] > durationToInsert) {
      durations[insertionIndex] = durations[insertionIndex - 1];
      --insertionIndex;
    }
    durations[insertionIndex] = durationToInsert;
  }
}

uint32_t timeDirectDFT(const fourier::AudioSamples &samples) {
  const uint32_t startMicroseconds = micros();
  fourier::computeDirectDFT(samples, &directDFTResult);
  const uint32_t durationMicroseconds = micros() - startMicroseconds;
  diagnosticResultChecksum += directDFTResult.real[3];
  return durationMicroseconds;
}

uint32_t timeFastFourierTransform(const fourier::AudioSamples &samples) {
  const uint32_t startMicroseconds = micros();
  fourier::computeFastFourierTransform(samples, &fastFourierTransformResult);
  const uint32_t durationMicroseconds = micros() - startMicroseconds;
  diagnosticResultChecksum += fastFourierTransformResult.real[3];
  return durationMicroseconds;
}

void printBenchmarkRow(size_t numberOfSamples) {
  synthetic_signals::generateCosineAtBin(numberOfSamples, 3, 1.0f, 0.37f,
                                         &diagnosticSamples);

  // Warm both code paths before collecting the five timed repetitions.
  timeDirectDFT(diagnosticSamples);
  timeFastFourierTransform(diagnosticSamples);

  uint32_t directDFTDurations[kBenchmarkRepetitions]{};
  uint32_t fastFourierTransformDurations[kBenchmarkRepetitions]{};
  for (size_t repetition = 0; repetition < kBenchmarkRepetitions;
       ++repetition) {
    directDFTDurations[repetition] = timeDirectDFT(diagnosticSamples);
    fastFourierTransformDurations[repetition] =
        timeFastFourierTransform(diagnosticSamples);
  }
  sortDurations(directDFTDurations);
  sortDurations(fastFourierTransformDurations);

  fourier::computeDirectDFT(diagnosticSamples, &directDFTResult);
  fourier::computeFastFourierTransform(diagnosticSamples,
                                       &fastFourierTransformResult);
  const float maximumError =
      maximumComplexDifference(directDFTResult, fastFourierTransformResult);
  const uint32_t directMedian = directDFTDurations[kBenchmarkRepetitions / 2];
  const uint32_t fastMedian =
      fastFourierTransformDurations[kBenchmarkRepetitions / 2];
  const float measuredSpeedup =
      fastMedian > 0
          ? static_cast<float>(directMedian) / static_cast<float>(fastMedian)
          : 0.0f;

  Serial.print(numberOfSamples);
  Serial.print(',');
  Serial.print(maximumError, 6);
  Serial.print(',');
  Serial.print(directMedian);
  Serial.print(',');
  Serial.print(directDFTDurations[0]);
  Serial.print(',');
  Serial.print(directDFTDurations[kBenchmarkRepetitions - 1]);
  Serial.print(',');
  Serial.print(fastMedian);
  Serial.print(',');
  Serial.print(fastFourierTransformDurations[0]);
  Serial.print(',');
  Serial.print(fastFourierTransformDurations[kBenchmarkRepetitions - 1]);
  Serial.print(',');
  Serial.println(measuredSpeedup, 2);
}

} // namespace

void printStartupFourierDiagnostics() {
  Serial.println("FOURIER_BENCHMARK_BEGIN");
  Serial.println("N,max_complex_error,dft_median_us,dft_min_us,dft_max_us,"
                 "fft_median_us,fft_min_us,fft_max_us,speedup");
  constexpr size_t kDiagnosticSizes[] = {32, 64, 128, 256};
  for (size_t numberOfSamples : kDiagnosticSizes) {
    printBenchmarkRow(numberOfSamples);
  }
  Serial.println("FOURIER_BENCHMARK_END");
}

void printLiveFrameTransformComparison(
    const fourier::AudioSamples &preparedSamples) {
  const uint32_t directDuration = timeDirectDFT(preparedSamples);
  const uint32_t fastDuration = timeFastFourierTransform(preparedSamples);
  const float maximumError =
      maximumComplexDifference(directDFTResult, fastFourierTransformResult);
  Serial.print("LIVE_TRANSFORM_COMPARISON,max_complex_error=");
  Serial.print(maximumError, 6);
  Serial.print(",dft_us=");
  Serial.print(directDuration);
  Serial.print(",fft_us=");
  Serial.println(fastDuration);
}
