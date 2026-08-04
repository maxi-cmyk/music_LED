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
constexpr float kPi = 3.14159265358979323846f;
constexpr float kSilenceRms = 18.0f;

float realSamples[kSampleCount];
float imaginarySamples[kSampleCount];
float window[kSampleCount];
unsigned long lastFrameMs = 0;
float levelPeak = 80.0f;
float redOutput = 0.0f;
float greenOutput = 0.0f;
float blueOutput = 0.0f;
bool ledActive = false;

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
        const float oddReal = realSamples[odd] * twiddleReal - imaginarySamples[odd] * twiddleImaginary;
        const float oddImaginary = realSamples[odd] * twiddleImaginary + imaginarySamples[odd] * twiddleReal;
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

void fadeOutputs(float factor) {
  redOutput *= factor;
  greenOutput *= factor;
  blueOutput *= factor;
  if (redOutput < 1.0f) redOutput = 0.0f;
  if (greenOutput < 1.0f) greenOutput = 0.0f;
  if (blueOutput < 1.0f) blueOutput = 0.0f;
  setStatusLed(clampByte(redOutput), clampByte(greenOutput), clampByte(blueOutput));
}

void applyChannel(float target, float* output) {
  if (target >= *output) {
    *output = target;
  } else {
    *output = *output * 0.72f + target * 0.28f;
  }
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
  redOutput = 0.0f;
  greenOutput = 0.0f;
  blueOutput = 0.0f;
  ledActive = false;
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
  const float bass = bandEnergy(1, 5);       // 50-250 Hz
  const float mid = bandEnergy(6, 20);       // 300-1000 Hz
  const float treble = bandEnergy(21, 50);   // 1050-2500 Hz
  const float strongestBand = max(bass, max(mid, treble));
  if (strongestBand <= 0.0f) {
    fadeOutputs(0.55f);
    return;
  }

  levelPeak = max(rms, levelPeak * 0.985f);
  const float normalizedLevel =
      constrain((rms - kSilenceRms) / max(levelPeak - kSilenceRms, 1.0f), 0.0f, 1.0f);
  const float brightness = normalizedLevel * 255.0f;
  applyChannel(brightness * bass / strongestBand, &redOutput);
  applyChannel(brightness * mid / strongestBand, &greenOutput);
  applyChannel(brightness * treble / strongestBand, &blueOutput);
  setStatusLed(clampByte(redOutput), clampByte(greenOutput), clampByte(blueOutput));
}
