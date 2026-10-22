#include "AudioSampler.h"

#include <Arduino.h>
#include <math.h>

#include "../config/AudioConfig.h"
#include "../config/FourierConfig.h"
#include "../config/PinConfig.h"

namespace {

bool sample_is_clipped(uint16_t sample) {
    return sample <= audio_config::ADC_MINIMUM_VALUE
                             + audio_config::CLIPPING_MARGIN
           || sample >= audio_config::ADC_MAXIMUM_VALUE
                                - audio_config::CLIPPING_MARGIN;
}

void wait_until_microsecond_deadline(uint32_t deadline_microseconds) {
    while (static_cast<int32_t>(micros() - deadline_microseconds) < 0) {
        delayMicroseconds(1);
    }
}

struct SamplingSchedule {
    uint32_t fractional_interval_accumulator = 0;
    uint32_t next_deadline_microseconds = 0;
};

void advance_sampling_deadline(SamplingSchedule &schedule) {
    uint32_t interval_microseconds
            = fourier_config::BASE_SAMPLE_INTERVAL_MICROSECONDS;
    schedule.fractional_interval_accumulator
            += fourier_config::SAMPLE_INTERVAL_REMAINDER;
    if (schedule.fractional_interval_accumulator
        >= fourier_config::SAMPLING_FREQUENCY_HZ) {
        ++interval_microseconds;
        schedule.fractional_interval_accumulator
                -= fourier_config::SAMPLING_FREQUENCY_HZ;
    }
    schedule.next_deadline_microseconds += interval_microseconds;
    wait_until_microsecond_deadline(schedule.next_deadline_microseconds);
}

uint32_t record_audio_sample(fourier::AudioSamples &raw_samples,
                             size_t sample_index,
                             AudioSamplingDiagnostics &diagnostics,
                             SamplingSchedule &schedule) {
    const uint32_t sample_time_microseconds = micros();
    const uint32_t lateness_microseconds
            = sample_time_microseconds - schedule.next_deadline_microseconds;
    if (lateness_microseconds > diagnostics.maximum_lateness_microseconds) {
        diagnostics.maximum_lateness_microseconds = lateness_microseconds;
    }
    if (lateness_microseconds
        >= fourier_config::BASE_SAMPLE_INTERVAL_MICROSECONDS) {
        ++diagnostics.missed_deadlines;
        schedule.next_deadline_microseconds = sample_time_microseconds;
        schedule.fractional_interval_accumulator = 0;
    }

    const uint16_t raw_adc_sample
            = static_cast<uint16_t>(analogRead(pins::MICROPHONE_ANALOG));
    raw_samples.amplitude[sample_index] = static_cast<float>(raw_adc_sample);
    if (sample_is_clipped(raw_adc_sample)) {
        ++diagnostics.clipped_samples;
    }
    return sample_time_microseconds;
}

} // namespace

void setup_audio_sampler() {
    pinMode(pins::MICROPHONE_ANALOG, INPUT);
    analogReadResolution(audio_config::ADC_RESOLUTION_BITS);
    analogSetPinAttenuation(pins::MICROPHONE_ANALOG, ADC_11db);
}

bool collect_audio_samples(fourier::AudioSamples *raw_samples,
                           AudioSamplingDiagnostics *diagnostics) {
    if (raw_samples == nullptr || diagnostics == nullptr) {
        return false;
    }

    *diagnostics = AudioSamplingDiagnostics{};
    diagnostics->expected_sample_span_microseconds
            = fourier_config::EXPECTED_SAMPLE_SPAN_MICROSECONDS;
    raw_samples->number_of_samples = fourier_config::NUMBER_OF_SAMPLES;

    SamplingSchedule schedule{};
    schedule.next_deadline_microseconds = micros();
    const uint32_t first_sample_time_microseconds
            = record_audio_sample(*raw_samples, 0, *diagnostics, schedule);
    uint32_t last_sample_time_microseconds = first_sample_time_microseconds;
    for (size_t sample_index = 1;
         sample_index < fourier_config::NUMBER_OF_SAMPLES; ++sample_index) {
        advance_sampling_deadline(schedule);
        last_sample_time_microseconds = record_audio_sample(
                *raw_samples, sample_index, *diagnostics, schedule);
    }

    diagnostics->sample_span_microseconds
            = last_sample_time_microseconds - first_sample_time_microseconds;
    if (diagnostics->sample_span_microseconds > 0) {
        diagnostics->achieved_sampling_frequency_hz
                = static_cast<float>(fourier_config::NUMBER_OF_SAMPLES - 1)
                  * static_cast<float>(fourier_config::MICROSECONDS_PER_SECOND)
                  / static_cast<float>(diagnostics->sample_span_microseconds);
    }
    return true;
}

float measure_microphone_noise_rms() {
    // ADC2 can produce a short transient after its pin and attenuation are
    // configured. Let the microphone/ADC settle and discard initial conversions
    // so that transient cannot become the fixed noise floor for the whole run.
    delay(audio_config::MICROPHONE_SETTLE_MILLISECONDS);
    for (size_t discarded_sample = 0;
         discarded_sample < audio_config::NOISE_CALIBRATION_DISCARD_SAMPLES;
         ++discarded_sample) {
        analogRead(pins::MICROPHONE_ANALOG);
        delayMicroseconds(
                audio_config::NOISE_CALIBRATION_INTERVAL_MICROSECONDS);
    }

    float running_mean = 0.0f;
    float sum_squared_differences = 0.0f;
    for (size_t sample_number = 1;
         sample_number <= audio_config::NOISE_CALIBRATION_SAMPLES;
         ++sample_number) {
        const float sample
                = static_cast<float>(analogRead(pins::MICROPHONE_ANALOG));
        const float difference_from_previous_mean = sample - running_mean;
        running_mean += difference_from_previous_mean
                        / static_cast<float>(sample_number);
        sum_squared_differences
                += difference_from_previous_mean * (sample - running_mean);
        delayMicroseconds(
                audio_config::NOISE_CALIBRATION_INTERVAL_MICROSECONDS);
    }
    return sqrtf(
            sum_squared_differences
            / static_cast<float>(audio_config::NOISE_CALIBRATION_SAMPLES - 1));
}
