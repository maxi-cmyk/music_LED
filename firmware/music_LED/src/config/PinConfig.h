#pragma once

#include <stdint.h>

namespace pins {
// HW-479 physical order is B, G, R, -. Keep its wires on the ESP32's lower row.
constexpr uint8_t RGB_RED = 19;
constexpr uint8_t RGB_GREEN = 18;
constexpr uint8_t RGB_BLUE = 5;
// GPIO 4 is an ADC2 pin on the classic ESP32. Keep Wi-Fi disabled while the
// microphone is sampled because the Wi-Fi driver also uses ADC2.
constexpr uint8_t MICROPHONE_ANALOG = 4;
} // namespace pins
