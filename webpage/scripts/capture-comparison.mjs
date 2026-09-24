import {
  compareCapturedTransforms,
  finalButterflyForBin,
} from './fourier-comparison.mjs?release=20260924-distill-23';
import { updateMath } from './math-renderer.mjs?release=20260924-distill-23';

function displayNumber(value, digits = 2) {
  const displayValue = Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value;
  return displayValue.toFixed(digits);
}

function latexComplex(value, digits = 2) {
  return `${displayNumber(value.real, digits)}${value.imaginary < 0 ? '-' : '+'}${displayNumber(Math.abs(value.imaginary), digits)}i`;
}

function displayComplex(value) {
  const imaginarySign = value.imaginary < 0 ? '−' : '+';
  return `${displayNumber(value.real)} ${imaginarySign} ${displayNumber(Math.abs(value.imaginary))}i`;
}

export function mountCaptureComparison(root) {
  const fftBinLabel = root.querySelector('#capture-fft-bin-label');
  const fftEven = root.querySelector('#capture-fft-even');
  const fftEvenLabel = root.querySelector('#capture-fft-even-label');
  const fftOdd = root.querySelector('#capture-fft-odd');
  const fftOddLabel = root.querySelector('#capture-fft-odd-label');
  const fftWorking = root.querySelector('#capture-fft-working');
  const fftTwiddle = root.querySelector('#capture-fft-twiddle');
  const fftRotatedOdd = root.querySelector('#capture-fft-rotated-odd');
  const fftPlusValue = root.querySelector('#capture-fft-plus-value');
  const fftMinusValue = root.querySelector('#capture-fft-minus-value');
  const fftPlusCard = root.querySelector('#capture-fft-plus-card');
  const fftMinusCard = root.querySelector('#capture-fft-minus-card');
  const fftPlusLabel = root.querySelector('#capture-fft-plus-label');
  const fftMinusLabel = root.querySelector('#capture-fft-minus-label');
  const fftConclusion = root.querySelector('#capture-fft-conclusion');
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

    const offset = butterfly.offset;
    fftBinLabel.textContent = `The last butterfly for bin ${frequencyBinIndex}`;
    updateMath(fftEvenLabel, String.raw`E[${offset}]`);
    updateMath(fftOddLabel, String.raw`O[${offset}]`);
    updateMath(fftEven, latexComplex(butterfly.evenInput));
    updateMath(fftOdd, latexComplex(butterfly.oddInput));
    const twiddle = butterfly.twiddle;
    const odd = butterfly.oddInput;
    const twiddleText = latexComplex(twiddle, 3);
    updateMath(
      fftWorking,
      String.raw`\begin{aligned}W_{128}^{${offset}}&=${twiddleText}\\W_{128}^{${offset}}O[${offset}]&=(${twiddleText})(${latexComplex(odd)})=${latexComplex(butterfly.rotatedOdd)}\\X[${plusBin}]&=E[${offset}]+W_{128}^{${offset}}O[${offset}]=${latexComplex(butterfly.plusOutput)}\\X[${minusBin}]&=E[${offset}]-W_{128}^{${offset}}O[${offset}]=${latexComplex(butterfly.minusOutput)}\end{aligned}`,
      true,
    );
    updateMath(fftTwiddle, String.raw`\times\,W_{128}^{${offset}}\;\rightarrow`);
    updateMath(fftRotatedOdd, latexComplex(butterfly.rotatedOdd));
    updateMath(fftPlusValue, latexComplex(butterfly.plusOutput));
    updateMath(fftMinusValue, latexComplex(butterfly.minusOutput));
    updateMath(fftPlusLabel, String.raw`X[${plusBin}]`);
    updateMath(fftMinusLabel, String.raw`X[${minusBin}]`);
    fftPlusCard.dataset.selected = String(butterfly.selectedBranch === 'plus');
    fftMinusCard.dataset.selected = String(butterfly.selectedBranch === 'minus');
    fftConclusion.textContent = `Bin ${frequencyBinIndex} is the highlighted ${butterfly.selectedBranch} output. The same rotated odd value also produced bin ${butterfly.pairedBin}, so that multiplication was done once, not twice.`;

    comparisonVerdict.dataset.status = comparison.allEsp32BinsWithinTolerance ? 'match' : 'check';
    comparisonVerdict.textContent = comparison.allEsp32BinsWithinTolerance
      ? `Matches the direct DFT: bin ${frequencyBinIndex} differs by ${selectedComparison.esp32Difference.toFixed(4)} ADC counts, and all 65 bins agree within tolerance.`
      : 'At least one ESP32 coefficient differs from the direct DFT beyond tolerance; inspect the capture before presenting it.';
  }

  return Object.freeze({ render });
}
