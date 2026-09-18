#pragma once

#include <stddef.h>
#include <stdint.h>

namespace audio_config {

constexpr uint16_t kAdcMinimumValue = 0;
constexpr uint16_t kAdcMaximumValue = 4095;
constexpr uint16_t kClippingMargin = 8;
constexpr size_t kNoiseCalibrationSamples = 512;
constexpr uint32_t kNoiseCalibrationIntervalMicroseconds = 100;
constexpr float kMinimumNoiseFloorRms = 6.0f;
constexpr float kMaximumNoiseFloorRms = 80.0f;
constexpr float kNoiseFloorCalibrationMultiplier = 1.35f;
constexpr float kSilenceThresholdMultiplier = 1.5f;
constexpr uint32_t kMinimumFrameIntervalMilliseconds = 30;
constexpr uint32_t kSerialReportIntervalMilliseconds = 500;

} // namespace audio_config
