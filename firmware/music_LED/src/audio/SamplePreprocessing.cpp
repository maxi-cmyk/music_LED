#include "SamplePreprocessing.h"

#include <math.h>

#include "../config/FourierConfig.h"

namespace {

float window_coefficient(WindowFunction window_function, size_t sample_index,
                         size_t number_of_samples) {
    if (window_function == WindowFunction::None || number_of_samples <= 1) {
        return 1.0f;
    }
    constexpr float HAMMING_OFFSET = 0.54f;
    constexpr float HAMMING_COSINE_WEIGHT = 0.46f;
    return HAMMING_OFFSET
           - HAMMING_COSINE_WEIGHT
                     * cosf(2.0f * fourier_config::FOURIER_PI
                            * static_cast<float>(sample_index)
                            / static_cast<float>(number_of_samples - 1));
}

} // namespace

bool prepare_audio_samples(const fourier::AudioSamples &raw_samples,
                           WindowFunction window_function,
                           fourier::AudioSamples *prepared_samples,
                           SamplePreprocessingResults *results) {
    if (prepared_samples == nullptr || results == nullptr
        || !fourier_config::is_supported_sample_count(
                raw_samples.number_of_samples)) {
        if (prepared_samples != nullptr) {
            prepared_samples->number_of_samples = 0;
        }
        return false;
    }

    *results = SamplePreprocessingResults{};
    const size_t number_of_samples = raw_samples.number_of_samples;
    for (size_t sample_index = 0; sample_index < number_of_samples;
         ++sample_index) {
        results->frame_mean += raw_samples.amplitude[sample_index];
    }
    results->frame_mean /= static_cast<float>(number_of_samples);

    prepared_samples->number_of_samples = number_of_samples;
    float sum_centered_squares = 0.0f;
    for (size_t sample_index = 0; sample_index < number_of_samples;
         ++sample_index) {
        const float centered_sample
                = raw_samples.amplitude[sample_index] - results->frame_mean;
        sum_centered_squares += centered_sample * centered_sample;
        prepared_samples->amplitude[sample_index]
                = centered_sample
                  * window_coefficient(window_function, sample_index,
                                       number_of_samples);
    }
    results->centered_root_mean_square = sqrtf(
            sum_centered_squares / static_cast<float>(number_of_samples));
    return true;
}
