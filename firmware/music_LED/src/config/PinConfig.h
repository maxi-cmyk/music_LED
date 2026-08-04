#pragma once

#include <stdint.h>

namespace pins {
constexpr uint8_t kOledSda = 21;
constexpr uint8_t kOledScl = 22;
// HW-479 physical order is B, G, R, -. Keep its wires on the ESP32's lower row.
constexpr uint8_t kRgbRed = 19;
constexpr uint8_t kRgbGreen = 18;
constexpr uint8_t kRgbBlue = 5;
constexpr uint8_t kOledI2cAddress = 0x3C;
}  // namespace pins
