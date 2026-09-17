#pragma once

#include <stdint.h>

namespace pins {
// HW-479 physical order is B, G, R, -. Keep its wires on the ESP32's lower row.
constexpr uint8_t kRgbRed = 19;
constexpr uint8_t kRgbGreen = 18;
constexpr uint8_t kRgbBlue = 5;
// ADC1 remains usable while ESP32 Wi-Fi is active.
constexpr uint8_t kMicrophoneAnalog = 34;
}  // namespace pins
