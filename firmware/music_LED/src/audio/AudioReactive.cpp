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
constexpr unsigned long kMinimumBeatIntervalMs = 180;
constexpr float kPi = 3.14159265358979323846f;
constexpr float kSilenceRms = 18.0f;
constexpr float kMaximumBrightness = 220.0f;

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
    {220, 0, 255},   // purple
    {0, 220, 255},   // cyan
    {55, 85, 255},   // electric blue
    {255, 0, 155},   // hot pink
};

float realSamples[kSampleCount];
float imaginarySamples[kSampleCount];
float window[kSampleCount];
unsigned long lastFrameMs = 0;
unsigned long lastBeatMs = 0;
BandTracker bassTracker;
BandTracker midTracker;
BandTracker trebleTracker;
float redOutput = 0.0f;
float greenOutput = 0.0f;
float blueOutput = 0.0f;
float bassAverage = 0.0f;
float beatFlash = 0.0f;
bool bassBaselineReady = false;
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
    *output = target;
  } else {
    *output = *output * 0.74f + target * 0.26f;
  }
}

void updateVisualState(float bass, float mid, float treble) {
  visualState.bass = clampByte(bass * 255.0f);
  visualState.mid = clampByte(mid * 255.0f);
  visualState.treble = clampByte(treble * 255.0f);
  visualState.beatStrength = clampByte(beatFlash * 255.0f);
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

void detectBeat(float bass, unsigned long now) {
  if (!bassBaselineReady) {
    bassAverage = bass;
    bassBaselineReady = true;
    return;
  }

  const float transient = bass - bassAverage;
  bassAverage = bassAverage * 0.88f + bass * 0.12f;
  if (bass > 0.58f && transient > 0.18f && now - lastBeatMs >= kMinimumBeatIntervalMs) {
    lastBeatMs = now;
    ++visualState.beatCount;
    beatFlash = constrain(0.62f + transient * 1.6f, 0.0f, 1.0f);
  } else {
    beatFlash *= 0.80f;
  }
}

void renderClubPalette(float bass, float mid, float treble) {
  // Bass is purple, mids are cyan, and treble is blue-white. Independent
  // band normalization keeps one part of the spectrum from owning the colour.
  float targetRed = bass * 65.0f + treble * 35.0f;
  float targetGreen = mid * 165.0f + treble * 75.0f;
  float targetBlue = bass * 155.0f + mid * 125.0f + treble * 210.0f;

  if (beatFlash > 0.02f) {
    const RgbColor& beatColor =
        kBeatPalette[visualState.beatCount % (sizeof(kBeatPalette) / sizeof(kBeatPalette[0]))];
    targetRed = max(targetRed, beatColor.red * beatFlash);
    targetGreen = max(targetGreen, beatColor.green * beatFlash);
    targetBlue = max(targetBlue, beatColor.blue * beatFlash);
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
  bassBaselineReady = false;
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
    fadeOutputs(0.55f);
    return;
  }

  fft();
  // At 6.4 kHz with 128 samples, each FFT bin represents 50 Hz.
  const float bass = normalizeBand(bandEnergy(1, 5), &bassTracker);       // 50-250 Hz
  const float mid = normalizeBand(bandEnergy(6, 20), &midTracker);        // 300-1000 Hz
  const float treble = normalizeBand(bandEnergy(21, 50), &trebleTracker); // 1050-2500 Hz
  detectBeat(bass, now);
  updateVisualState(bass, mid, treble);
  renderClubPalette(bass, mid, treble);
}

const AudioVisualState& audioVisualState() { return visualState; }
