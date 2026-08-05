#pragma once

#include <stdint.h>

enum class AudioPaletteMode : uint8_t { Club, Album, Spectrum };

struct AudioReactiveConfig {
  bool rgbEnabled;
  float beatSensitivity;
  float tempoCorrection;
  uint16_t tempoHoldMs;
  float flashDecay;
  uint8_t idleBrightness;
  uint8_t maxBrightness;
  float redGain;
  float greenGain;
  float blueGain;
  float gamma;
  float dancerSpeed;
  float dancerIntensity;
  AudioPaletteMode paletteMode;
};

struct AudioVisualState {
  uint8_t bass;
  uint8_t mid;
  uint8_t treble;
  uint8_t beatStrength;
  uint32_t beatCount;
  uint16_t bpm;
  uint8_t beatConfidence;
  uint16_t microphoneLevel;
  uint16_t noiseFloor;
  uint16_t dancerFrameMs;
  uint8_t dancerIntensity;
  bool active;
};

void setupAudioReactive();
void updateAudioReactive(bool playbackActive);
void stopAudioReactive();
const AudioVisualState& audioVisualState();
const AudioReactiveConfig& audioReactiveConfig();
void configureAudioReactive(const AudioReactiveConfig& config);
void setAudioTrackPalette(const uint8_t* rgbValues, uint8_t colorCount);
