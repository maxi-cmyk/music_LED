#include "AudioReactive.h"

#include <Arduino.h>
#include <math.h>

#include "../config/PinConfig.h"
#include "../status/StatusLed.h"

namespace {
constexpr size_t kSampleCount = 128;
constexpr uint32_t kSampleRateHz = 6400;
constexpr uint32_t kSampleIntervalUs = 1000000UL / kSampleRateHz;
constexpr unsigned long kFrameIntervalMs = 30;
constexpr unsigned long kMinimumBeatIntervalMs = 140;
constexpr unsigned long kMinimumTempoIntervalMs = 300;
constexpr unsigned long kMaximumTempoIntervalMs = 1000;
constexpr float kPi = 3.14159265358979323846f;
constexpr float kInitialNoiseFloor = 18.0f;

struct BandTracker {
  float peak = 1.0f;
  float output = 0.0f;
};

struct RgbColor {
  uint8_t red;
  uint8_t green;
  uint8_t blue;
};

constexpr RgbColor kBeatPalette[] = {
    {255, 0, 140},   // hot pink
    {20, 70, 255},   // electric blue
    {0, 255, 80},    // laser green
    {190, 0, 255},   // purple
    {0, 220, 255},   // cyan
    {255, 25, 55},   // crimson
};

float realSamples[kSampleCount];
float imaginarySamples[kSampleCount];
float window[kSampleCount];
unsigned long lastFrameMs = 0;
unsigned long lastBeatMs = 0;
unsigned long estimatedBeatIntervalMs = 500;
unsigned long nextTempoPulseMs = 0;
BandTracker bassTracker;
BandTracker midTracker;
BandTracker trebleTracker;
float redOutput = 0.0f;
float greenOutput = 0.0f;
float blueOutput = 0.0f;
float bassAverage = 0.0f;
float beatFlash = 0.0f;
float overallPeak = 80.0f;
bool bassBaselineReady = false;
bool tempoLocked = false;
bool ledActive = false;
float noiseFloorRms = kInitialNoiseFloor;
float tempoConfidence = 0.0f;
RgbColor trackPalette[3];
uint8_t trackPaletteCount = 0;
AudioReactiveConfig reactiveConfig = {
    true, 1.0f, 0.25f, 2500, 0.65f, 18, 240, 1.0f, 1.0f, 1.0f, 1.6f, 1.0f, 1.0f,
    AudioPaletteMode::Album};
AudioVisualState visualState{};

uint8_t clampByte(float value) {
  return static_cast<uint8_t>(constrain(static_cast<int>(value), 0, 255));
}

void fft() {
  for (size_t index = 1, reversed = 0; index < kSampleCount; ++index) {
    size_t bit = kSampleCount >> 1;
    for (; reversed & bit; bit >>= 1) reversed ^= bit;
    reversed ^= bit;
    if (index < reversed) {
      const float realValue = realSamples[index];
      const float imaginaryValue = imaginarySamples[index];
      realSamples[index] = realSamples[reversed];
      imaginarySamples[index] = imaginarySamples[reversed];
      realSamples[reversed] = realValue;
      imaginarySamples[reversed] = imaginaryValue;
    }
  }

  for (size_t length = 2; length <= kSampleCount; length <<= 1) {
    const float angle = -2.0f * kPi / static_cast<float>(length);
    const float stepReal = cosf(angle);
    const float stepImaginary = sinf(angle);
    for (size_t start = 0; start < kSampleCount; start += length) {
      float twiddleReal = 1.0f;
      float twiddleImaginary = 0.0f;
      for (size_t offset = 0; offset < length / 2; ++offset) {
        const size_t even = start + offset;
        const size_t odd = even + length / 2;
        const float oddReal = realSamples[odd] * twiddleReal -
                              imaginarySamples[odd] * twiddleImaginary;
        const float oddImaginary = realSamples[odd] * twiddleImaginary +
                                   imaginarySamples[odd] * twiddleReal;
        const float evenReal = realSamples[even];
        const float evenImaginary = imaginarySamples[even];
        realSamples[even] = evenReal + oddReal;
        imaginarySamples[even] = evenImaginary + oddImaginary;
        realSamples[odd] = evenReal - oddReal;
        imaginarySamples[odd] = evenImaginary - oddImaginary;

        const float nextReal = twiddleReal * stepReal - twiddleImaginary * stepImaginary;
        twiddleImaginary = twiddleReal * stepImaginary + twiddleImaginary * stepReal;
        twiddleReal = nextReal;
      }
    }
  }
}

float bandEnergy(size_t firstBin, size_t lastBin) {
  float energy = 0.0f;
  for (size_t bin = firstBin; bin <= lastBin; ++bin) {
    energy += realSamples[bin] * realSamples[bin] + imaginarySamples[bin] * imaginarySamples[bin];
  }
  return sqrtf(energy / static_cast<float>(lastBin - firstBin + 1));
}

float normalizeBand(float energy, BandTracker* tracker) {
  tracker->peak = max(energy, tracker->peak * 0.985f);
  const float normalized = constrain(energy / max(tracker->peak, 1.0f), 0.0f, 1.0f);
  if (normalized >= tracker->output) {
    tracker->output = normalized;
  } else {
    tracker->output = tracker->output * 0.70f + normalized * 0.30f;
  }
  return tracker->output;
}

void applyChannel(float target, float* output) {
  target = min(target, static_cast<float>(reactiveConfig.maxBrightness));
  if (target >= *output) {
    *output = *output * 0.15f + target * 0.85f;
  } else {
    *output = *output * 0.35f + target * 0.65f;
  }
}

uint8_t correctedChannel(float value, float gain) {
  const float scaled = constrain(value * gain, 0.0f, 255.0f) / 255.0f;
  return clampByte(powf(scaled, reactiveConfig.gamma) * 255.0f);
}

void showRgb(float red, float green, float blue) {
  if (!reactiveConfig.rgbEnabled) {
    setStatusLed(0, 0, 0);
    return;
  }
  setStatusLed(correctedChannel(red, reactiveConfig.redGain),
               correctedChannel(green, reactiveConfig.greenGain),
               correctedChannel(blue, reactiveConfig.blueGain));
}

void updateVisualState(float bassShare, float midShare, float trebleShare, float level) {
  visualState.bass = clampByte(bassShare * 255.0f);
  visualState.mid = clampByte(midShare * 255.0f);
  visualState.treble = clampByte(trebleShare * 255.0f);
  const float motionStrength = max(beatFlash, 0.35f + level * 0.55f);
  visualState.beatStrength = clampByte(motionStrength * 255.0f);
  visualState.bpm = tempoLocked ? 60000UL / max(estimatedBeatIntervalMs, 1UL) : 0;
  visualState.beatConfidence = clampByte(tempoConfidence * 255.0f);
  visualState.dancerFrameMs =
      static_cast<uint16_t>(constrain(90.0f / reactiveConfig.dancerSpeed, 45.0f, 180.0f));
  visualState.dancerIntensity =
      clampByte(constrain(reactiveConfig.dancerIntensity / 2.0f, 0.0f, 1.0f) * 255.0f);
  visualState.active = true;
}

void fadeOutputs(float factor) {
  redOutput *= factor;
  greenOutput *= factor;
  blueOutput *= factor;
  beatFlash *= 0.72f;
  if (redOutput < 1.0f) redOutput = 0.0f;
  if (greenOutput < 1.0f) greenOutput = 0.0f;
  if (blueOutput < 1.0f) blueOutput = 0.0f;
  visualState.bass = 0;
  visualState.mid = 0;
  visualState.treble = 0;
  visualState.beatStrength = clampByte(beatFlash * 255.0f);
  showRgb(redOutput, greenOutput, blueOutput);
}

void triggerBeatPulse(float strength) {
  ++visualState.beatCount;
  beatFlash = max(beatFlash, constrain(strength, 0.0f, 1.0f));
}

void detectBeatAndTempo(float bass, unsigned long now) {
  if (!bassBaselineReady) {
    bassAverage = bass;
    bassBaselineReady = true;
    beatFlash *= 0.65f;
    return;
  }

  const float transient = bass - bassAverage;
  bassAverage = bassAverage * 0.88f + bass * 0.12f;
  const float bassThreshold = 0.45f / sqrtf(reactiveConfig.beatSensitivity);
  const float transientThreshold = 0.08f / reactiveConfig.beatSensitivity;
  if (bass > bassThreshold && transient > transientThreshold &&
      now - lastBeatMs >= kMinimumBeatIntervalMs) {
    const unsigned long interval = now - lastBeatMs;
    unsigned long tempoInterval = interval;
    while (tempoInterval < kMinimumTempoIntervalMs) tempoInterval *= 2UL;
    while (tempoInterval > kMaximumTempoIntervalMs) tempoInterval /= 2UL;
    if (lastBeatMs != 0 && tempoInterval >= kMinimumTempoIntervalMs &&
        tempoInterval <= kMaximumTempoIntervalMs) {
      estimatedBeatIntervalMs = tempoLocked
                                    ? static_cast<unsigned long>(
                                          estimatedBeatIntervalMs *
                                              (1.0f - reactiveConfig.tempoCorrection) +
                                          tempoInterval * reactiveConfig.tempoCorrection)
                                    : tempoInterval;
      tempoLocked = true;
      tempoConfidence = min(1.0f, tempoConfidence + 0.18f);
    }
    lastBeatMs = now;
    nextTempoPulseMs = now + estimatedBeatIntervalMs;
    triggerBeatPulse(0.78f + transient * 1.8f);
  } else if (tempoLocked && now - lastBeatMs <= reactiveConfig.tempoHoldMs &&
             static_cast<int32_t>(now - nextTempoPulseMs) >= 0) {
    do {
      nextTempoPulseMs += estimatedBeatIntervalMs;
    } while (static_cast<int32_t>(now - nextTempoPulseMs) >= 0);
    triggerBeatPulse(0.92f);
  } else {
    beatFlash *= reactiveConfig.flashDecay;
    tempoConfidence *= 0.999f;
  }

  if (tempoLocked && now - lastBeatMs > reactiveConfig.tempoHoldMs) {
    tempoLocked = false;
    nextTempoPulseMs = 0;
    tempoConfidence = 0.0f;
  }
}

RgbColor saturatedColor(RgbColor color) {
  const uint8_t minimum = min(color.red, min(color.green, color.blue));
  const uint8_t maximum = max(color.red, max(color.green, color.blue));
  if (maximum <= minimum) return color;
  const float scale = 255.0f / (maximum - minimum);
  return {clampByte((color.red - minimum) * scale),
          clampByte((color.green - minimum) * scale),
          clampByte((color.blue - minimum) * scale)};
}

RgbColor selectedBeatColor(float bassShare, float midShare, float trebleShare) {
  if (reactiveConfig.paletteMode == AudioPaletteMode::Album && trackPaletteCount > 0) {
    return saturatedColor(trackPalette[visualState.beatCount % trackPaletteCount]);
  }
  if (reactiveConfig.paletteMode == AudioPaletteMode::Spectrum) {
    if (bassShare >= midShare && bassShare >= trebleShare) return {255, 0, 150};
    if (midShare >= trebleShare) return {20, 70, 255};
    return {0, 255, 120};
  }
  return kBeatPalette[visualState.beatCount %
                      (sizeof(kBeatPalette) / sizeof(kBeatPalette[0]))];
}

void renderClubPalette(float bassShare, float midShare, float trebleShare, float level) {
  // Use the bands' real spectral share for colour and adaptive overall volume
  // only for brightness. Normalizing every colour independently makes even a
  // weak band read as full strength and caused the LED to settle on cyan.
  const float baseBrightness = reactiveConfig.idleBrightness + level * 35.0f;
  float targetRed =
      baseBrightness * (bassShare + midShare * 0.10f + trebleShare * 0.05f);
  float targetGreen =
      baseBrightness * (bassShare * 0.05f + midShare * 0.32f + trebleShare * 0.90f);
  float targetBlue =
      baseBrightness * (bassShare * 0.75f + midShare + trebleShare * 0.65f);

  if (beatFlash > 0.02f) {
    const RgbColor beatColor = selectedBeatColor(bassShare, midShare, trebleShare);
    const float flashBrightness =
        (reactiveConfig.maxBrightness * 0.78f + level * reactiveConfig.maxBrightness * 0.22f) *
        beatFlash;
    const float baseMix = 1.0f - beatFlash;
    targetRed = targetRed * baseMix + beatColor.red / 255.0f * flashBrightness;
    targetGreen = targetGreen * baseMix + beatColor.green / 255.0f * flashBrightness;
    targetBlue = targetBlue * baseMix + beatColor.blue / 255.0f * flashBrightness;
  }

  applyChannel(targetRed, &redOutput);
  applyChannel(targetGreen, &greenOutput);
  applyChannel(targetBlue, &blueOutput);
  showRgb(redOutput, greenOutput, blueOutput);
}

void calibrateMicrophone() {
  float mean = 0.0f;
  float sumSquares = 0.0f;
  constexpr size_t kCalibrationSamples = 512;
  for (size_t index = 1; index <= kCalibrationSamples; ++index) {
    const float sample = analogRead(pins::kMicrophoneAnalog);
    const float delta = sample - mean;
    mean += delta / index;
    sumSquares += delta * (sample - mean);
    delayMicroseconds(100);
  }
  const float measuredRms = sqrtf(sumSquares / (kCalibrationSamples - 1));
  noiseFloorRms = constrain(measuredRms * 1.35f, 6.0f, 80.0f);
}
}  // namespace

