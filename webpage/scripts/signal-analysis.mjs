import { SIGNAL_CONFIG } from './config.mjs';

function reverseBits(value, bitCount) {
  let reversed = 0;
  for (let bit = 0; bit < bitCount; bit += 1) {
    reversed = (reversed << 1) | (value & 1);
    value >>= 1;
  }
  return reversed;
}

export function fastFourierTransform(realSamples) {
  const numberOfSamples = realSamples.length;
  if (numberOfSamples < 2 || (numberOfSamples & (numberOfSamples - 1)) !== 0) {
    throw new RangeError('FFT sample count must be a power of two');
  }

  const real = Float64Array.from(realSamples);
  const imaginary = new Float64Array(numberOfSamples);
  const bitCount = Math.log2(numberOfSamples);

  for (let sampleIndex = 0; sampleIndex < numberOfSamples; sampleIndex += 1) {
    const reversedIndex = reverseBits(sampleIndex, bitCount);
    if (reversedIndex > sampleIndex) {
      [real[sampleIndex], real[reversedIndex]] = [real[reversedIndex], real[sampleIndex]];
    }
  }

  for (let blockSize = 2; blockSize <= numberOfSamples; blockSize *= 2) {
    const halfBlockSize = blockSize / 2;
    for (let blockStart = 0; blockStart < numberOfSamples; blockStart += blockSize) {
      for (let offset = 0; offset < halfBlockSize; offset += 1) {
        const phase = -2 * Math.PI * offset / blockSize;
        const twiddleReal = Math.cos(phase);
        const twiddleImaginary = Math.sin(phase);
        const evenIndex = blockStart + offset;
        const oddIndex = evenIndex + halfBlockSize;
        const rotatedReal = real[oddIndex] * twiddleReal
          - imaginary[oddIndex] * twiddleImaginary;
        const rotatedImaginary = real[oddIndex] * twiddleImaginary
          + imaginary[oddIndex] * twiddleReal;

        real[oddIndex] = real[evenIndex] - rotatedReal;
        imaginary[oddIndex] = imaginary[evenIndex] - rotatedImaginary;
        real[evenIndex] += rotatedReal;
        imaginary[evenIndex] += rotatedImaginary;
      }
    }
  }
  return { real, imaginary };
}

function hammingWindow(sampleIndex, numberOfSamples) {
  return 0.54 - 0.46 * Math.cos(2 * Math.PI * sampleIndex / (numberOfSamples - 1));
}

function calculateBandStrength(magnitudes, firstBin, lastBin) {
  let sumSquaredMagnitudes = 0;
  for (let binIndex = firstBin; binIndex <= lastBin; binIndex += 1) {
    sumSquaredMagnitudes += magnitudes[binIndex] ** 2;
  }
  return Math.sqrt(sumSquaredMagnitudes);
}

function scaleChannel(bandStrength, gain) {
  return Math.min(
    SIGNAL_CONFIG.maximumBrightness,
    Math.max(0, Math.round(bandStrength * SIGNAL_CONFIG.brightnessPerMagnitudeUnit * gain)),
  );
}

export function mapBandStrengthsToRgb(bands) {
  return {
    red: scaleChannel(bands.red, SIGNAL_CONFIG.bands.red.gain),
    green: scaleChannel(bands.green, SIGNAL_CONFIG.bands.green.gain),
    blue: scaleChannel(bands.blue, SIGNAL_CONFIG.bands.blue.gain),
  };
}

