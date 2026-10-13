#pragma once

#include <stddef.h>
#include <stdint.h>

namespace audio_config {

constexpr uint8_t ADC_RESOLUTION_BITS = 12;
constexpr uint16_t ADC_MINIMUM_VALUE = 0;
constexpr uint16_t ADC_MAXIMUM_VALUE = 4095;
constexpr uint16_t CLIPPING_MARGIN = 8;
constexpr uint32_t MICROPHONE_SETTLE_MILLISECONDS = 250;
constexpr size_t NOISE_CALIBRATION_DISCARD_SAMPLES = 64;
constexpr size_t NOISE_CALIBRATION_SAMPLES = 512;
constexpr uint32_t NOISE_CALIBRATION_INTERVAL_MICROSECONDS = 100;
constexpr float MINIMUM_NOISE_FLOOR_RMS = 6.0f;
// Current live telemetry places settled silence around 2-5 RMS and discrete
// tones around 11-17 RMS. Startup calibration can briefly report about 15 RMS,
// so cap that transient before it raises the gate above the controlled tones.
constexpr float MAXIMUM_NOISE_FLOOR_RMS = 8.0f;
constexpr float NOISE_FLOOR_CALIBRATION_MULTIPLIER = 1.35f;
// The highest possible gate is therefore 9.2 RMS: above the settled quiet
// floor, but below the measured discrete-tone frames.
constexpr float SILENCE_THRESHOLD_MULTIPLIER = 1.15f;
constexpr uint32_t MINIMUM_FRAME_INTERVAL_MILLISECONDS = 30;
constexpr uint32_t SERIAL_REPORT_INTERVAL_MILLISECONDS = 500;
constexpr uint32_t SPECTRUM_SERIAL_REPORT_INTERVAL_MILLISECONDS = 200;

} // namespace audio_config
