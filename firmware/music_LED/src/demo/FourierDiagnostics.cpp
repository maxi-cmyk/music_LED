#include "FourierDiagnostics.h"

#include <Arduino.h>
#include <math.h>

#include "../fourier/DirectDFT.h"
#include "../fourier/FastFourierTransform.h"
#include "SyntheticSignals.h"

namespace {

constexpr size_t BENCHMARK_REPETITIONS = 5;
fourier::AudioSamples diagnostic_samples{};
fourier::FrequencySpectrum direct_dft_result{};
fourier::FrequencySpectrum fast_fourier_transform_result{};
volatile float diagnostic_result_checksum = 0.0f;

float maximum_complex_difference(const fourier::FrequencySpectrum &first,
                                 const fourier::FrequencySpectrum &second) {
    if (first.number_of_samples != second.number_of_samples) {
        return INFINITY;
    }
    float maximum_difference = 0.0f;
    for (size_t frequency_bin_index = 0;
         frequency_bin_index < first.number_of_samples; ++frequency_bin_index) {
        const float real_difference = first.real[frequency_bin_index]
                                      - second.real[frequency_bin_index];
        const float imaginary_difference
                = first.imaginary[frequency_bin_index]
                  - second.imaginary[frequency_bin_index];
        const float difference
                = sqrtf(real_difference * real_difference
                        + imaginary_difference * imaginary_difference);
        if (difference > maximum_difference) {
            maximum_difference = difference;
        }
    }
    return maximum_difference;
}

void sort_durations(uint32_t *durations) {
    for (size_t current_index = 1; current_index < BENCHMARK_REPETITIONS;
         ++current_index) {
        const uint32_t duration_to_insert = durations[current_index];
        size_t insertion_index = current_index;
        while (insertion_index > 0
               && durations[insertion_index - 1] > duration_to_insert) {
            durations[insertion_index] = durations[insertion_index - 1];
            --insertion_index;
        }
        durations[insertion_index] = duration_to_insert;
    }
}

uint32_t time_direct_dft(const fourier::AudioSamples &samples) {
    const uint32_t start_microseconds = micros();
    fourier::compute_direct_dft(samples, &direct_dft_result);
    const uint32_t duration_microseconds = micros() - start_microseconds;
    diagnostic_result_checksum += direct_dft_result.real[3];
    return duration_microseconds;
}

uint32_t time_fast_fourier_transform(const fourier::AudioSamples &samples) {
    const uint32_t start_microseconds = micros();
    fourier::compute_fast_fourier_transform(samples,
                                            &fast_fourier_transform_result);
    const uint32_t duration_microseconds = micros() - start_microseconds;
    diagnostic_result_checksum += fast_fourier_transform_result.real[3];
    return duration_microseconds;
}

void print_benchmark_measurements(
        size_t number_of_samples, float maximum_error,
        const uint32_t *direct_dft_durations,
        const uint32_t *fast_fourier_transform_durations) {
    const uint32_t direct_median
            = direct_dft_durations[BENCHMARK_REPETITIONS / 2];
    const uint32_t fast_median
            = fast_fourier_transform_durations[BENCHMARK_REPETITIONS / 2];
    const float measured_speedup
            = fast_median > 0 ? static_cast<float>(direct_median)
                                        / static_cast<float>(fast_median)
                              : 0.0f;

    Serial.print(number_of_samples);
    Serial.print(',');
    Serial.print(maximum_error, 6);
    Serial.print(',');
    Serial.print(direct_median);
    Serial.print(',');
    Serial.print(direct_dft_durations[0]);
    Serial.print(',');
    Serial.print(direct_dft_durations[BENCHMARK_REPETITIONS - 1]);
    Serial.print(',');
    Serial.print(fast_median);
    Serial.print(',');
    Serial.print(fast_fourier_transform_durations[0]);
    Serial.print(',');
    Serial.print(fast_fourier_transform_durations[BENCHMARK_REPETITIONS - 1]);
    Serial.print(',');
    Serial.println(measured_speedup, 2);
}

void print_benchmark_row(size_t number_of_samples) {
    synthetic_signals::generate_cosine_at_bin(number_of_samples, 3, 1.0f, 0.37f,
                                              &diagnostic_samples);

    // Warm both code paths before collecting the five timed repetitions.
    time_direct_dft(diagnostic_samples);
    time_fast_fourier_transform(diagnostic_samples);

    uint32_t direct_dft_durations[BENCHMARK_REPETITIONS]{};
    uint32_t fast_fourier_transform_durations[BENCHMARK_REPETITIONS]{};
    for (size_t repetition = 0; repetition < BENCHMARK_REPETITIONS;
         ++repetition) {
        direct_dft_durations[repetition] = time_direct_dft(diagnostic_samples);
        fast_fourier_transform_durations[repetition]
                = time_fast_fourier_transform(diagnostic_samples);
    }
    sort_durations(direct_dft_durations);
    sort_durations(fast_fourier_transform_durations);

    fourier::compute_direct_dft(diagnostic_samples, &direct_dft_result);
    fourier::compute_fast_fourier_transform(diagnostic_samples,
                                            &fast_fourier_transform_result);
    const float maximum_error = maximum_complex_difference(
            direct_dft_result, fast_fourier_transform_result);
    print_benchmark_measurements(number_of_samples, maximum_error,
                                 direct_dft_durations,
                                 fast_fourier_transform_durations);
}

} // namespace

void print_startup_fourier_diagnostics() {
    Serial.println("FOURIER_BENCHMARK_BEGIN");
    Serial.println("N,max_complex_error,dft_median_us,dft_min_us,dft_max_us,"
                   "fft_median_us,fft_min_us,fft_max_us,speedup");
    constexpr size_t DIAGNOSTIC_SIZES[] = {32, 64, 128, 256};
    for (size_t number_of_samples : DIAGNOSTIC_SIZES) {
        print_benchmark_row(number_of_samples);
    }
    Serial.println("FOURIER_BENCHMARK_END");
}

void print_live_frame_transform_comparison(
        const fourier::AudioSamples &prepared_samples) {
    const uint32_t direct_duration = time_direct_dft(prepared_samples);
    const uint32_t fast_duration
            = time_fast_fourier_transform(prepared_samples);
    const float maximum_error = maximum_complex_difference(
            direct_dft_result, fast_fourier_transform_result);
    Serial.print("LIVE_TRANSFORM_COMPARISON,max_complex_error=");
    Serial.print(maximum_error, 6);
    Serial.print(",dft_us=");
    Serial.print(direct_duration);
    Serial.print(",fft_us=");
    Serial.println(fast_duration);
}