export function analyseGeneratedFrequencies(frequencies, volumePercent = 20) {
  const samples = new Float64Array(SIGNAL_CONFIG.sampleCount);
  const outputLevel = Math.max(0, volumePercent) / 20;
  const componentAmplitude = SIGNAL_CONFIG.generatedPeakAmplitude
    * outputLevel / SIGNAL_CONFIG.perToneHeadroomDivisor;

  for (let sampleIndex = 0; sampleIndex < SIGNAL_CONFIG.sampleCount; sampleIndex += 1) {
    const sampleTimeSeconds = sampleIndex / SIGNAL_CONFIG.sampleRateHz;
    for (const frequencyHz of frequencies) {
      samples[sampleIndex] += componentAmplitude
        * Math.sin(2 * Math.PI * frequencyHz * sampleTimeSeconds);
    }
  }

  const frameMean = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
  let sumCenteredSquares = 0;
  const preparedSamples = samples.map((sample, sampleIndex) => {
    const centeredSample = sample - frameMean;
    sumCenteredSquares += centeredSample ** 2;
    return centeredSample * hammingWindow(sampleIndex, samples.length);
  });
  const rms = Math.sqrt(sumCenteredSquares / samples.length);
  const coefficients = fastFourierTransform(preparedSamples);
  const magnitudes = Array.from(
    { length: SIGNAL_CONFIG.nyquistBin + 1 },
    (_, binIndex) => Math.hypot(coefficients.real[binIndex], coefficients.imaginary[binIndex]),
  );
  const bands = {
    red: calculateBandStrength(magnitudes, SIGNAL_CONFIG.bands.red.firstBin, SIGNAL_CONFIG.bands.red.lastBin),
    green: calculateBandStrength(magnitudes, SIGNAL_CONFIG.bands.green.firstBin, SIGNAL_CONFIG.bands.green.lastBin),
    blue: calculateBandStrength(magnitudes, SIGNAL_CONFIG.bands.blue.firstBin, SIGNAL_CONFIG.bands.blue.lastBin),
  };

  let dominantBin = 0;
  for (let binIndex = 1; binIndex < magnitudes.length; binIndex += 1) {
    if (magnitudes[binIndex] > magnitudes[dominantBin]) dominantBin = binIndex;
  }

  return {
    source: 'generated',
    sequence: 0,
    sampleRateHz: SIGNAL_CONFIG.sampleRateHz,
    rms,
    noiseFloor: 0,
    silenceThreshold: 0,
    dominantBin,
    dominantHz: dominantBin * SIGNAL_CONFIG.binSpacingHz,
    bands,
    rgb: mapBandStrengthsToRgb(bands),
    magnitudes,
    preparedSamples: Array.from(preparedSamples),
    coefficients,
    receivedAt: performance.now(),
  };
}

export function findExpectedPeaks(magnitudes, frequencies, searchRadiusBins = 1) {
  return frequencies.map((frequencyHz) => {
    const expectedBin = frequencyHz / SIGNAL_CONFIG.binSpacingHz;
    const centerBin = Math.round(expectedBin);
    let observedBin = centerBin;
    let observedMagnitude = -Infinity;
    for (let binIndex = Math.max(1, centerBin - searchRadiusBins);
      binIndex <= Math.min(SIGNAL_CONFIG.nyquistBin, centerBin + searchRadiusBins);
      binIndex += 1) {
      if (magnitudes[binIndex] > observedMagnitude) {
        observedMagnitude = magnitudes[binIndex];
        observedBin = binIndex;
      }
    }
    const observedHz = observedBin * SIGNAL_CONFIG.binSpacingHz;
    return {
      frequencyHz,
      expectedBin,
      observedBin,
      observedHz,
      errorHz: observedHz - frequencyHz,
      withinOneBin: Math.abs(observedHz - frequencyHz) <= SIGNAL_CONFIG.binSpacingHz,
      isLeakageExample: frequencyHz % SIGNAL_CONFIG.binSpacingHz !== 0,
    };
  });
}

export function directFourierCoefficient(samples, frequencyBinIndex) {
  let real = 0;
  let imaginary = 0;
  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
    const phase = -2 * Math.PI * frequencyBinIndex * sampleIndex / samples.length;
    real += samples[sampleIndex] * Math.cos(phase);
    imaginary += samples[sampleIndex] * Math.sin(phase);
  }
  return { real, imaginary, magnitude: Math.hypot(real, imaginary) };
}

export { SIGNAL_CONFIG };
