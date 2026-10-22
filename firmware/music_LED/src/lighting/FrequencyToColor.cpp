#include "FrequencyToColor.h"

#include <math.h>

#include "../config/LightingConfig.h"

namespace {

float weighted_channel(float band_strength, float channel_gain) {
    return band_strength > 0.0f ? band_strength * channel_gain : 0.0f;
}

float suppress_cross_band_leakage(float weighted_strength,
                                  float strongest_weighted_strength) {
    if (strongest_weighted_strength <= 0.0f) {
        return 0.0f;
    }
    const float leakage_floor = lighting_config::CROSS_BAND_LEAKAGE_RATIO
                                * strongest_weighted_strength;
    const float cleaned_strength
            = (weighted_strength - leakage_floor)
              / (1.0f - lighting_config::CROSS_BAND_LEAKAGE_RATIO);
    return cleaned_strength > 0.0f ? cleaned_strength : 0.0f;
}

uint8_t scaled_channel(float cleaned_strength) {
    float brightness
            = cleaned_strength * lighting_config::BRIGHTNESS_PER_MAGNITUDE_UNIT;
    if (brightness < 0.0f) {
        brightness = 0.0f;
    }
    if (brightness > lighting_config::MAXIMUM_CHANNEL_BRIGHTNESS) {
        brightness = lighting_config::MAXIMUM_CHANNEL_BRIGHTNESS;
    }
    return static_cast<uint8_t>(ceilf(brightness));
}

} // namespace

FrequencyBandStrengths calculate_frequency_band_strengths(
        const fourier::SpectrumMagnitudes &magnitudes) {
    return {
            fourier::calculate_band_strength(magnitudes,
                                             lighting_config::BASS_FIRST_BIN,
                                             lighting_config::BASS_LAST_BIN),
            fourier::calculate_band_strength(
                    magnitudes, lighting_config::MIDRANGE_FIRST_BIN,
                    lighting_config::MIDRANGE_LAST_BIN),
            fourier::calculate_band_strength(magnitudes,
                                             lighting_config::TREBLE_FIRST_BIN,
                                             lighting_config::TREBLE_LAST_BIN),
    };
}

RgbBrightness
map_frequency_bands_to_rgb(const FrequencyBandStrengths &band_strengths) {
    const float weighted_red = weighted_channel(
            band_strengths.bass, lighting_config::RED_CHANNEL_GAIN);
    const float weighted_green = weighted_channel(
            band_strengths.midrange, lighting_config::GREEN_CHANNEL_GAIN);
    const float weighted_blue = weighted_channel(
            band_strengths.treble, lighting_config::BLUE_CHANNEL_GAIN);
    const float strongest_weighted_strength
            = fmaxf(weighted_red, fmaxf(weighted_green, weighted_blue));
    return {
            scaled_channel(suppress_cross_band_leakage(
                    weighted_red, strongest_weighted_strength)),
            scaled_channel(suppress_cross_band_leakage(
                    weighted_green, strongest_weighted_strength)),
            scaled_channel(suppress_cross_band_leakage(
                    weighted_blue, strongest_weighted_strength)),
    };
}
