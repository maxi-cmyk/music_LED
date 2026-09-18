#pragma once

#include <stddef.h>
#include <stdint.h>

struct LiveAudioDiagnostics {
  uint32_t sampleSpanMicroseconds = 0;
  uint32_t expectedSampleSpanMicroseconds = 0;
  uint32_t maximumLatenessMicroseconds = 0;
  uint16_t missedSampleDeadlines = 0;
  uint16_t clippedSamples = 0;
  float achievedSamplingFrequencyHz = 0.0f;
  float centeredRootMeanSquare = 0.0f;
  float noiseFloorRootMeanSquare = 0.0f;
  float silenceThresholdRootMeanSquare = 0.0f;
  size_t dominantFrequencyBinIndex = 0;
  float dominantFrequencyHz = 0.0f;
  float dominantMagnitude = 0.0f;
  float bassStrength = 0.0f;
  float midrangeStrength = 0.0f;
  float trebleStrength = 0.0f;
  uint8_t redBrightness = 0;
  uint8_t greenBrightness = 0;
  uint8_t blueBrightness = 0;
  bool signalAboveSilenceThreshold = false;
};

void setupAudioReactive();
void updateAudioReactive();
void stopAudioReactive();
const LiveAudioDiagnostics &liveAudioDiagnostics();
