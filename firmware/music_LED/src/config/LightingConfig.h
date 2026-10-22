#pragma once

#include <stddef.h>
#include <stdint.h>

namespace lighting_config {

constexpr size_t BASS_FIRST_BIN = 1;
constexpr size_t BASS_LAST_BIN = 5;
constexpr size_t MIDRANGE_FIRST_BIN = 6;
constexpr size_t MIDRANGE_LAST_BIN = 20;
constexpr size_t TREBLE_FIRST_BIN = 21;
constexpr size_t TREBLE_LAST_BIN = 50;

// Original per-channel calibration. Recheck perceived brightness after every
// hardware, volume, or speaker-position change.
constexpr float BRIGHTNESS_PER_MAGNITUDE_UNIT = 0.12f;
constexpr float RED_CHANNEL_GAIN = 1.0f;
constexpr float GREEN_CHANNEL_GAIN = 0.82f;
constexpr float BLUE_CHANNEL_GAIN = 0.92f;
// Remove a weak channel when it is no more than 15% of the strongest channel.
// Rescaling by 1 - ratio keeps the strongest channel and equal mixtures at
// their original strength while suppressing low-level cross-band leakage.
constexpr float CROSS_BAND_LEAKAGE_RATIO = 0.15f;
constexpr uint8_t MAXIMUM_CHANNEL_BRIGHTNESS = 255;
// Keep LED switching above the audible range and away from the 1 kHz tone
// that coupled into the KY-037 when the ESP32 analogWrite default was used.
constexpr uint32_t RGB_PWM_FREQUENCY_HZ = 32000;

} // namespace lighting_config
