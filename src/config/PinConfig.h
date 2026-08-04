#pragma once

#include <stdint.h>

namespace pins {
constexpr uint8_t kOledSda = 21;
constexpr uint8_t kOledScl = 22;
constexpr uint8_t kRgbRed = 25;
constexpr uint8_t kRgbGreen = 26;
constexpr uint8_t kRgbBlue = 27;
constexpr uint8_t kOledI2cAddress = 0x3C;
}  // namespace pins
