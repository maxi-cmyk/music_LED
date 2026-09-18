#pragma once

#include <stddef.h>
#include <stdint.h>

namespace lighting_config {

constexpr size_t kBassFirstBin = 1;
constexpr size_t kBassLastBin = 5;
constexpr size_t kMidrangeFirstBin = 6;
constexpr size_t kMidrangeLastBin = 20;
constexpr size_t kTrebleFirstBin = 21;
constexpr size_t kTrebleLastBin = 50;

// These are deliberately fixed initial values. Physical calibration may
// change the gains and common scale, but never the frequency-bin boundaries.
constexpr float kBrightnessPerMagnitudeUnit = 0.06f;
constexpr float kRedChannelGain = 1.0f;
constexpr float kGreenChannelGain = 1.0f;
constexpr float kBlueChannelGain = 1.0f;
constexpr uint8_t kMaximumChannelBrightness = 220;

} // namespace lighting_config
