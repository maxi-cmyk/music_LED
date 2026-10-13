#include "RgbLedOutput.h"

#include <Arduino.h>

#include "../config/LightingConfig.h"
#include "../config/PinConfig.h"

void setup_rgb_led_output() {
    pinMode(pins::RGB_RED, OUTPUT);
    pinMode(pins::RGB_GREEN, OUTPUT);
    pinMode(pins::RGB_BLUE, OUTPUT);
    // Calling this before the first analogWrite changes the shared default used
    // when each RGB pin is attached to an LEDC channel.
    analogWriteFrequency(pins::RGB_RED, lighting_config::RGB_PWM_FREQUENCY_HZ);
    turn_off_rgb_led();
}

void run_rgb_led_self_test() {
    constexpr uint8_t SELF_TEST_BRIGHTNESS
            = lighting_config::MAXIMUM_CHANNEL_BRIGHTNESS;
    constexpr uint32_t CHANNEL_DISPLAY_TIME_MILLISECONDS = 300;

    Serial.println("RGB_SELF_TEST,red");
    write_rgb_brightness({SELF_TEST_BRIGHTNESS, 0, 0});
    delay(CHANNEL_DISPLAY_TIME_MILLISECONDS);

    Serial.println("RGB_SELF_TEST,green");
    write_rgb_brightness({0, SELF_TEST_BRIGHTNESS, 0});
    delay(CHANNEL_DISPLAY_TIME_MILLISECONDS);

    Serial.println("RGB_SELF_TEST,blue");
    write_rgb_brightness({0, 0, SELF_TEST_BRIGHTNESS});
    delay(CHANNEL_DISPLAY_TIME_MILLISECONDS);

    turn_off_rgb_led();
    Serial.println("RGB_SELF_TEST,complete");
}

void write_rgb_brightness(const RgbBrightness &brightness) {
    // The HW-479/KY-016 is common-cathode: 0 is off and 255 is fully on.
    analogWrite(pins::RGB_RED, brightness.red);
    analogWrite(pins::RGB_GREEN, brightness.green);
    analogWrite(pins::RGB_BLUE, brightness.blue);
}

void turn_off_rgb_led() {
    write_rgb_brightness({0, 0, 0});
}
