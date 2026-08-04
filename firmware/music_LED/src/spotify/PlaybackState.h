#pragma once

#include <stdint.h>

struct PlaybackState {
  const char* trackTitle;
  const char* artistName;
  unsigned long elapsedMs;
  unsigned long durationMs;
  uint8_t volumePercent;
  bool isPlaying;
};
