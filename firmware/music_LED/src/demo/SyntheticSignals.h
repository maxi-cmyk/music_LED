#pragma once

#include <stddef.h>

#include "../fourier/FourierTypes.h"

namespace synthetic_signals {

bool generateZeroSignal(size_t numberOfSamples, fourier::AudioSamples *output);
bool generateConstantSignal(size_t numberOfSamples, float amplitude,
                            fourier::AudioSamples *output);
bool generateImpulseSignal(size_t numberOfSamples, size_t impulseSampleIndex,
                           float amplitude, fourier::AudioSamples *output);
bool generateFourPointWorkedExample(fourier::AudioSamples *output);
bool generateCosineAtBin(size_t numberOfSamples, size_t frequencyBinIndex,
                         float amplitude, float phaseRadians,
                         fourier::AudioSamples *output);
bool generateTwoCosinesAtBins(size_t numberOfSamples,
                              size_t firstFrequencyBinIndex,
                              float firstAmplitude, float firstPhaseRadians,
                              size_t secondFrequencyBinIndex,
                              float secondAmplitude, float secondPhaseRadians,
                              fourier::AudioSamples *output);

} // namespace synthetic_signals
