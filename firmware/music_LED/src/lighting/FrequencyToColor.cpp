#include "FrequencyToColor.h"

#include <math.h>

#include "../config/LightingConfig.h"

namespace {

float weightedChannel(float bandStrength, float channelGain) {
  return bandStrength > 0.0f ? bandStrength * channelGain : 0.0f;
}

float suppressCrossBandLeakage(float weightedStrength,
                               float strongestWeightedStrength) {
  if (strongestWeightedStrength <= 0.0f)
    return 0.0f;
  const float leakageFloor = lighting_config::kCrossBandLeakageRatio *
                             strongestWeightedStrength;
  const float cleanedStrength =
      (weightedStrength - leakageFloor) /
      (1.0f - lighting_config::kCrossBandLeakageRatio);
  return cleanedStrength > 0.0f ? cleanedStrength : 0.0f;
}

uint8_t scaledChannel(float cleanedStrength) {
  float brightness =
      cleanedStrength * lighting_config::kBrightnessPerMagnitudeUnit;
  if (brightness < 0.0f)
    brightness = 0.0f;
  if (brightness > lighting_config::kMaximumChannelBrightness) {
    brightness = lighting_config::kMaximumChannelBrightness;
  }
  return static_cast<uint8_t>(ceilf(brightness));
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
  const float weightedRed =
      weightedChannel(bandStrengths.bass, lighting_config::kRedChannelGain);
  const float weightedGreen = weightedChannel(
      bandStrengths.midrange, lighting_config::kGreenChannelGain);
  const float weightedBlue = weightedChannel(
      bandStrengths.treble, lighting_config::kBlueChannelGain);
  const float strongestWeightedStrength =
      fmaxf(weightedRed, fmaxf(weightedGreen, weightedBlue));
  return {
      scaledChannel(
          suppressCrossBandLeakage(weightedRed, strongestWeightedStrength)),
      scaledChannel(
          suppressCrossBandLeakage(weightedGreen, strongestWeightedStrength)),
      scaledChannel(
          suppressCrossBandLeakage(weightedBlue, strongestWeightedStrength)),
  };
}
