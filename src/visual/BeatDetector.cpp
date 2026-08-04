#include "BeatDetector.h"

#include "../config/AudioConfig.h"
#include "../config/PinConfig.h"

BeatState BeatDetector::update(const AudioFrame& frame, unsigned long now) {
  const bool isBeat = frame.amplitude > threshold_ && now - lastBeatTime_ > audio_config::kBeatCooldownMs;

  if (isBeat) {
    lastBeatTime_ = now;
    currentLed_ = (currentLed_ + 1) % pins::kActiveLedCount;
    threshold_ = frame.amplitude;
    brightness_ = 255.0F;
  } else {
    threshold_ *= audio_config::kDecayRate;
    if (threshold_ < audio_config::kNoiseFloor + 2) {
      threshold_ = audio_config::kNoiseFloor + 2;
    }
    brightness_ *= audio_config::kBrightnessDecay;
  }

  if (brightness_ < audio_config::kMinimumBrightness) {
    brightness_ = audio_config::kMinimumBrightness;
  }

  return {isBeat, currentLed_, brightness_};
}
