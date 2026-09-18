#pragma once

#include <stdint.h>

namespace pins {
// HW-479 physical order is B, G, R, -. Keep its wires on the ESP32's lower row.
constexpr uint8_t kRgbRed = 19;
constexpr uint8_t kRgbGreen = 18;
constexpr uint8_t kRgbBlue = 5;
// GPIO 4 is an ADC2 pin on the classic ESP32. Keep Wi-Fi disabled while the
// microphone is sampled because the Wi-Fi driver also uses ADC2.
constexpr uint8_t kMicrophoneAnalog = 4;
} // namespace pins
