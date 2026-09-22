import {
  compareCapturedTransforms,
  finalButterflyForBin,
} from './fourier-comparison.mjs?release=20260923-comparison-1';
import { updateMath } from './math-renderer.mjs?release=20260922-capture-3';

function displayNumber(value, digits = 2) {
  const displayValue = Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value;
  return displayValue.toFixed(digits);
}

function displayComplex(value) {
  const imaginarySign = value.imaginary < 0 ? '−' : '+';
  return `${displayNumber(value.real)} ${imaginarySign} ${displayNumber(Math.abs(value.imaginary))}i`;
}

function writeCoefficient(outputs, coefficient) {
  outputs.real.textContent = displayNumber(coefficient.real);
  outputs.imaginary.textContent = displayNumber(coefficient.imaginary);
  outputs.magnitude.textContent = displayNumber(coefficient.magnitude);
}

export function mountCaptureComparison(root) {
  const fftBinLabel = root.querySelector('#capture-fft-bin-label');
  const fftTwiddle = root.querySelector('#capture-fft-twiddle');
  const fftEven = root.querySelector('#capture-fft-even');
  const fftRotatedOdd = root.querySelector('#capture-fft-rotated-odd');
  const fftPlusCard = root.querySelector('#capture-fft-plus-card');
  const fftMinusCard = root.querySelector('#capture-fft-minus-card');
  const fftPlusLabel = root.querySelector('#capture-fft-plus-label');
  const fftMinusLabel = root.querySelector('#capture-fft-minus-label');
  const fftPlus = root.querySelector('#capture-fft-plus');
  const fftMinus = root.querySelector('#capture-fft-minus');
  const fftConclusion = root.querySelector('#capture-fft-conclusion');
  const comparisonHeading = root.querySelector('#capture-comparison-heading');
  const comparisonOutputs = {
    direct: {
      real: root.querySelector('#comparison-direct-real'),
      imaginary: root.querySelector('#comparison-direct-imaginary'),
      magnitude: root.querySelector('#comparison-direct-magnitude'),
    },
    esp32: {
      real: root.querySelector('#comparison-esp32-real'),
      imaginary: root.querySelector('#comparison-esp32-imaginary'),
      magnitude: root.querySelector('#comparison-esp32-magnitude'),
    },
  };
  const selectedDifference = root.querySelector('#comparison-selected-difference');
  const maximumDifference = root.querySelector('#comparison-maximum-difference');
  const comparisonVerdict = root.querySelector('#comparison-verdict');
  let cachedCapture = null;
  let cachedComparison = null;

  function comparisonFor(capture) {
    if (capture !== cachedCapture) {
      cachedCapture = capture;
      cachedComparison = compareCapturedTransforms(capture);
    }
    return cachedComparison;
  }

  function render(capture, frequencyBinIndex, frequencyHz) {
    const comparison = comparisonFor(capture);
    const selectedComparison = comparison.bins[frequencyBinIndex];
    const butterfly = finalButterflyForBin(comparison.tracedFFT, frequencyBinIndex);
    const halfSize = capture.prepared.length / 2;
    const plusBin = butterfly.offset;
    const minusBin = butterfly.offset + halfSize;

    fftBinLabel.textContent = `Final butterfly for bin ${frequencyBinIndex}`;
    updateMath(
      fftTwiddle,
      String.raw`W_{128}^{${butterfly.offset}}=${displayNumber(butterfly.twiddle.real)}${butterfly.twiddle.imaginary < 0 ? '-' : '+'}${displayNumber(Math.abs(butterfly.twiddle.imaginary))}i`,
      true,
    );
    fftEven.textContent = displayComplex(butterfly.evenInput);
    fftRotatedOdd.textContent = displayComplex(butterfly.rotatedOdd);
    fftPlusLabel.textContent = `Plus branch · X[${plusBin}]`;
    fftMinusLabel.textContent = `Minus branch · X[${minusBin}]`;
    fftPlus.textContent = displayComplex(butterfly.plusOutput);
    fftMinus.textContent = displayComplex(butterfly.minusOutput);
    fftPlusCard.dataset.selected = String(butterfly.selectedBranch === 'plus');
    fftMinusCard.dataset.selected = String(butterfly.selectedBranch === 'minus');
    fftConclusion.textContent = `The highlighted ${butterfly.selectedBranch} branch produces bin ${frequencyBinIndex}: ${displayComplex(butterfly.selectedOutput)}.`;

    comparisonHeading.textContent = `Bin ${frequencyBinIndex} · ${frequencyHz.toFixed(1)} Hz result`;
    writeCoefficient(comparisonOutputs.direct, selectedComparison.directCoefficient);
    writeCoefficient(comparisonOutputs.esp32, selectedComparison.esp32FFTCoefficient);
    selectedDifference.textContent = `${selectedComparison.esp32Difference.toFixed(4)} ADC-count units`;
    maximumDifference.textContent = `${comparison.maximumEsp32Difference.toFixed(4)} ADC-count units`;
    comparisonVerdict.dataset.status = comparison.allEsp32BinsWithinTolerance ? 'match' : 'check';
    comparisonVerdict.textContent = comparison.allEsp32BinsWithinTolerance
      ? 'All 65 FFT (ESP32) coefficients agree with the direct DFT within the documented floating-point tolerance.'
      : 'At least one transmitted coefficient exceeds the documented tolerance; inspect the capture before presenting it.';
  }

  return Object.freeze({ render });
}
