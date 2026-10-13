#pragma once

#include <stdint.h>

#include "../fourier/FourierTypes.h"

struct AudioSamplingDiagnostics {
    uint32_t sample_span_microseconds = 0;
    uint32_t expected_sample_span_microseconds = 0;
    uint32_t maximum_lateness_microseconds = 0;
    uint16_t missed_deadlines = 0;
    uint16_t clipped_samples = 0;
    float achieved_sampling_frequency_hz = 0.0f;
};

void setup_audio_sampler();

// Collects one raw ADC frame. Sampling uses a fractional-microsecond schedule
// derived from the configured rate. If a deadline is missed by a complete
// interval, the schedule is realigned to prevent catch-up samples in a burst.
bool collect_audio_samples(fourier::AudioSamples *raw_samples,
                           AudioSamplingDiagnostics *diagnostics);

// Measures startup room noise with Welford's stable running-variance method.
// The result is in raw ADC RMS units and is not a calibrated acoustic unit.
float measure_microphone_noise_rms();
