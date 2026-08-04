#pragma once

#include <Arduino.h>

namespace audio_config {
constexpr unsigned long kSampleWindowMs = 50;
constexpr int kNoiseFloor = 4;
constexpr int kCenterVoltage = 520;
constexpr int kHighFrequencyOffset = 10;
constexpr unsigned long kBeatCooldownMs = 100;
constexpr float kInitialBeatThreshold = 10.0F;
constexpr float kDecayRate = 0.95F;
constexpr float kMinimumBrightness = 50.0F;
constexpr float kBrightnessDecay = 0.96F;
}  // namespace audio_config
