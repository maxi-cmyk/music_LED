#pragma once

#include <stddef.h>
#include <stdint.h>

namespace fourier_config {

constexpr size_t NUMBER_OF_SAMPLES = 128;
constexpr size_t MAXIMUM_NUMBER_OF_SAMPLES = 256;
constexpr uint32_t SAMPLING_FREQUENCY_HZ = 6400;
constexpr uint32_t MICROSECONDS_PER_SECOND = 1000000;

constexpr float FREQUENCY_BIN_SPACING_HZ
        = static_cast<float>(SAMPLING_FREQUENCY_HZ)
          / static_cast<float>(NUMBER_OF_SAMPLES);

constexpr float FRAME_DURATION_SECONDS
        = static_cast<float>(NUMBER_OF_SAMPLES)
          / static_cast<float>(SAMPLING_FREQUENCY_HZ);
constexpr float NYQUIST_FREQUENCY_HZ
        = static_cast<float>(SAMPLING_FREQUENCY_HZ) / 2.0f;

// 6400 Hz requires a 156.25 us interval. The sampler accumulates this
// remainder so it schedules 156, 156, 156, 157 us rather than truncating every
// interval to 156 us.
constexpr uint32_t BASE_SAMPLE_INTERVAL_MICROSECONDS
        = MICROSECONDS_PER_SECOND / SAMPLING_FREQUENCY_HZ;
constexpr uint32_t SAMPLE_INTERVAL_REMAINDER
        = MICROSECONDS_PER_SECOND % SAMPLING_FREQUENCY_HZ;
constexpr uint32_t EXPECTED_SAMPLE_SPAN_MICROSECONDS = static_cast<uint32_t>(
        ((NUMBER_OF_SAMPLES - 1)
                 * static_cast<uint64_t>(MICROSECONDS_PER_SECOND)
         + SAMPLING_FREQUENCY_HZ / 2)
        / SAMPLING_FREQUENCY_HZ);

constexpr float FOURIER_PI = 3.14159265358979323846f;

constexpr bool is_power_of_two(size_t value) {
    return value != 0 && (value & (value - 1)) == 0;
}

constexpr bool is_supported_sample_count(size_t number_of_samples) {
    return number_of_samples >= 2
           && number_of_samples <= MAXIMUM_NUMBER_OF_SAMPLES;
}

constexpr bool is_supported_fft_size(size_t number_of_samples) {
    return is_supported_sample_count(number_of_samples)
           && is_power_of_two(number_of_samples);
}

constexpr bool is_supported_diagnostic_size(size_t number_of_samples) {
    return number_of_samples == 32 || number_of_samples == 64
           || number_of_samples == 128 || number_of_samples == 256;
}

} // namespace fourier_config
