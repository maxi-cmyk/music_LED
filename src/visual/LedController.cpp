#include "LedController.h"

#include <Arduino.h>

#include "../config/PinConfig.h"

namespace {
void selectActiveLed(uint8_t activeLed) {
  byte portState = PORTD & 0x0F;
  portState |= 1 << (pins::kActiveLedFirstPortBit + activeLed);
  PORTD = portState;
}

void writeFrequencyColour(int frequencyCrossings, float brightness) {
  int colourPosition = map(constrain(frequencyCrossings, 0, 15), 0, 15, 0, 255);
  int red = 0;
  int green = 0;
  int blue = 0;

  if (colourPosition < 85) {
    red = 255 - colourPosition * 3;
    green = colourPosition * 3;
  } else if (colourPosition < 170) {
    colourPosition -= 85;
    green = 255 - colourPosition * 3;
    blue = colourPosition * 3;
  } else {
    colourPosition -= 170;
    blue = 255 - colourPosition * 3;
    red = colourPosition * 3;
  }

  analogWrite(pins::kRgbRed, static_cast<int>(red * brightness / 255));
  analogWrite(pins::kRgbGreen, static_cast<int>(green * brightness / 255));
  analogWrite(pins::kRgbBlue, static_cast<int>(blue * brightness / 255));
}
}  // namespace

void setupLedOutputs() {
  pinMode(pins::kRgbRed, OUTPUT);
  pinMode(pins::kRgbGreen, OUTPUT);
  pinMode(pins::kRgbBlue, OUTPUT);
  DDRD |= 0xF0;
}

void renderLeds(const BeatState& beatState, int frequencyCrossings) {
  selectActiveLed(beatState.activeLed);
  writeFrequencyColour(frequencyCrossings, beatState.brightness);
}
