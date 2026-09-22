#pragma once

#include <stddef.h>
#include <stdint.h>

namespace audio_config {

constexpr uint16_t kAdcMinimumValue = 0;
constexpr uint16_t kAdcMaximumValue = 4095;
constexpr uint16_t kClippingMargin = 8;
constexpr uint32_t kMicrophoneSettleMilliseconds = 250;
constexpr size_t kNoiseCalibrationDiscardSamples = 64;
constexpr size_t kNoiseCalibrationSamples = 512;
constexpr uint32_t kNoiseCalibrationIntervalMicroseconds = 100;
constexpr float kMinimumNoiseFloorRms = 6.0f;
// Current live telemetry places settled silence around 2-5 RMS and discrete
// tones around 11-17 RMS. Startup calibration can briefly report about 15 RMS,
// so cap that transient before it raises the gate above the controlled tones.
constexpr float kMaximumNoiseFloorRms = 8.0f;
constexpr float kNoiseFloorCalibrationMultiplier = 1.35f;
// The highest possible gate is therefore 9.2 RMS: above the settled quiet
// floor, but below the measured discrete-tone frames.
constexpr float kSilenceThresholdMultiplier = 1.15f;
constexpr uint32_t kMinimumFrameIntervalMilliseconds = 30;
constexpr uint32_t kSerialReportIntervalMilliseconds = 500;
constexpr uint32_t kSpectrumSerialReportIntervalMilliseconds = 200;

} // namespace audio_config
