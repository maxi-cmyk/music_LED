#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <vector>

#include "../firmware/music_LED/src/demo/SyntheticSignals.h"
#include "../firmware/music_LED/src/fourier/DirectDFT.h"
#include "../firmware/music_LED/src/fourier/FastFourierTransform.h"

namespace {

constexpr size_t kBenchmarkRepetitions = 9;

// Written after each transform so an optimizing compiler cannot discard the
// result. The value itself is not benchmark evidence.
volatile float resultChecksum = 0.0f;

uint64_t elapsedNanoseconds(auto &&operation) {
  const auto start = std::chrono::steady_clock::now();
  operation();
  const auto end = std::chrono::steady_clock::now();
  return static_cast<uint64_t>(
      std::chrono::duration_cast<std::chrono::nanoseconds>(end - start)
          .count());
}

float maximumComplexDifference(const fourier::FrequencySpectrum &first,
                               const fourier::FrequencySpectrum &second) {
  float maximumDifference = 0.0f;
  for (size_t frequencyBinIndex = 0; frequencyBinIndex < first.numberOfSamples;
       ++frequencyBinIndex) {
    const float realDifference =
        first.real[frequencyBinIndex] - second.real[frequencyBinIndex];
    const float imaginaryDifference = first.imaginary[frequencyBinIndex] -
                                      second.imaginary[frequencyBinIndex];
    const float difference =
        std::sqrt(realDifference * realDifference +
                  imaginaryDifference * imaginaryDifference);
    maximumDifference = std::max(maximumDifference, difference);
  }
  return maximumDifference;
}

uint64_t median(std::vector<uint64_t> values) {
  std::sort(values.begin(), values.end());
  return values[values.size() / 2];
}

void benchmarkSize(size_t numberOfSamples) {
  fourier::AudioSamples samples{};
  fourier::FrequencySpectrum directResult{};
  fourier::FrequencySpectrum fastResult{};
  synthetic_signals::generateCosineAtBin(numberOfSamples, 3, 1.0f, 0.37f,
                                         &samples);

  fourier::computeDirectDFT(samples, &directResult);
  fourier::computeFastFourierTransform(samples, &fastResult);

  std::vector<uint64_t> directDurations;
  std::vector<uint64_t> fastDurations;
  directDurations.reserve(kBenchmarkRepetitions);
  fastDurations.reserve(kBenchmarkRepetitions);
  for (size_t repetition = 0; repetition < kBenchmarkRepetitions;
       ++repetition) {
    directDurations.push_back(elapsedNanoseconds([&] {
      fourier::computeDirectDFT(samples, &directResult);
      resultChecksum = resultChecksum + directResult.real[3];
    }));
    fastDurations.push_back(elapsedNanoseconds([&] {
      fourier::computeFastFourierTransform(samples, &fastResult);
      resultChecksum = resultChecksum + fastResult.real[3];
    }));
  }

  const uint64_t directMedian = median(directDurations);
  const uint64_t fastMedian = median(fastDurations);
  const float speedup =
      static_cast<float>(directMedian) / static_cast<float>(fastMedian);
  std::cout << numberOfSamples << ','
            << maximumComplexDifference(directResult, fastResult) << ','
            << directMedian << ','
            << *std::min_element(directDurations.begin(), directDurations.end())
            << ','
            << *std::max_element(directDurations.begin(), directDurations.end())
            << ',' << fastMedian << ','
            << *std::min_element(fastDurations.begin(), fastDurations.end())
            << ','
            << *std::max_element(fastDurations.begin(), fastDurations.end())
            << ',' << speedup << '\n';
}

} // namespace

int main() {
  std::cout << "N,max_complex_error,dft_median_ns,dft_min_ns,dft_max_ns,"
               "fft_median_ns,fft_min_ns,fft_max_ns,speedup\n";
  for (size_t numberOfSamples : {32U, 64U, 128U, 256U}) {
    benchmarkSize(numberOfSamples);
  }
  return 0;
}
