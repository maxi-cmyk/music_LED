#include "AudioReactive.h"

#include <Arduino.h>

#include "../config/AudioConfig.h"
#include "../config/FourierConfig.h"
#include "../demo/FourierDiagnostics.h"
#include "../fourier/FastFourierTransform.h"
#include "../fourier/SpectrumAnalysis.h"
#include "../lighting/FrequencyToColor.h"
#include "../lighting/RgbLedOutput.h"
#include "AudioSampler.h"
#include "SamplePreprocessing.h"

namespace {

fourier::AudioSamples rawAudioSamples{};
fourier::AudioSamples preparedAudioSamples{};
fourier::FrequencySpectrum frequencyDomainCoefficients{};
fourier::SpectrumMagnitudes frequencyMagnitudes{};
LiveAudioDiagnostics diagnostics{};
float fixedNoiseFloorRootMeanSquare = audio_config::kMinimumNoiseFloorRms;
uint32_t lastFrameStartMilliseconds = 0;
uint32_t lastSerialReportMilliseconds = 0;
bool liveFrameComparisonPrinted = false;

float clampFloat(float value, float minimum, float maximum) {
  if (value < minimum)
    return minimum;
  if (value > maximum)
    return maximum;
  return value;
}

void clearFrequencyAndColorDiagnostics() {
  diagnostics.dominantFrequencyBinIndex = 0;
  diagnostics.dominantFrequencyHz = 0.0f;
  diagnostics.dominantMagnitude = 0.0f;
  diagnostics.bassStrength = 0.0f;
  diagnostics.midrangeStrength = 0.0f;
  diagnostics.trebleStrength = 0.0f;
  diagnostics.redBrightness = 0;
  diagnostics.greenBrightness = 0;
  diagnostics.blueBrightness = 0;
}

void copySamplingDiagnostics(
    const AudioSamplingDiagnostics &samplingDiagnostics) {
  diagnostics.sampleSpanMicroseconds =
      samplingDiagnostics.sampleSpanMicroseconds;
  diagnostics.expectedSampleSpanMicroseconds =
      samplingDiagnostics.expectedSampleSpanMicroseconds;
  diagnostics.maximumLatenessMicroseconds =
      samplingDiagnostics.maximumLatenessMicroseconds;
  diagnostics.missedSampleDeadlines = samplingDiagnostics.missedDeadlines;
  diagnostics.clippedSamples = samplingDiagnostics.clippedSamples;
  diagnostics.achievedSamplingFrequencyHz =
      samplingDiagnostics.achievedSamplingFrequencyHz;
}

void printSerialDiagnosticsIfDue(uint32_t nowMilliseconds) {
  if (nowMilliseconds - lastSerialReportMilliseconds <
      audio_config::kSerialReportIntervalMilliseconds) {
    return;
  }
  lastSerialReportMilliseconds = nowMilliseconds;

  Serial.print("LIVE_FRAME,sample_span_us=");
  Serial.print(diagnostics.sampleSpanMicroseconds);
  Serial.print(",expected_span_us=");
  Serial.print(diagnostics.expectedSampleSpanMicroseconds);
  Serial.print(",sample_rate_hz=");
  Serial.print(diagnostics.achievedSamplingFrequencyHz, 2);
  Serial.print(",max_late_us=");
  Serial.print(diagnostics.maximumLatenessMicroseconds);
  Serial.print(",missed_deadlines=");
  Serial.print(diagnostics.missedSampleDeadlines);
  Serial.print(",clipped_samples=");
  Serial.print(diagnostics.clippedSamples);
  Serial.print(",rms=");
  Serial.print(diagnostics.centeredRootMeanSquare, 2);
  Serial.print(",noise_floor=");
  Serial.print(diagnostics.noiseFloorRootMeanSquare, 2);
  Serial.print(",dominant_bin=");
  Serial.print(diagnostics.dominantFrequencyBinIndex);
  Serial.print(",dominant_hz=");
  Serial.print(diagnostics.dominantFrequencyHz, 1);
  Serial.print(",bass=");
  Serial.print(diagnostics.bassStrength, 1);
  Serial.print(",mid=");
  Serial.print(diagnostics.midrangeStrength, 1);
  Serial.print(",treble=");
  Serial.print(diagnostics.trebleStrength, 1);
  Serial.print(",rgb=");
  Serial.print(diagnostics.redBrightness);
  Serial.print('|');
  Serial.print(diagnostics.greenBrightness);
  Serial.print('|');
  Serial.println(diagnostics.blueBrightness);
}

} // namespace

