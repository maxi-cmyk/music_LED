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
constexpr unsigned long kMinimumTempoIntervalMs = 180;
constexpr unsigned long kMaximumTempoIntervalMs = 1200;
constexpr unsigned long kTempoHoldMs = 2500;
constexpr float kPi = 3.14159265358979323846f;
constexpr float kSilenceRms = 18.0f;
constexpr float kMaximumBrightness = 240.0f;

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
AudioVisualState visualState = {0, 0, 0, 0, 0, false};

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
  target = min(target, kMaximumBrightness);
  if (target >= *output) {
    *output = *output * 0.15f + target * 0.85f;
  } else {
    *output = *output * 0.35f + target * 0.65f;
  }
}

void updateVisualState(float bassShare, float midShare, float trebleShare, float level) {
  visualState.bass = clampByte(bassShare * 255.0f);
  visualState.mid = clampByte(midShare * 255.0f);
  visualState.treble = clampByte(trebleShare * 255.0f);
  const float motionStrength = max(beatFlash, 0.35f + level * 0.55f);
  visualState.beatStrength = clampByte(motionStrength * 255.0f);
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
  setStatusLed(clampByte(redOutput), clampByte(greenOutput), clampByte(blueOutput));
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
  if (bass > 0.45f && transient > 0.08f && now - lastBeatMs >= kMinimumBeatIntervalMs) {
    const unsigned long interval = now - lastBeatMs;
    if (lastBeatMs != 0 && interval >= kMinimumTempoIntervalMs &&
        interval <= kMaximumTempoIntervalMs) {
      estimatedBeatIntervalMs = tempoLocked
                                    ? (estimatedBeatIntervalMs * 3UL + interval) / 4UL
                                    : interval;
      tempoLocked = true;
    }
    lastBeatMs = now;
    nextTempoPulseMs = now + estimatedBeatIntervalMs;
    triggerBeatPulse(0.78f + transient * 1.8f);
  } else if (tempoLocked && now - lastBeatMs <= kTempoHoldMs &&
             static_cast<int32_t>(now - nextTempoPulseMs) >= 0) {
    do {
      nextTempoPulseMs += estimatedBeatIntervalMs;
    } while (static_cast<int32_t>(now - nextTempoPulseMs) >= 0);
    triggerBeatPulse(0.92f);
  } else {
    beatFlash *= 0.65f;
  }

  if (tempoLocked && now - lastBeatMs > kTempoHoldMs) {
    tempoLocked = false;
    nextTempoPulseMs = 0;
  }
}

void renderClubPalette(float bassShare, float midShare, float trebleShare, float level) {
  // Use the bands' real spectral share for colour and adaptive overall volume
  // only for brightness. Normalizing every colour independently makes even a
  // weak band read as full strength and caused the LED to settle on cyan.
  const float baseBrightness = 18.0f + level * 35.0f;
  float targetRed =
      baseBrightness * (bassShare + midShare * 0.10f + trebleShare * 0.05f);
  float targetGreen =
      baseBrightness * (bassShare * 0.05f + midShare * 0.32f + trebleShare * 0.90f);
  float targetBlue =
      baseBrightness * (bassShare * 0.75f + midShare + trebleShare * 0.65f);

  if (beatFlash > 0.02f) {
    const RgbColor& beatColor =
        kBeatPalette[visualState.beatCount % (sizeof(kBeatPalette) / sizeof(kBeatPalette[0]))];
    const float flashBrightness = (185.0f + level * 55.0f) * beatFlash;
    const float baseMix = 1.0f - beatFlash;
    targetRed = targetRed * baseMix + beatColor.red / 255.0f * flashBrightness;
    targetGreen = targetGreen * baseMix + beatColor.green / 255.0f * flashBrightness;
    targetBlue = targetBlue * baseMix + beatColor.blue / 255.0f * flashBrightness;
  }

  applyChannel(targetRed, &redOutput);
  applyChannel(targetGreen, &greenOutput);
  applyChannel(targetBlue, &blueOutput);
  setStatusLed(clampByte(redOutput), clampByte(greenOutput), clampByte(blueOutput));
}
}  // namespace

void setupAudioReactive() {
  pinMode(pins::kMicrophoneAnalog, INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(pins::kMicrophoneAnalog, ADC_11db);
  for (size_t index = 0; index < kSampleCount; ++index) {
    window[index] = 0.54f - 0.46f * cosf(2.0f * kPi * index / (kSampleCount - 1));
  }
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
  ledActive = false;
  visualState.bass = 0;
  visualState.mid = 0;
  visualState.treble = 0;
  visualState.beatStrength = 0;
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

  if (rms < kSilenceRms) {
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
      constrain((rms - kSilenceRms) / max(overallPeak - kSilenceRms, 1.0f), 0.0f, 1.0f);
  detectBeatAndTempo(bass, now);
  updateVisualState(bassShare, midShare, trebleShare, level);
  renderClubPalette(bassShare, midShare, trebleShare, level);
}

const AudioVisualState& audioVisualState() { return visualState; }
