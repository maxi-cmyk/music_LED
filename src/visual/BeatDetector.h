#pragma once

#include <Arduino.h>

#include "../audio/AudioSampler.h"

struct BeatState {
  bool detected;
  uint8_t activeLed;
  float brightness;
};

class BeatDetector {
 public:
  BeatState update(const AudioFrame& frame, unsigned long now);

 private:
  float threshold_ = 10.0F;
  float brightness_ = 0.0F;
  uint8_t currentLed_ = 0;
  unsigned long lastBeatTime_ = 0;
};