void setupAudioReactive() {
  pinMode(pins::kMicrophoneAnalog, INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(pins::kMicrophoneAnalog, ADC_11db);
  for (size_t index = 0; index < kSampleCount; ++index) {
    window[index] = 0.54f - 0.46f * cosf(2.0f * kPi * index / (kSampleCount - 1));
  }
  calibrateMicrophone();
}

void stopAudioReactive() {
  bassTracker = BandTracker{};
  midTracker = BandTracker{};
  trebleTracker = BandTracker{};
  redOutput = 0.0f;
  greenOutput = 0.0f;
  blueOutput = 0.0f;
  bassAverage = 0.0f;
  beatFlash = 0.0f;
  overallPeak = 80.0f;
  estimatedBeatIntervalMs = 500;
  nextTempoPulseMs = 0;
  lastBeatMs = 0;
  bassBaselineReady = false;
  tempoLocked = false;
  tempoConfidence = 0.0f;
  ledActive = false;
  visualState.bass = 0;
  visualState.mid = 0;
  visualState.treble = 0;
  visualState.beatStrength = 0;
  visualState.bpm = 0;
  visualState.beatConfidence = 0;
  visualState.active = false;
  setStatusLed(0, 0, 0);
}

void updateAudioReactive(bool playbackActive) {
  if (!playbackActive) {
    if (ledActive) stopAudioReactive();
    return;
  }

  const unsigned long now = millis();
  if (now - lastFrameMs < kFrameIntervalMs) return;
  lastFrameMs = now;
  ledActive = true;
  visualState.active = true;

  float average = 0.0f;
  float rms = 0.0f;
  uint32_t nextSampleUs = micros();
  for (size_t index = 0; index < kSampleCount; ++index) {
    while (static_cast<int32_t>(micros() - nextSampleUs) < 0) delayMicroseconds(10);
    const float sample = static_cast<float>(analogRead(pins::kMicrophoneAnalog));
    realSamples[index] = sample;
    imaginarySamples[index] = 0.0f;
    average += sample;
    nextSampleUs += kSampleIntervalUs;
  }

  average /= static_cast<float>(kSampleCount);
  for (size_t index = 0; index < kSampleCount; ++index) {
    const float centered = realSamples[index] - average;
    rms += centered * centered;
    realSamples[index] = centered * window[index];
  }
  rms = sqrtf(rms / static_cast<float>(kSampleCount));
  visualState.microphoneLevel = static_cast<uint16_t>(constrain(rms, 0.0f, 4095.0f));
  visualState.noiseFloor = static_cast<uint16_t>(noiseFloorRms);

  if (rms < noiseFloorRms * 2.0f) {
    noiseFloorRms = noiseFloorRms * 0.998f + rms * 0.002f;
  }

  const float silenceThreshold = max(6.0f, noiseFloorRms * 1.30f);
  if (rms < silenceThreshold) {
    fadeOutputs(0.35f);
    return;
  }

  fft();
  // At 6.4 kHz with 128 samples, each FFT bin represents 50 Hz.
  const float bassEnergy = bandEnergy(1, 5);       // 50-250 Hz
  const float midEnergy = bandEnergy(6, 20);       // 300-1000 Hz
  const float trebleEnergy = bandEnergy(21, 50);   // 1050-2500 Hz
  const float bass = normalizeBand(bassEnergy, &bassTracker);
  normalizeBand(midEnergy, &midTracker);
  normalizeBand(trebleEnergy, &trebleTracker);
  const float totalEnergy = max(bassEnergy + midEnergy + trebleEnergy, 1.0f);
  const float bassShare = bassEnergy / totalEnergy;
  const float midShare = midEnergy / totalEnergy;
  const float trebleShare = trebleEnergy / totalEnergy;
  overallPeak = max(rms, overallPeak * 0.985f);
  const float level =
      constrain((rms - silenceThreshold) / max(overallPeak - silenceThreshold, 1.0f), 0.0f,
                1.0f);
  detectBeatAndTempo(bass, now);
  updateVisualState(bassShare, midShare, trebleShare, level);
  renderClubPalette(bassShare, midShare, trebleShare, level);
}

const AudioVisualState& audioVisualState() { return visualState; }

const AudioReactiveConfig& audioReactiveConfig() { return reactiveConfig; }

void configureAudioReactive(const AudioReactiveConfig& config) {
  reactiveConfig = config;
  if (!reactiveConfig.rgbEnabled) {
    redOutput = 0.0f;
    greenOutput = 0.0f;
    blueOutput = 0.0f;
    setStatusLed(0, 0, 0);
  }
}

void setAudioTrackPalette(const uint8_t* rgbValues, uint8_t colorCount) {
  trackPaletteCount = min(colorCount, static_cast<uint8_t>(3));
  for (uint8_t index = 0; index < trackPaletteCount; ++index) {
    trackPalette[index] =
        {rgbValues[index * 3], rgbValues[index * 3 + 1], rgbValues[index * 3 + 2]};
  }
}
