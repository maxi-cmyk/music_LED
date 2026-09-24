import { SIGNAL_CONFIG } from './config.mjs?release=20260924-distill-23';

export function createCompositeSampleVector(frequencies) {
  const samples = new Float64Array(SIGNAL_CONFIG.sampleCount);
  if (!frequencies.length) return samples;

  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
    const sampleTimeSeconds = sampleIndex / SIGNAL_CONFIG.sampleRateHz;
    for (const frequencyHz of frequencies) {
      samples[sampleIndex] += Math.sin(2 * Math.PI * frequencyHz * sampleTimeSeconds)
        / frequencies.length;
    }
  }
  return samples;
}

export function replaceVectorEntry(samples, sampleIndex, nextValue) {
  const updatedSamples = Float64Array.from(samples);
  updatedSamples[sampleIndex] = nextValue;
  return updatedSamples;
}

export function fourierContribution(samples, frequencyBinIndex, sampleIndex) {
  const phaseRadians = -2 * Math.PI * frequencyBinIndex * sampleIndex / samples.length;
  const sampleValue = samples[sampleIndex];
  const real = sampleValue * Math.cos(phaseRadians);
  const imaginary = sampleValue * Math.sin(phaseRadians);
  return {
    phaseRadians,
    real,
    imaginary,
    magnitude: Math.hypot(real, imaginary),
  };
}

export function allFourierContributions(samples, frequencyBinIndex) {
  return Array.from(
    { length: samples.length },
    (_, sampleIndex) => fourierContribution(samples, frequencyBinIndex, sampleIndex),
  );
}

export function vectorsMatch(first, second, tolerance = 1e-9) {
  if (first.length !== second.length) return false;
  return first.every((value, index) => Math.abs(value - second[index]) <= tolerance);
}
