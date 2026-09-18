#include "AudioSampler.h"

#include <Arduino.h>
#include <math.h>

#include "../config/AudioConfig.h"
#include "../config/FourierConfig.h"
#include "../config/PinConfig.h"

namespace {

bool sampleIsClipped(uint16_t sample) {
  return sample <=
             audio_config::kAdcMinimumValue + audio_config::kClippingMargin ||
         sample >=
             audio_config::kAdcMaximumValue - audio_config::kClippingMargin;
}

void waitUntilMicrosecondDeadline(uint32_t deadlineMicroseconds) {
  while (static_cast<int32_t>(micros() - deadlineMicroseconds) < 0) {
    delayMicroseconds(1);
  }
}

} // namespace

void setupAudioSampler() {
  pinMode(pins::kMicrophoneAnalog, INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(pins::kMicrophoneAnalog, ADC_11db);
}

bool collectAudioSamples(fourier::AudioSamples *rawSamples,
                         AudioSamplingDiagnostics *diagnostics) {
  if (rawSamples == nullptr || diagnostics == nullptr)
    return false;

  *diagnostics = AudioSamplingDiagnostics{};
  diagnostics->expectedSampleSpanMicroseconds =
      fourier_config::kExpectedSampleSpanMicroseconds;
  rawSamples->numberOfSamples = fourier_config::kNumberOfSamples;

  uint32_t fractionalIntervalAccumulator = 0;
  uint32_t nextSampleDeadlineMicroseconds = micros();
  uint32_t firstSampleTimeMicroseconds = 0;
  uint32_t lastSampleTimeMicroseconds = 0;

  for (size_t sampleIndex = 0; sampleIndex < fourier_config::kNumberOfSamples;
       ++sampleIndex) {
    if (sampleIndex > 0) {
      uint32_t intervalMicroseconds =
          fourier_config::kBaseSampleIntervalMicroseconds;
      fractionalIntervalAccumulator += fourier_config::kSampleIntervalRemainder;
      if (fractionalIntervalAccumulator >=
          fourier_config::kSamplingFrequencyHz) {
        ++intervalMicroseconds;
        fractionalIntervalAccumulator -= fourier_config::kSamplingFrequencyHz;
      }
      nextSampleDeadlineMicroseconds += intervalMicroseconds;
      waitUntilMicrosecondDeadline(nextSampleDeadlineMicroseconds);
    }

    uint32_t sampleTimeMicroseconds = micros();
    const uint32_t latenessMicroseconds =
        sampleTimeMicroseconds - nextSampleDeadlineMicroseconds;
    if (latenessMicroseconds > diagnostics->maximumLatenessMicroseconds) {
      diagnostics->maximumLatenessMicroseconds = latenessMicroseconds;
    }
    if (latenessMicroseconds >=
        fourier_config::kBaseSampleIntervalMicroseconds) {
      ++diagnostics->missedDeadlines;
      nextSampleDeadlineMicroseconds = sampleTimeMicroseconds;
      fractionalIntervalAccumulator = 0;
    }

    const uint16_t rawAdcSample =
        static_cast<uint16_t>(analogRead(pins::kMicrophoneAnalog));
    rawSamples->amplitude[sampleIndex] = static_cast<float>(rawAdcSample);
    if (sampleIsClipped(rawAdcSample))
      ++diagnostics->clippedSamples;

    if (sampleIndex == 0)
      firstSampleTimeMicroseconds = sampleTimeMicroseconds;
    lastSampleTimeMicroseconds = sampleTimeMicroseconds;
  }

  diagnostics->sampleSpanMicroseconds =
      lastSampleTimeMicroseconds - firstSampleTimeMicroseconds;
  if (diagnostics->sampleSpanMicroseconds > 0) {
    diagnostics->achievedSamplingFrequencyHz =
        static_cast<float>(fourier_config::kNumberOfSamples - 1) *
        static_cast<float>(fourier_config::kMicrosecondsPerSecond) /
        static_cast<float>(diagnostics->sampleSpanMicroseconds);
  }
  return true;
}

float measureMicrophoneNoiseRms() {
  // ADC2 can produce a short transient after its pin and attenuation are
  // configured. Let the microphone/ADC settle and discard initial conversions
  // so that transient cannot become the fixed noise floor for the whole run.
  delay(audio_config::kMicrophoneSettleMilliseconds);
  for (size_t discardedSample = 0;
       discardedSample < audio_config::kNoiseCalibrationDiscardSamples;
       ++discardedSample) {
    analogRead(pins::kMicrophoneAnalog);
    delayMicroseconds(audio_config::kNoiseCalibrationIntervalMicroseconds);
  }

  float runningMean = 0.0f;
  float sumSquaredDifferences = 0.0f;
  for (size_t sampleNumber = 1;
       sampleNumber <= audio_config::kNoiseCalibrationSamples; ++sampleNumber) {
    const float sample =
        static_cast<float>(analogRead(pins::kMicrophoneAnalog));
    const float differenceFromPreviousMean = sample - runningMean;
    runningMean +=
        differenceFromPreviousMean / static_cast<float>(sampleNumber);
    sumSquaredDifferences +=
        differenceFromPreviousMean * (sample - runningMean);
    delayMicroseconds(audio_config::kNoiseCalibrationIntervalMicroseconds);
  }
  return sqrtf(sumSquaredDifferences /
               static_cast<float>(audio_config::kNoiseCalibrationSamples - 1));
}
