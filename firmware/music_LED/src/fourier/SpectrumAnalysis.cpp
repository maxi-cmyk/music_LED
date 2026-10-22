#include "SpectrumAnalysis.h"

#include <math.h>

namespace fourier {

bool calculate_spectrum_magnitudes(
        const FrequencySpectrum &frequency_domain_coefficients,
        SpectrumMagnitudes *magnitudes) {
    if (magnitudes == nullptr
        || !fourier_config::is_supported_sample_count(
                frequency_domain_coefficients.number_of_samples)) {
        if (magnitudes != nullptr) {
            magnitudes->number_of_samples = 0;
        }
        return false;
    }

    magnitudes->number_of_samples
            = frequency_domain_coefficients.number_of_samples;
    for (size_t frequency_bin_index = 0;
         frequency_bin_index < frequency_domain_coefficients.number_of_samples;
         ++frequency_bin_index) {
        const float real
                = frequency_domain_coefficients.real[frequency_bin_index];
        const float imaginary
                = frequency_domain_coefficients.imaginary[frequency_bin_index];
        magnitudes->magnitude[frequency_bin_index]
                = sqrtf(real * real + imaginary * imaginary);
    }
    return true;
}

float frequency_for_bin_hz(size_t frequency_bin_index, size_t number_of_samples,
                           float sampling_frequency_hz) {
    if (number_of_samples == 0 || frequency_bin_index >= number_of_samples) {
        return 0.0f;
    }
    return static_cast<float>(frequency_bin_index) * sampling_frequency_hz
           / static_cast<float>(number_of_samples);
}

bool find_dominant_nonnegative_frequency(
        const SpectrumMagnitudes &magnitudes, float sampling_frequency_hz,
        DominantFrequency *dominant_frequency) {
    if (dominant_frequency == nullptr || magnitudes.number_of_samples < 2) {
        return false;
    }

    *dominant_frequency = DominantFrequency{};
    const size_t nyquist_bin = magnitudes.number_of_samples / 2;
    for (size_t frequency_bin_index = 1; frequency_bin_index <= nyquist_bin;
         ++frequency_bin_index) {
        const float magnitude = magnitudes.magnitude[frequency_bin_index];
        if (magnitude > dominant_frequency->magnitude) {
            dominant_frequency->frequency_bin_index = frequency_bin_index;
            dominant_frequency->magnitude = magnitude;
        }
    }
    dominant_frequency->frequency_hz = frequency_for_bin_hz(
            dominant_frequency->frequency_bin_index,
            magnitudes.number_of_samples, sampling_frequency_hz);
    return true;
}

float calculate_band_strength(const SpectrumMagnitudes &magnitudes,
                              size_t first_frequency_bin_index,
                              size_t last_frequency_bin_index) {
    if (magnitudes.number_of_samples == 0
        || first_frequency_bin_index > last_frequency_bin_index
        || last_frequency_bin_index >= magnitudes.number_of_samples) {
        return 0.0f;
    }

    float sum_squared_magnitudes = 0.0f;
    for (size_t frequency_bin_index = first_frequency_bin_index;
         frequency_bin_index <= last_frequency_bin_index;
         ++frequency_bin_index) {
        const float magnitude = magnitudes.magnitude[frequency_bin_index];
        sum_squared_magnitudes += magnitude * magnitude;
    }
    return sqrtf(sum_squared_magnitudes);
}

} // namespace fourier
