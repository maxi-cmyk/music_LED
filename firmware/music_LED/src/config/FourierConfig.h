#pragma once

#include <stddef.h>
#include <stdint.h>

namespace fourier_config {

constexpr size_t kNumberOfSamples = 128;
constexpr size_t kMaximumNumberOfSamples = 256;
constexpr uint32_t kSamplingFrequencyHz = 6400;
constexpr uint32_t kMicrosecondsPerSecond = 1000000;

constexpr float kFrequencyBinSpacingHz =
    static_cast<float>(kSamplingFrequencyHz) /
    static_cast<float>(kNumberOfSamples);

constexpr float kFrameDurationSeconds =
    static_cast<float>(kNumberOfSamples) /
    static_cast<float>(kSamplingFrequencyHz);
constexpr float kNyquistFrequencyHz =
    static_cast<float>(kSamplingFrequencyHz) / 2.0f;

// 6400 Hz requires a 156.25 us interval. The sampler accumulates this
// remainder so it schedules 156, 156, 156, 157 us rather than truncating every
// interval to 156 us.
constexpr uint32_t kBaseSampleIntervalMicroseconds =
    kMicrosecondsPerSecond / kSamplingFrequencyHz;
constexpr uint32_t kSampleIntervalRemainder =
    kMicrosecondsPerSecond % kSamplingFrequencyHz;
constexpr uint32_t kExpectedSampleSpanMicroseconds = static_cast<uint32_t>(
    ((kNumberOfSamples - 1) * static_cast<uint64_t>(kMicrosecondsPerSecond) +
     kSamplingFrequencyHz / 2) /
    kSamplingFrequencyHz);

constexpr float kPi = 3.14159265358979323846f;

constexpr bool isPowerOfTwo(size_t value) {
  return value != 0 && (value & (value - 1)) == 0;
}

constexpr bool isSupportedSampleCount(size_t numberOfSamples) {
  return numberOfSamples >= 2 && numberOfSamples <= kMaximumNumberOfSamples;
}

constexpr bool isSupportedFFTSize(size_t numberOfSamples) {
  return isSupportedSampleCount(numberOfSamples) &&
         isPowerOfTwo(numberOfSamples);
}

constexpr bool isSupportedDiagnosticSize(size_t numberOfSamples) {
  return numberOfSamples == 32 || numberOfSamples == 64 ||
         numberOfSamples == 128 || numberOfSamples == 256;
}

} // namespace fourier_config
