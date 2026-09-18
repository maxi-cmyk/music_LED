#include "RgbLedOutput.h"

#include <Arduino.h>

#include "../config/LightingConfig.h"
#include "../config/PinConfig.h"

void setupRgbLedOutput() {
  pinMode(pins::kRgbRed, OUTPUT);
  pinMode(pins::kRgbGreen, OUTPUT);
  pinMode(pins::kRgbBlue, OUTPUT);
  // Calling this before the first analogWrite changes the shared default used
  // when each RGB pin is attached to an LEDC channel.
  analogWriteFrequency(pins::kRgbRed, lighting_config::kRgbPwmFrequencyHz);
  turnOffRgbLed();
}

void runRgbLedSelfTest() {
  constexpr uint8_t kSelfTestBrightness = 80;
  constexpr uint32_t kChannelDisplayTimeMilliseconds = 300;

  Serial.println("RGB_SELF_TEST,red");
  writeRgbBrightness({kSelfTestBrightness, 0, 0});
  delay(kChannelDisplayTimeMilliseconds);

  Serial.println("RGB_SELF_TEST,green");
  writeRgbBrightness({0, kSelfTestBrightness, 0});
  delay(kChannelDisplayTimeMilliseconds);

  Serial.println("RGB_SELF_TEST,blue");
  writeRgbBrightness({0, 0, kSelfTestBrightness});
  delay(kChannelDisplayTimeMilliseconds);

  turnOffRgbLed();
  Serial.println("RGB_SELF_TEST,complete");
}

void writeRgbBrightness(const RgbBrightness &brightness) {
  // The HW-479/KY-016 is common-cathode: 0 is off and 255 is fully on.
  analogWrite(pins::kRgbRed, brightness.red);
  analogWrite(pins::kRgbGreen, brightness.green);
  analogWrite(pins::kRgbBlue, brightness.blue);
}

void turnOffRgbLed() { writeRgbBrightness({0, 0, 0}); }
