#pragma once

#include <stddef.h>
#include <stdint.h>

struct LiveAudioDiagnostics {
    uint32_t sample_span_microseconds = 0;
    uint32_t expected_sample_span_microseconds = 0;
    uint32_t maximum_lateness_microseconds = 0;
    uint16_t missed_sample_deadlines = 0;
    uint16_t clipped_samples = 0;
    float achieved_sampling_frequency_hz = 0.0f;
    float centered_root_mean_square = 0.0f;
    float noise_floor_root_mean_square = 0.0f;
    float silence_threshold_root_mean_square = 0.0f;
    size_t dominant_frequency_bin_index = 0;
    float dominant_frequency_hz = 0.0f;
    float dominant_magnitude = 0.0f;
    float bass_strength = 0.0f;
    float midrange_strength = 0.0f;
    float treble_strength = 0.0f;
    uint8_t red_brightness = 0;
    uint8_t green_brightness = 0;
    uint8_t blue_brightness = 0;
    bool signal_above_silence_threshold = false;
};

void setup_audio_reactive();
void update_audio_reactive();
void stop_audio_reactive();
const LiveAudioDiagnostics &live_audio_diagnostics();
