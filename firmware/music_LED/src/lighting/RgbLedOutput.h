#pragma once

#include "FrequencyToColor.h"

void setup_rgb_led_output();
void run_rgb_led_self_test();
void write_rgb_brightness(const RgbBrightness &brightness);
void turn_off_rgb_led();
