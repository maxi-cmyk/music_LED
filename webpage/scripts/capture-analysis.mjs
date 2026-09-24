import { SIGNAL_CONFIG } from './config.mjs?release=20260924-distill-23';
import { fastFourierTransform, mapBandStrengthsToRgb } from './signal-analysis.mjs?release=20260924-distill-23';

function hammingWindow(sampleIndex, numberOfSamples) {
  return 0.54 - 0.46 * Math.cos(2 * Math.PI * sampleIndex / (numberOfSamples - 1));
}

export function calculateCapturedBandStrengths(magnitudes) {
  const strengths = {};
  for (const [channel, band] of Object.entries(SIGNAL_CONFIG.bands)) {
    let sumSquaredMagnitudes = 0;
    for (let binIndex = band.firstBin; binIndex <= band.lastBin; binIndex += 1) {
      sumSquaredMagnitudes += magnitudes[binIndex] ** 2;
    }
    strengths[channel] = Math.sqrt(sumSquaredMagnitudes);
  }
  return strengths;
}

export function prepareCapturedSamples(rawSamples) {
  const mean = rawSamples.reduce((sum, sample) => sum + sample, 0) / rawSamples.length;
  const prepared = rawSamples.map((sample, sampleIndex) => (
    (sample - mean) * hammingWindow(sampleIndex, rawSamples.length)
  ));
  return { mean, prepared };
}

function deterministicMicrophoneSamples(frequencies) {
  const activeToneCount = Math.max(1, frequencies.length);
  const componentAmplitude = 34 / Math.sqrt(activeToneCount);
  return Array.from({ length: SIGNAL_CONFIG.sampleCount }, (_, sampleIndex) => {
    const sampleTimeSeconds = sampleIndex / SIGNAL_CONFIG.sampleRateHz;
    const selectedToneValue = frequencies.reduce((sum, frequencyHz, toneIndex) => (
      sum + componentAmplitude * Math.sin(
        2 * Math.PI * frequencyHz * sampleTimeSeconds + toneIndex * 0.17,
      )
    ), 0);
    const repeatableRoomNoise = 1.8 * Math.sin(2 * Math.PI * 137 * sampleTimeSeconds + 0.4)
      + 0.9 * Math.cos(2 * Math.PI * 311 * sampleTimeSeconds);
    return 2048 + selectedToneValue + repeatableRoomNoise;
  });
}

export function createSimulatedCapture(frequencies, sequence = 1) {
  const raw = deterministicMicrophoneSamples(frequencies);
  const { mean, prepared } = prepareCapturedSamples(raw);
  const coefficients = fastFourierTransform(prepared);
  const magnitudes = Array.from(
    { length: SIGNAL_CONFIG.nyquistBin + 1 },
    (_, binIndex) => Math.hypot(coefficients.real[binIndex], coefficients.imaginary[binIndex]),
  );
  const bands = calculateCapturedBandStrengths(magnitudes);
  const rgb = mapBandStrengthsToRgb(bands);
  let dominantBin = 1;
  for (let binIndex = 2; binIndex < magnitudes.length; binIndex += 1) {
    if (magnitudes[binIndex] > magnitudes[dominantBin]) dominantBin = binIndex;
  }

  const frame = {
    source: 'simulation',
    sequence,
    sampleRateHz: SIGNAL_CONFIG.sampleRateHz,
    rms: Math.sqrt(prepared.reduce((sum, value) => sum + value ** 2, 0) / prepared.length),
    noiseFloor: 0,
    silenceThreshold: 0,
    dominantBin,
    dominantHz: dominantBin * SIGNAL_CONFIG.binSpacingHz,
    bands,
    rgb,
    magnitudes,
    receivedAt: performance.now(),
  };

  return {
    id: `SIM-${String(sequence).padStart(3, '0')}`,
    source: 'simulation',
    sourceLabel: 'Simulated dry run — not live ESP32 telemetry',
    frequencies: [...frequencies],
    raw,
    prepared,
    mean,
    coefficients: {
      real: Array.from(coefficients.real),
      imaginary: Array.from(coefficients.imaginary),
    },
    frame,
  };
}

export function capturedCoefficient(capture, frequencyBinIndex) {
  const real = capture.coefficients.real[frequencyBinIndex];
  const imaginary = capture.coefficients.imaginary[frequencyBinIndex];
  return { real, imaginary, magnitude: Math.hypot(real, imaginary) };
}

export function reconstructCoefficient(preparedSamples, frequencyBinIndex) {
  return preparedSamples.reduce((sum, sample, sampleIndex) => {
    const phaseRadians = -2 * Math.PI * frequencyBinIndex * sampleIndex / preparedSamples.length;
    return {
      real: sum.real + sample * Math.cos(phaseRadians),
      imaginary: sum.imaginary + sample * Math.sin(phaseRadians),
    };
  }, { real: 0, imaginary: 0 });
}

export function channelForBin(frequencyBinIndex) {
  for (const [channel, band] of Object.entries(SIGNAL_CONFIG.bands)) {
    if (frequencyBinIndex >= band.firstBin && frequencyBinIndex <= band.lastBin) return channel;
  }
  return null;
}
