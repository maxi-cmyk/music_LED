#include "FastFourierTransform.h"

#include <math.h>

#include "../config/FourierConfig.h"

namespace fourier {
namespace {

void reorder_bit_reversed_samples(FrequencySpectrum &spectrum) {
    // Reversing the index bits pairs the correct even and odd subproblems.
    size_t reversed_index = 0;
    for (size_t original_index = 1; original_index < spectrum.number_of_samples;
         ++original_index) {
        size_t bit_position = spectrum.number_of_samples >> 1;
        while ((reversed_index & bit_position) != 0) {
            reversed_index ^= bit_position;
            bit_position >>= 1;
        }
        reversed_index ^= bit_position;

        if (original_index < reversed_index) {
            const float original_real = spectrum.real[original_index];
            const float original_imaginary = spectrum.imaginary[original_index];
            spectrum.real[original_index] = spectrum.real[reversed_index];
            spectrum.imaginary[original_index]
                    = spectrum.imaginary[reversed_index];
            spectrum.real[reversed_index] = original_real;
            spectrum.imaginary[reversed_index] = original_imaginary;
        }
    }
}

void combine_subtransforms(FrequencySpectrum &spectrum, size_t start_index,
                           size_t transform_length, float step_real,
                           float step_imaginary) {
    float twiddle_real = 1.0f;
    float twiddle_imaginary = 0.0f;
    for (size_t offset = 0; offset < transform_length / 2; ++offset) {
        const size_t even_index = start_index + offset;
        const size_t odd_index = even_index + transform_length / 2;
        const float rotated_real
                = spectrum.real[odd_index] * twiddle_real
                  - spectrum.imaginary[odd_index] * twiddle_imaginary;
        const float rotated_imaginary
                = spectrum.real[odd_index] * twiddle_imaginary
                  + spectrum.imaginary[odd_index] * twiddle_real;
        const float even_real = spectrum.real[even_index];
        const float even_imaginary = spectrum.imaginary[even_index];

        spectrum.real[even_index] = even_real + rotated_real;
        spectrum.imaginary[even_index] = even_imaginary + rotated_imaginary;
        spectrum.real[odd_index] = even_real - rotated_real;
        spectrum.imaginary[odd_index] = even_imaginary - rotated_imaginary;

        const float next_twiddle_real
                = twiddle_real * step_real - twiddle_imaginary * step_imaginary;
        twiddle_imaginary
                = twiddle_real * step_imaginary + twiddle_imaginary * step_real;
        twiddle_real = next_twiddle_real;
    }
}

void apply_fft_stages(FrequencySpectrum &spectrum) {
    // Each stage doubles the length by combining even and odd subtransforms.
    for (size_t transform_length = 2;
         transform_length <= spectrum.number_of_samples;
         transform_length <<= 1) {
        const float step_angle = -2.0f * fourier_config::FOURIER_PI
                                 / static_cast<float>(transform_length);
        const float step_real = cosf(step_angle);
        const float step_imaginary = sinf(step_angle);
        for (size_t start_index = 0; start_index < spectrum.number_of_samples;
             start_index += transform_length) {
            combine_subtransforms(spectrum, start_index, transform_length,
                                  step_real, step_imaginary);
        }
    }
}

} // namespace

bool compute_fast_fourier_transform(
        const AudioSamples &time_domain_samples,
        FrequencySpectrum *frequency_domain_coefficients) {
    if (frequency_domain_coefficients == nullptr) {
        return false;
    }
    frequency_domain_coefficients->number_of_samples = 0;

    const size_t number_of_samples = time_domain_samples.number_of_samples;
    if (!fourier_config::is_supported_fft_size(number_of_samples)) {
        return false;
    }

    for (size_t sample_index = 0; sample_index < number_of_samples;
         ++sample_index) {
        frequency_domain_coefficients->real[sample_index]
                = time_domain_samples.amplitude[sample_index];
        frequency_domain_coefficients->imaginary[sample_index] = 0.0f;
    }

    frequency_domain_coefficients->number_of_samples = number_of_samples;
    reorder_bit_reversed_samples(*frequency_domain_coefficients);
    apply_fft_stages(*frequency_domain_coefficients);
    return true;
}

} // namespace fourier
