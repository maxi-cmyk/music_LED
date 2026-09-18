#pragma once

#include <stdint.h>

#include "../fourier/FourierTypes.h"

struct AudioSamplingDiagnostics {
  uint32_t sampleSpanMicroseconds = 0;
  uint32_t expectedSampleSpanMicroseconds = 0;
  uint32_t maximumLatenessMicroseconds = 0;
  uint16_t missedDeadlines = 0;
  uint16_t clippedSamples = 0;
  float achievedSamplingFrequencyHz = 0.0f;
};

void setupAudioSampler();

// Collects one raw ADC frame. Sampling uses a fractional-microsecond schedule
// derived from the configured rate. If a deadline is missed by a complete
// interval, the schedule is realigned to prevent catch-up samples in a burst.
bool collectAudioSamples(fourier::AudioSamples *rawSamples,
                         AudioSamplingDiagnostics *diagnostics);

// Measures startup room noise with Welford's stable running-variance method.
// The result is in raw ADC RMS units and is not a calibrated acoustic unit.
float measureMicrophoneNoiseRms();