void setupAudioReactive() {
  setupAudioSampler();
  const float measuredNoiseRootMeanSquare = measureMicrophoneNoiseRms();
  fixedNoiseFloorRootMeanSquare = clampFloat(
      measuredNoiseRootMeanSquare *
          audio_config::kNoiseFloorCalibrationMultiplier,
      audio_config::kMinimumNoiseFloorRms, audio_config::kMaximumNoiseFloorRms);
  diagnostics.noiseFloorRootMeanSquare = fixedNoiseFloorRootMeanSquare;
  diagnostics.silenceThresholdRootMeanSquare =
      fixedNoiseFloorRootMeanSquare * audio_config::kSilenceThresholdMultiplier;
  Serial.print("MICROPHONE_BASELINE,measured_rms=");
  Serial.print(measuredNoiseRootMeanSquare, 2);
  Serial.print(",fixed_noise_floor=");
  Serial.print(fixedNoiseFloorRootMeanSquare, 2);
  Serial.print(",silence_threshold=");
  Serial.println(diagnostics.silenceThresholdRootMeanSquare, 2);
}

void stopAudioReactive() {
  diagnostics.signalAboveSilenceThreshold = false;
  clearFrequencyAndColorDiagnostics();
  turnOffRgbLed();
}

void updateAudioReactive() {
  const uint32_t nowMilliseconds = millis();
  if (nowMilliseconds - lastFrameStartMilliseconds <
      audio_config::kMinimumFrameIntervalMilliseconds) {
    return;
  }
  lastFrameStartMilliseconds = nowMilliseconds;

  AudioSamplingDiagnostics samplingDiagnostics{};
  SamplePreprocessingResults preprocessingResults{};
  if (!collectAudioSamples(&rawAudioSamples, &samplingDiagnostics) ||
      !prepareAudioSamples(rawAudioSamples, WindowFunction::Hamming,
                           &preparedAudioSamples, &preprocessingResults)) {
    stopAudioReactive();
    return;
  }
  copySamplingDiagnostics(samplingDiagnostics);
  diagnostics.centeredRootMeanSquare =
      preprocessingResults.centeredRootMeanSquare;
  diagnostics.noiseFloorRootMeanSquare = fixedNoiseFloorRootMeanSquare;
  diagnostics.silenceThresholdRootMeanSquare =
      fixedNoiseFloorRootMeanSquare * audio_config::kSilenceThresholdMultiplier;
  diagnostics.signalAboveSilenceThreshold =
      preprocessingResults.centeredRootMeanSquare >=
      diagnostics.silenceThresholdRootMeanSquare;

  if (!diagnostics.signalAboveSilenceThreshold) {
    clearFrequencyAndColorDiagnostics();
    turnOffRgbLed();
    printSerialDiagnosticsIfDue(millis());
    return;
  }

  if (!liveFrameComparisonPrinted) {
    printLiveFrameTransformComparison(preparedAudioSamples);
    liveFrameComparisonPrinted = true;
  }

  if (!fourier::computeFastFourierTransform(preparedAudioSamples,
                                            &frequencyDomainCoefficients) ||
      !fourier::calculateSpectrumMagnitudes(frequencyDomainCoefficients,
                                            &frequencyMagnitudes)) {
    stopAudioReactive();
    return;
  }

  fourier::DominantFrequency dominantFrequency{};
  fourier::findDominantNonnegativeFrequency(
      frequencyMagnitudes,
      static_cast<float>(fourier_config::kSamplingFrequencyHz),
      &dominantFrequency);
  diagnostics.dominantFrequencyBinIndex = dominantFrequency.frequencyBinIndex;
  diagnostics.dominantFrequencyHz = dominantFrequency.frequencyHz;
  diagnostics.dominantMagnitude = dominantFrequency.magnitude;

  const FrequencyBandStrengths bandStrengths =
      calculateFrequencyBandStrengths(frequencyMagnitudes);
  diagnostics.bassStrength = bandStrengths.bass;
  diagnostics.midrangeStrength = bandStrengths.midrange;
  diagnostics.trebleStrength = bandStrengths.treble;

  const RgbBrightness brightness = mapFrequencyBandsToRgb(bandStrengths);
  diagnostics.redBrightness = brightness.red;
  diagnostics.greenBrightness = brightness.green;
  diagnostics.blueBrightness = brightness.blue;
  writeRgbBrightness(brightness);
  printSerialDiagnosticsIfDue(millis());
}

const LiveAudioDiagnostics &liveAudioDiagnostics() { return diagnostics; }
