#pragma once

#include <stdint.h>

struct PlaybackState {
  const char* trackTitle;
  const char* artistName;
  const uint8_t* trackTitleBitmap;
  const uint8_t* artistNameBitmap;
  unsigned long elapsedMs;
  unsigned long durationMs;
  uint8_t volumePercent;
  bool isPlaying;
};
