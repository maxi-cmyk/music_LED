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

// Original per-channel calibration. Recheck perceived brightness after every
// hardware, volume, or speaker-position change.
constexpr float kBrightnessPerMagnitudeUnit = 0.12f;
constexpr float kRedChannelGain = 1.0f;
constexpr float kGreenChannelGain = 0.82f;
constexpr float kBlueChannelGain = 0.92f;
// Remove a weak channel when it is no more than 15% of the strongest channel.
// Rescaling by 1 - ratio keeps the strongest channel and equal mixtures at
// their original strength while suppressing low-level cross-band leakage.
constexpr float kCrossBandLeakageRatio = 0.15f;
constexpr uint8_t kMaximumChannelBrightness = 255;
// Keep LED switching above the audible range and away from the 1 kHz tone
// that coupled into the KY-037 when the ESP32 analogWrite default was used.
constexpr uint32_t kRgbPwmFrequencyHz = 32000;

} // namespace lighting_config
