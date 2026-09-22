const ABSOLUTE_COMPLEX_TOLERANCE = 0.02;
const RELATIVE_COMPLEX_TOLERANCE = 0.0002;

function validateFiniteSamples(realSamples) {
  const numberOfSamples = realSamples.length;
  if (numberOfSamples < 1) throw new RangeError('Transform input cannot be empty');
  if (!realSamples.every(Number.isFinite)) {
    throw new TypeError('Transform samples must all be finite numbers');
  }
  return numberOfSamples;
}

function validateFFTInput(realSamples) {
  const numberOfSamples = validateFiniteSamples(realSamples);
  if (numberOfSamples < 2 || (numberOfSamples & (numberOfSamples - 1)) !== 0) {
    throw new RangeError('FFT comparison requires a power-of-two sample count');
  }
  return numberOfSamples;
}

function reverseBits(value, bitCount) {
  let reversedValue = 0;
  for (let bitIndex = 0; bitIndex < bitCount; bitIndex += 1) {
    reversedValue = (reversedValue << 1) | (value & 1);
    value >>= 1;
  }
  return reversedValue;
}

function complexValue(real, imaginary) {
  return Object.freeze({ real, imaginary, magnitude: Math.hypot(real, imaginary) });
}

function coefficientAt(transform, frequencyBinIndex) {
  return complexValue(
    transform.real[frequencyBinIndex],
    transform.imaginary[frequencyBinIndex],
  );
}

export function calculateDirectDFT(realSamples) {
  const numberOfSamples = validateFiniteSamples(realSamples);
  const real = new Float64Array(numberOfSamples);
  const imaginary = new Float64Array(numberOfSamples);

  for (let frequencyBinIndex = 0;
    frequencyBinIndex < numberOfSamples;
    frequencyBinIndex += 1) {
    let coefficientReal = 0;
    let coefficientImaginary = 0;
    for (let sampleIndex = 0; sampleIndex < numberOfSamples; sampleIndex += 1) {
      const phaseRadians = -2 * Math.PI
        * frequencyBinIndex * sampleIndex / numberOfSamples;
      coefficientReal += realSamples[sampleIndex] * Math.cos(phaseRadians);
      coefficientImaginary += realSamples[sampleIndex] * Math.sin(phaseRadians);
    }
    real[frequencyBinIndex] = coefficientReal;
    imaginary[frequencyBinIndex] = coefficientImaginary;
  }

  return Object.freeze({ real, imaginary });
}

export function calculateTracedFFT(realSamples) {
  const numberOfSamples = validateFFTInput(realSamples);
  const real = Float64Array.from(realSamples);
  const imaginary = new Float64Array(numberOfSamples);
  const bitCount = Math.log2(numberOfSamples);
  const bitReversedOrder = new Array(numberOfSamples);

  for (let sampleIndex = 0; sampleIndex < numberOfSamples; sampleIndex += 1) {
    const bitReversedIndex = reverseBits(sampleIndex, bitCount);
    bitReversedOrder[sampleIndex] = bitReversedIndex;
    if (bitReversedIndex > sampleIndex) {
      [real[sampleIndex], real[bitReversedIndex]] = [
        real[bitReversedIndex],
        real[sampleIndex],
      ];
    }
  }

  const stages = [];
  for (let blockSize = 2; blockSize <= numberOfSamples; blockSize *= 2) {
    const halfBlockSize = blockSize / 2;
    const butterflies = [];
    for (let blockStart = 0; blockStart < numberOfSamples; blockStart += blockSize) {
      for (let offset = 0; offset < halfBlockSize; offset += 1) {
        const phaseRadians = -2 * Math.PI * offset / blockSize;
        const twiddleReal = Math.cos(phaseRadians);
        const twiddleImaginary = Math.sin(phaseRadians);
        const evenIndex = blockStart + offset;
        const oddIndex = evenIndex + halfBlockSize;
        const evenInput = complexValue(real[evenIndex], imaginary[evenIndex]);
        const oddInput = complexValue(real[oddIndex], imaginary[oddIndex]);
        const rotatedOddReal = oddInput.real * twiddleReal
          - oddInput.imaginary * twiddleImaginary;
        const rotatedOddImaginary = oddInput.real * twiddleImaginary
          + oddInput.imaginary * twiddleReal;
        const plusOutput = complexValue(
          evenInput.real + rotatedOddReal,
          evenInput.imaginary + rotatedOddImaginary,
        );
        const minusOutput = complexValue(
          evenInput.real - rotatedOddReal,
          evenInput.imaginary - rotatedOddImaginary,
        );

        real[evenIndex] = plusOutput.real;
        imaginary[evenIndex] = plusOutput.imaginary;
        real[oddIndex] = minusOutput.real;
        imaginary[oddIndex] = minusOutput.imaginary;
        butterflies.push(Object.freeze({
          blockStart,
          offset,
          evenIndex,
          oddIndex,
          twiddle: complexValue(twiddleReal, twiddleImaginary),
          evenInput,
          oddInput,
          rotatedOdd: complexValue(rotatedOddReal, rotatedOddImaginary),
          plusOutput,
          minusOutput,
        }));
      }
    }
    stages.push(Object.freeze({
      blockSize,
      butterflies: Object.freeze(butterflies),
      real: Object.freeze(Array.from(real)),
      imaginary: Object.freeze(Array.from(imaginary)),
    }));
  }

  return Object.freeze({
    real,
    imaginary,
    bitReversedOrder: Object.freeze(bitReversedOrder),
    stages: Object.freeze(stages),
  });
}

