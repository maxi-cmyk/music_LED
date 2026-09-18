export const SIGNAL_CONFIG = Object.freeze({
  sampleCount: 128,
  sampleRateHz: 6400,
  binSpacingHz: 50,
  nyquistBin: 64,
  generatedPeakAmplitude: 72,
  brightnessPerMagnitudeUnit: 0.12,
  maximumBrightness: 255,
  bands: Object.freeze({
    red: Object.freeze({ firstBin: 1, lastBin: 5, gain: 1.0 }),
    green: Object.freeze({ firstBin: 6, lastBin: 20, gain: 0.82 }),
    blue: Object.freeze({ firstBin: 21, lastBin: 50, gain: 0.92 }),
  }),
});

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
        const rotatedReal = real[oddIndex] * twiddleReal - imaginary[oddIndex] * twiddleImaginary;
        const rotatedImaginary = real[oddIndex] * twiddleImaginary + imaginary[oddIndex] * twiddleReal;

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
  const componentCount = Math.max(1, frequencies.length);
  const outputLevel = Math.max(0, volumePercent) / 20;

  for (let sampleIndex = 0; sampleIndex < SIGNAL_CONFIG.sampleCount; sampleIndex += 1) {
    const sampleTimeSeconds = sampleIndex / SIGNAL_CONFIG.sampleRateHz;
    for (const frequencyHz of frequencies) {
      samples[sampleIndex] += SIGNAL_CONFIG.generatedPeakAmplitude * outputLevel
        * Math.sin(2 * Math.PI * frequencyHz * sampleTimeSeconds)
        / componentCount;
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
  const rgb = mapBandStrengthsToRgb(bands);

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
    rgb,
    magnitudes,
    receivedAt: performance.now(),
  };
}

function finiteNumber(value, fieldName) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) throw new TypeError(`Invalid ${fieldName}`);
  return parsedValue;
}

function parseRgb(value) {
  const channels = value.split('|').map((channel) => finiteNumber(channel, 'RGB channel'));
  if (channels.length !== 3 || channels.some((channel) => channel < 0 || channel > 255)) {
    throw new TypeError('Invalid RGB value');
  }
  return { red: channels[0], green: channels[1], blue: channels[2] };
}

export function parseSpectrumFrame(line) {
  if (!line.startsWith('SPECTRUM_FRAME,')) return null;
  const fields = {};
  for (const token of line.split(',').slice(1)) {
    const separatorIndex = token.indexOf('=');
    if (separatorIndex <= 0) continue;
    fields[token.slice(0, separatorIndex)] = token.slice(separatorIndex + 1);
  }

  const magnitudes = (fields.bins ?? '').split('|').map((magnitude) => finiteNumber(magnitude, 'bin magnitude'));
  if (magnitudes.length !== SIGNAL_CONFIG.nyquistBin + 1) {
    throw new TypeError(`Expected ${SIGNAL_CONFIG.nyquistBin + 1} spectrum bins`);
  }

  return {
    source: 'esp32',
    sequence: finiteNumber(fields.sequence, 'sequence'),
    sampleRateHz: finiteNumber(fields.sample_rate_hz, 'sample rate'),
    rms: finiteNumber(fields.rms, 'RMS'),
    noiseFloor: finiteNumber(fields.noise_floor, 'noise floor'),
    silenceThreshold: finiteNumber(fields.silence_threshold, 'silence threshold'),
    dominantBin: finiteNumber(fields.dominant_bin, 'dominant bin'),
    dominantHz: finiteNumber(fields.dominant_hz, 'dominant frequency'),
    bands: {
      red: finiteNumber(fields.bass, 'bass strength'),
      green: finiteNumber(fields.mid, 'midrange strength'),
      blue: finiteNumber(fields.treble, 'treble strength'),
    },
    rgb: parseRgb(fields.rgb ?? ''),
    magnitudes,
    receivedAt: performance.now(),
  };
}

export class SerialLineBuffer {
  constructor(onLine) {
    this.onLine = onLine;
    this.pendingText = '';
  }

  push(textChunk) {
    this.pendingText += textChunk;
    const lines = this.pendingText.split(/\r?\n/);
    this.pendingText = lines.pop() ?? '';
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine) this.onLine(trimmedLine);
    }
  }

  flush() {
    const remainingLine = this.pendingText.trim();
    this.pendingText = '';
    if (remainingLine) this.onLine(remainingLine);
  }
}
