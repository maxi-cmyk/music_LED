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
// The calibrated quiet-room runs were about 15-18 RMS, while the controlled
// tones began around 29 RMS. A startup transient must not raise the silence
// gate above the actual tones and leave every RGB channel permanently off.
constexpr float kMaximumNoiseFloorRms = 20.0f;
constexpr float kNoiseFloorCalibrationMultiplier = 1.35f;
// Keep enough separation from the measured room noise without placing the
// gate at the same RMS level as the quieter controlled tones.
constexpr float kSilenceThresholdMultiplier = 1.15f;
constexpr uint32_t kMinimumFrameIntervalMilliseconds = 30;
constexpr uint32_t kSerialReportIntervalMilliseconds = 500;
constexpr uint32_t kSpectrumSerialReportIntervalMilliseconds = 200;

} // namespace audio_config
