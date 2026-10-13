#pragma once

#include <stddef.h>

#include "../fourier/FourierTypes.h"

namespace synthetic_signals {

bool generate_zero_signal(size_t number_of_samples,
                          fourier::AudioSamples *output);
bool generate_constant_signal(size_t number_of_samples, float amplitude,
                              fourier::AudioSamples *output);
bool generate_impulse_signal(size_t number_of_samples,
                             size_t impulse_sample_index, float amplitude,
                             fourier::AudioSamples *output);
bool generate_four_point_worked_example(fourier::AudioSamples *output);
bool generate_cosine_at_bin(size_t number_of_samples,
                            size_t frequency_bin_index, float amplitude,
                            float phase_radians, fourier::AudioSamples *output);
bool generate_two_cosines_at_bins(
        size_t number_of_samples, size_t first_frequency_bin_index,
        float first_amplitude, float first_phase_radians,
        size_t second_frequency_bin_index, float second_amplitude,
        float second_phase_radians, fourier::AudioSamples *output);

} // namespace synthetic_signals
