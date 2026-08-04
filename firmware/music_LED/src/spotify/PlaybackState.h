#pragma once

#include <stdint.h>

struct PlaybackState {
  const char* trackId;
  const char* trackTitle;
  const char* artistName;
  const uint8_t* trackTitleBitmap;
  uint16_t trackTitleBitmapWidth;
  const uint8_t* artistNameBitmap;
  uint16_t artistNameBitmapWidth;
  const uint8_t* albumArtBitmap;
  uint8_t albumArtWidth;
  uint8_t albumArtHeight;
  unsigned long elapsedMs;
  unsigned long durationMs;
  unsigned long syncedAtMs;
  bool available;
  bool isPlaying;
};
