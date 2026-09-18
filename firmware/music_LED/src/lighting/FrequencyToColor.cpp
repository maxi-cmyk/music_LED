#include "FrequencyToColor.h"

#include <math.h>

#include "../config/LightingConfig.h"

namespace {

uint8_t scaledChannel(float bandStrength, float channelGain) {
  float brightness =
      bandStrength * lighting_config::kBrightnessPerMagnitudeUnit * channelGain;
  if (brightness < 0.0f)
    brightness = 0.0f;
  if (brightness > lighting_config::kMaximumChannelBrightness) {
    brightness = lighting_config::kMaximumChannelBrightness;
  }
  return static_cast<uint8_t>(lroundf(brightness));
}

} // namespace

FrequencyBandStrengths
calculateFrequencyBandStrengths(const fourier::SpectrumMagnitudes &magnitudes) {
  return {
      fourier::calculateBandStrength(magnitudes, lighting_config::kBassFirstBin,
                                     lighting_config::kBassLastBin),
      fourier::calculateBandStrength(magnitudes,
                                     lighting_config::kMidrangeFirstBin,
                                     lighting_config::kMidrangeLastBin),
      fourier::calculateBandStrength(magnitudes,
                                     lighting_config::kTrebleFirstBin,
                                     lighting_config::kTrebleLastBin),
  };
}

RgbBrightness
mapFrequencyBandsToRgb(const FrequencyBandStrengths &bandStrengths) {
  return {
      scaledChannel(bandStrengths.bass, lighting_config::kRedChannelGain),
      scaledChannel(bandStrengths.midrange, lighting_config::kGreenChannelGain),
      scaledChannel(bandStrengths.treble, lighting_config::kBlueChannelGain),
  };
}
