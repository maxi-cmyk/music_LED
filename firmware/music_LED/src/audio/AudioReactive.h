#pragma once

#include <stdint.h>

struct AudioVisualState {
  uint8_t bass;
  uint8_t mid;
  uint8_t treble;
  uint8_t beatStrength;
  uint32_t beatCount;
  bool active;
};

void setupAudioReactive();
void updateAudioReactive(bool playbackActive);
void stopAudioReactive();
const AudioVisualState& audioVisualState();
