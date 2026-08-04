#include "AudioSampler.h"

#include <Arduino.h>

#include "../config/AudioConfig.h"
#include "../config/PinConfig.h"

AudioFrame sampleAudio() {
  AudioFrame frame = {0, 0};
  const unsigned long startMillis = millis();
  int maxValue = 0;
  int minValue = 1023;
  bool previousSampleWasHigh = false;

  while (millis() - startMillis < audio_config::kSampleWindowMs) {
    const int sample = analogRead(pins::kMicrophone);
    maxValue = max(maxValue, sample);
    minValue = min(minValue, sample);

    const bool isHigh = sample > audio_config::kCenterVoltage + audio_config::kHighFrequencyOffset;
    if (isHigh && !previousSampleWasHigh) {
      frame.frequencyCrossings++;
    }
    previousSampleWasHigh = isHigh;
  }

  frame.amplitude = maxValue - minValue;
  return frame;
}
