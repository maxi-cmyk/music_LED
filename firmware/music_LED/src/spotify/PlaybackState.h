#pragma once

#include <stdint.h>

struct PlaybackState {
  const char* trackTitle;
  const char* artistName;
  const uint8_t* trackTitleBitmap;
  uint16_t trackTitleBitmapWidth;
  const uint8_t* artistNameBitmap;
  uint16_t artistNameBitmapWidth;
  unsigned long elapsedMs;
  unsigned long durationMs;
  unsigned long syncedAtMs;
  bool isPlaying;
};
