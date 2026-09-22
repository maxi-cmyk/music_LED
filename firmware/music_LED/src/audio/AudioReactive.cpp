#include "AudioReactive.h"

#include <Arduino.h>
#include <string.h>

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
uint32_t lastSpectrumSerialReportMilliseconds = 0;
uint32_t spectrumFrameSequence = 0;
uint32_t captureSequence = 0;
bool liveFrameComparisonPrinted = false;
bool sampleCaptureRequested = false;
char serialCommandBuffer[32]{};
size_t serialCommandLength = 0;

void readSerialCommands() {
  while (Serial.available() > 0) {
    const char receivedCharacter = static_cast<char>(Serial.read());
    if (receivedCharacter == '\r')
      continue;
    if (receivedCharacter == '\n') {
      serialCommandBuffer[serialCommandLength] = '\0';
      if (strcmp(serialCommandBuffer, "CAPTURE_FRAME") == 0)
        sampleCaptureRequested = true;
      serialCommandLength = 0;
      continue;
    }
    if (serialCommandLength + 1 < sizeof(serialCommandBuffer)) {
      serialCommandBuffer[serialCommandLength++] = receivedCharacter;
    } else {
      serialCommandLength = 0;
    }
  }
}

constexpr size_t kCaptureValuesPerChunk = 16;

void printCaptureValues(const char *messageType, uint32_t captureId,
                        const float *values, size_t valueCount) {
  for (size_t startIndex = 0; startIndex < valueCount;
       startIndex += kCaptureValuesPerChunk) {
    const size_t remainingValueCount = valueCount - startIndex;
    const size_t chunkCount = remainingValueCount < kCaptureValuesPerChunk
                                  ? remainingValueCount
                                  : kCaptureValuesPerChunk;
    Serial.print(messageType);
    Serial.print(",id=");
    Serial.print(captureId);
    Serial.print(",start=");
    Serial.print(startIndex);
    Serial.print(",count=");
    Serial.print(chunkCount);
    Serial.print(",values=");
    for (size_t offset = 0; offset < chunkCount; ++offset) {
      if (offset > 0)
        Serial.print('|');
      Serial.print(values[startIndex + offset], 3);
    }
    Serial.println();
  }
}

void printSynchronizedCapture(
    uint32_t captureId, const SamplePreprocessingResults &preprocessingResults,
    const fourier::DominantFrequency &dominantFrequency,
    const FrequencyBandStrengths &bandStrengths,
    const RgbBrightness &brightness) {
  constexpr size_t kNonnegativeBinCount =
      fourier_config::kNumberOfSamples / 2 + 1;
  Serial.print("CAPTURE_BEGIN,id=");
  Serial.print(captureId);
  Serial.print(",n=");
  Serial.print(fourier_config::kNumberOfSamples);
  Serial.print(",sample_rate_hz=");
  Serial.print(diagnostics.achievedSamplingFrequencyHz, 2);
  Serial.print(",sample_span_us=");
  Serial.print(diagnostics.sampleSpanMicroseconds);
  Serial.print(",mean=");
  Serial.print(preprocessingResults.frameMean, 3);
  Serial.print(",rms=");
  Serial.print(diagnostics.centeredRootMeanSquare, 3);
  Serial.print(",noise_floor=");
  Serial.print(diagnostics.noiseFloorRootMeanSquare, 3);
  Serial.print(",silence_threshold=");
  Serial.print(diagnostics.silenceThresholdRootMeanSquare, 3);
  Serial.print(",above_silence=");
  Serial.println(diagnostics.signalAboveSilenceThreshold ? 1 : 0);

  printCaptureValues("CAPTURE_RAW", captureId, rawAudioSamples.amplitude,
                     fourier_config::kNumberOfSamples);
  printCaptureValues("CAPTURE_PREPARED", captureId,
                     preparedAudioSamples.amplitude,
                     fourier_config::kNumberOfSamples);
  printCaptureValues("CAPTURE_REAL", captureId,
                     frequencyDomainCoefficients.real,
                     kNonnegativeBinCount);
  printCaptureValues("CAPTURE_IMAGINARY", captureId,
                     frequencyDomainCoefficients.imaginary,
                     kNonnegativeBinCount);
  printCaptureValues("CAPTURE_MAGNITUDES", captureId,
                     frequencyMagnitudes.magnitude, kNonnegativeBinCount);

  Serial.print("CAPTURE_OUTPUT,id=");
  Serial.print(captureId);
  Serial.print(",dominant_bin=");
  Serial.print(dominantFrequency.frequencyBinIndex);
  Serial.print(",dominant_hz=");
  Serial.print(dominantFrequency.frequencyHz, 2);
  Serial.print(",bass=");
  Serial.print(bandStrengths.bass, 3);
  Serial.print(",mid=");
  Serial.print(bandStrengths.midrange, 3);
  Serial.print(",treble=");
  Serial.print(bandStrengths.treble, 3);
  Serial.print(",rgb=");
  Serial.print(brightness.red);
  Serial.print('|');
  Serial.print(brightness.green);
  Serial.print('|');
  Serial.println(brightness.blue);
  Serial.print("CAPTURE_END,id=");
  Serial.println(captureId);
}

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

