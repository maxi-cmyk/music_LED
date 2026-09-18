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

// Gains measured with the physical speaker and KY-037 under a fixed test
// setup. Recheck perceived LED brightness after every hardware, volume, or
// speaker-position change.
// The calibrated single-tone strengths are roughly 2200-2600 magnitude units.
// This common scale brings those tones to full LED output while preserving the
// measured per-channel balance and all composite-colour ratios.
constexpr float kBrightnessPerMagnitudeUnit = 0.12f;
constexpr float kRedChannelGain = 1.0f;
constexpr float kGreenChannelGain = 0.82f;
constexpr float kBlueChannelGain = 0.92f;
constexpr uint8_t kMaximumChannelBrightness = 255;
// Keep LED switching above the audible range and away from the 1 kHz tone
// that coupled into the KY-037 when the ESP32 analogWrite default was used.
constexpr uint32_t kRgbPwmFrequencyHz = 32000;

} // namespace lighting_config
