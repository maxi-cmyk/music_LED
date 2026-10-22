#include "SyntheticSignals.h"

#include <math.h>

#include "../config/FourierConfig.h"

namespace synthetic_signals {
namespace {

bool prepare_output(size_t number_of_samples, fourier::AudioSamples *output) {
    if (output == nullptr
        || !fourier_config::is_supported_sample_count(number_of_samples)) {
        if (output != nullptr) {
            output->number_of_samples = 0;
        }
        return false;
    }
    output->number_of_samples = number_of_samples;
    for (size_t sample_index = 0; sample_index < number_of_samples;
         ++sample_index) {
        output->amplitude[sample_index] = 0.0f;
    }
    return true;
}

float cosine_amplitude(size_t sample_index, size_t number_of_samples,
                       size_t frequency_bin_index, float amplitude,
                       float phase_radians) {
    const float angle_radians
            = 2.0f * fourier_config::FOURIER_PI
                      * static_cast<float>(frequency_bin_index)
                      * static_cast<float>(sample_index)
                      / static_cast<float>(number_of_samples)
              + phase_radians;
    return amplitude * cosf(angle_radians);
}

} // namespace

bool generate_zero_signal(size_t number_of_samples,
                          fourier::AudioSamples *output) {
    return prepare_output(number_of_samples, output);
}

bool generate_constant_signal(size_t number_of_samples, float amplitude,
                              fourier::AudioSamples *output) {
    if (!prepare_output(number_of_samples, output)) {
        return false;
    }
    for (size_t sample_index = 0; sample_index < number_of_samples;
         ++sample_index) {
        output->amplitude[sample_index] = amplitude;
    }
    return true;
}

bool generate_impulse_signal(size_t number_of_samples,
                             size_t impulse_sample_index, float amplitude,
                             fourier::AudioSamples *output) {
    if (!prepare_output(number_of_samples, output)
        || impulse_sample_index >= number_of_samples) {
        if (output != nullptr) {
            output->number_of_samples = 0;
        }
        return false;
    }
    output->amplitude[impulse_sample_index] = amplitude;
    return true;
}

bool generate_four_point_worked_example(fourier::AudioSamples *output) {
    if (!prepare_output(4, output)) {
        return false;
    }
    output->amplitude[0] = 1.0f;
    output->amplitude[1] = 0.0f;
    output->amplitude[2] = -1.0f;
    output->amplitude[3] = 0.0f;
    return true;
}

bool generate_cosine_at_bin(size_t number_of_samples,
                            size_t frequency_bin_index, float amplitude,
                            float phase_radians,
                            fourier::AudioSamples *output) {
    if (!prepare_output(number_of_samples, output)
        || frequency_bin_index >= number_of_samples) {
        if (output != nullptr) {
            output->number_of_samples = 0;
        }
        return false;
    }
    for (size_t sample_index = 0; sample_index < number_of_samples;
         ++sample_index) {
        output->amplitude[sample_index] = cosine_amplitude(
                sample_index, number_of_samples, frequency_bin_index, amplitude,
                phase_radians);
    }
    return true;
}

bool generate_two_cosines_at_bins(
        size_t number_of_samples, size_t first_frequency_bin_index,
        float first_amplitude, float first_phase_radians,
        size_t second_frequency_bin_index, float second_amplitude,
        float second_phase_radians, fourier::AudioSamples *output) {
    if (!prepare_output(number_of_samples, output)
        || first_frequency_bin_index >= number_of_samples
        || second_frequency_bin_index >= number_of_samples) {
        if (output != nullptr) {
            output->number_of_samples = 0;
        }
        return false;
    }
    for (size_t sample_index = 0; sample_index < number_of_samples;
         ++sample_index) {
        output->amplitude[sample_index]
                = cosine_amplitude(sample_index, number_of_samples,
                                   first_frequency_bin_index, first_amplitude,
                                   first_phase_radians)
                  + cosine_amplitude(sample_index, number_of_samples,
                                     second_frequency_bin_index,
                                     second_amplitude, second_phase_radians);
    }
    return true;
}

} // namespace synthetic_signals
