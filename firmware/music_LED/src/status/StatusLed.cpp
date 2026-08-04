#include "StatusLed.h"

#include <Arduino.h>

#include "../config/PinConfig.h"

void setupStatusLed() {
  pinMode(pins::kRgbRed, OUTPUT);
  pinMode(pins::kRgbGreen, OUTPUT);
  pinMode(pins::kRgbBlue, OUTPUT);
  setStatusLed(0, 0, 0);
}

void setStatusLed(uint8_t red, uint8_t green, uint8_t blue) {
  // HW-479 / KY-016 is common-cathode: 0 is off, 255 is fully on.
  analogWrite(pins::kRgbRed, red);
  analogWrite(pins::kRgbGreen, green);
  analogWrite(pins::kRgbBlue, blue);
}