void printSpectrumDiagnosticsIfDue(
    uint32_t nowMilliseconds,
    const fourier::SpectrumMagnitudes *magnitudes) {
  if (nowMilliseconds - lastSpectrumSerialReportMilliseconds <
      audio_config::kSpectrumSerialReportIntervalMilliseconds) {
    return;
  }
  lastSpectrumSerialReportMilliseconds = nowMilliseconds;

  Serial.print("SPECTRUM_FRAME,sequence=");
  Serial.print(++spectrumFrameSequence);
  Serial.print(",sample_rate_hz=");
  Serial.print(diagnostics.achievedSamplingFrequencyHz, 2);
  Serial.print(",rms=");
  Serial.print(diagnostics.centeredRootMeanSquare, 2);
  Serial.print(",noise_floor=");
  Serial.print(diagnostics.noiseFloorRootMeanSquare, 2);
  Serial.print(",silence_threshold=");
  Serial.print(diagnostics.silenceThresholdRootMeanSquare, 2);
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
  Serial.print(diagnostics.blueBrightness);
  Serial.print(",bins=");

  constexpr size_t kNyquistBin = fourier_config::kNumberOfSamples / 2;
  for (size_t frequencyBinIndex = 0; frequencyBinIndex <= kNyquistBin;
       ++frequencyBinIndex) {
    if (frequencyBinIndex > 0)
      Serial.print('|');
    const float magnitude = magnitudes == nullptr
                                ? 0.0f
                                : magnitudes->magnitude[frequencyBinIndex];
    Serial.print(static_cast<uint32_t>(magnitude + 0.5f));
  }
  Serial.println();
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
  readSerialCommands();
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

  const bool captureThisFrame = sampleCaptureRequested;
  sampleCaptureRequested = false;

  if (!diagnostics.signalAboveSilenceThreshold && !captureThisFrame) {
    clearFrequencyAndColorDiagnostics();
    turnOffRgbLed();
    printSpectrumDiagnosticsIfDue(millis(), nullptr);
    printSerialDiagnosticsIfDue(millis());
    return;
  }

  if (diagnostics.signalAboveSilenceThreshold && !liveFrameComparisonPrinted) {
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
  const FrequencyBandStrengths bandStrengths =
      calculateFrequencyBandStrengths(frequencyMagnitudes);
  RgbBrightness brightness{};
  if (diagnostics.signalAboveSilenceThreshold) {
    diagnostics.dominantFrequencyBinIndex = dominantFrequency.frequencyBinIndex;
    diagnostics.dominantFrequencyHz = dominantFrequency.frequencyHz;
    diagnostics.dominantMagnitude = dominantFrequency.magnitude;
    diagnostics.bassStrength = bandStrengths.bass;
    diagnostics.midrangeStrength = bandStrengths.midrange;
    diagnostics.trebleStrength = bandStrengths.treble;
    brightness = mapFrequencyBandsToRgb(bandStrengths);
    diagnostics.redBrightness = brightness.red;
    diagnostics.greenBrightness = brightness.green;
    diagnostics.blueBrightness = brightness.blue;
    writeRgbBrightness(brightness);
  } else {
    clearFrequencyAndColorDiagnostics();
    turnOffRgbLed();
  }

  if (captureThisFrame) {
    printSynchronizedCapture(++captureSequence, preprocessingResults,
                             dominantFrequency, bandStrengths, brightness);
  }
  printSpectrumDiagnosticsIfDue(
      millis(), diagnostics.signalAboveSilenceThreshold ? &frequencyMagnitudes
                                                        : nullptr);
  printSerialDiagnosticsIfDue(millis());
}

const LiveAudioDiagnostics &liveAudioDiagnostics() { return diagnostics; }