export function finalButterflyForBin(tracedFFT, frequencyBinIndex) {
  const finalStage = tracedFFT.stages.at(-1);
  const numberOfSamples = tracedFFT.real.length;
  if (!finalStage || frequencyBinIndex < 0 || frequencyBinIndex >= numberOfSamples) {
    throw new RangeError('Selected FFT bin is outside the traced transform');
  }
  const halfSize = numberOfSamples / 2;
  const offset = frequencyBinIndex % halfSize;
  const butterfly = finalStage.butterflies.find(
    (candidate) => candidate.blockStart === 0 && candidate.offset === offset,
  );
  const selectedBranch = frequencyBinIndex < halfSize ? 'plus' : 'minus';
  return Object.freeze({
    ...butterfly,
    selectedBranch,
    selectedBin: frequencyBinIndex,
    pairedBin: selectedBranch === 'plus'
      ? frequencyBinIndex + halfSize
      : frequencyBinIndex - halfSize,
    selectedOutput: selectedBranch === 'plus'
      ? butterfly.plusOutput
      : butterfly.minusOutput,
  });
}

export function allowedComplexDifference(referenceCoefficient) {
  return ABSOLUTE_COMPLEX_TOLERANCE
    + RELATIVE_COMPLEX_TOLERANCE * referenceCoefficient.magnitude;
}

export function compareCapturedTransforms(capture) {
  const directDFT = calculateDirectDFT(capture.prepared);
  const tracedFFT = calculateTracedFFT(capture.prepared);
  const transmittedBinCount = Math.min(
    capture.coefficients.real.length,
    capture.coefficients.imaginary.length,
  );
  const bins = [];
  let maximumBrowserDifference = 0;
  let maximumEsp32Difference = 0;
  let allEsp32BinsWithinTolerance = true;

  for (let frequencyBinIndex = 0;
    frequencyBinIndex < transmittedBinCount;
    frequencyBinIndex += 1) {
    const directCoefficient = coefficientAt(directDFT, frequencyBinIndex);
    const browserFFTCoefficient = coefficientAt(tracedFFT, frequencyBinIndex);
    const esp32FFTCoefficient = complexValue(
      capture.coefficients.real[frequencyBinIndex],
      capture.coefficients.imaginary[frequencyBinIndex],
    );
    const browserDifference = Math.hypot(
      directCoefficient.real - browserFFTCoefficient.real,
      directCoefficient.imaginary - browserFFTCoefficient.imaginary,
    );
    const esp32Difference = Math.hypot(
      directCoefficient.real - esp32FFTCoefficient.real,
      directCoefficient.imaginary - esp32FFTCoefficient.imaginary,
    );
    const tolerance = allowedComplexDifference(directCoefficient);
    maximumBrowserDifference = Math.max(maximumBrowserDifference, browserDifference);
    maximumEsp32Difference = Math.max(maximumEsp32Difference, esp32Difference);
    if (esp32Difference > tolerance) allEsp32BinsWithinTolerance = false;
    bins.push(Object.freeze({
      frequencyBinIndex,
      directCoefficient,
      browserFFTCoefficient,
      esp32FFTCoefficient,
      browserDifference,
      esp32Difference,
      tolerance,
    }));
  }

  return Object.freeze({
    directDFT,
    tracedFFT,
    bins: Object.freeze(bins),
    maximumBrowserDifference,
    maximumEsp32Difference,
    allEsp32BinsWithinTolerance,
    transmittedBinCount,
  });
}
