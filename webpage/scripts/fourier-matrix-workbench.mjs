import { SIGNAL_CONFIG, directFourierCoefficient } from './signal-analysis.mjs?release=20260924-distill-23';
import { FREQUENCIES } from './config.mjs?release=20260924-distill-23';
import { renderMath, updateMath } from './math-renderer.mjs?release=20260924-distill-23';
import { createCompositeSampleVector, fourierContribution } from './vector-workbench.mjs?release=20260924-distill-23';

const REPRESENTATIVE_SAMPLE_INDICES = Object.freeze([0, 1, 127]);

function formatSmallNumber(value, decimalPlaces = 3) {
  return Math.abs(value) < 0.5 * 10 ** -decimalPlaces ? '0' : value.toFixed(decimalPlaces);
}

function formatSignedImaginary(value, decimalPlaces = 3) {
  const sign = value < 0 ? '-' : '+';
  return `${sign}${Math.abs(value).toFixed(decimalPlaces)}i`;
}

function frequencyColour(frequencyHz) {
  const detail = FREQUENCIES.find((item) => item.frequencyHz === frequencyHz);
  return detail && detail.band !== 'leakage' ? SIGNAL_CONFIG.bands[detail.band].colour : '#d8ff52';
}

function matrixWeight(frequencyBinIndex, sampleIndex) {
  const phaseRadians = -2 * Math.PI * frequencyBinIndex * sampleIndex / SIGNAL_CONFIG.sampleCount;
  return {
    real: Math.cos(phaseRadians),
    imaginary: Math.sin(phaseRadians),
  };
}

export function calculateGeneratedFourierResult(frequencies, frequencyBinIndex) {
  const samples = createCompositeSampleVector(frequencies);
  const coefficient = directFourierCoefficient(samples, frequencyBinIndex);
  const normalizedMagnitude = frequencyBinIndex === 0 || frequencyBinIndex === SIGNAL_CONFIG.nyquistBin
    ? coefficient.magnitude / SIGNAL_CONFIG.sampleCount
    : 2 * coefficient.magnitude / SIGNAL_CONFIG.sampleCount;
  return { samples, coefficient, normalizedMagnitude };
}

export function relevantFrequencyBins(frequencyHz) {
  const exactBin = frequencyHz / SIGNAL_CONFIG.binSpacingHz;
  const lowerBin = Math.max(0, Math.min(SIGNAL_CONFIG.nyquistBin, Math.floor(exactBin)));
  const upperBin = Math.max(0, Math.min(SIGNAL_CONFIG.nyquistBin, Math.ceil(exactBin)));
  return lowerBin === upperBin ? [lowerBin] : [lowerBin, upperBin];
}

export function sampleReadout(frequencies, sampleIndex) {
  const samples = createCompositeSampleVector(frequencies);
  return {
    sampleIndex,
    timeMilliseconds: sampleIndex / SIGNAL_CONFIG.sampleRateHz * 1000,
    sampleValue: samples[sampleIndex],
  };
}

function formatComplex(real, imaginary, decimalPlaces = 3) {
  return `${formatSmallNumber(real, decimalPlaces)}${formatSignedImaginary(imaginary, decimalPlaces)}`;
}

function createElement(tagName, className, textContent) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (textContent !== undefined) element.textContent = textContent;
  return element;
}

function createMath(className, expression, displayMode = false) {
  const element = createElement('div', `math ${className ?? ''}`.trim());
  element.dataset.latex = expression;
  element.dataset.display = String(displayMode);
  return element;
}

function renderRepresentativeTerms(container, samples, frequencyBinIndex) {
  for (const sampleIndex of REPRESENTATIVE_SAMPLE_INDICES) {
    if (sampleIndex === 127) {
      const ellipsis = createElement('div', 'fourier-term-ellipsis');
      ellipsis.append(
        createElement('strong', null, '⋯'),
        createElement('span', null, '125 more products'),
      );
      container.append(ellipsis);
    }

    const weight = matrixWeight(frequencyBinIndex, sampleIndex);
    const contribution = fourierContribution(samples, frequencyBinIndex, sampleIndex);
    const term = createElement('article', 'fourier-term');
    term.append(
      createMath('fourier-term-index', String.raw`n=${sampleIndex}`),
      createMath(
        'fourier-term-values',
        String.raw`\begin{aligned}F[${frequencyBinIndex},${sampleIndex}]&=e^{-i2\pi(${frequencyBinIndex})(${sampleIndex})/128}\\&=${formatComplex(weight.real, weight.imaginary)}\\x[${sampleIndex}]&=${formatSmallNumber(samples[sampleIndex])}\\c_{${sampleIndex}}&=${formatComplex(contribution.real, contribution.imaginary)}\end{aligned}`,
        true,
      ),
    );
    container.append(term);
  }
}

function renderMeasurementRow(container, samples, frequencies, frequencyBinIndex) {
  const frequencyHz = frequencyBinIndex * SIGNAL_CONFIG.binSpacingHz;
  const { coefficient } = calculateGeneratedFourierResult(frequencies, frequencyBinIndex);
  const row = createElement('section', 'fourier-measurement-row');
  const header = createElement('header');
  header.append(createMath('fourier-row-formula', String.raw`\text{Row }k=${frequencyBinIndex}:\quad F[${frequencyBinIndex},n]=e^{-i2\pi(${frequencyBinIndex})n/128}`));

  const terms = createElement('div', 'fourier-representative-terms');
  terms.setAttribute(
    'aria-label',
    `Representative products from Fourier matrix row ${frequencyBinIndex}, which tests ${frequencyHz} hertz`,
  );
  renderRepresentativeTerms(terms, samples, frequencyBinIndex);

  const result = createElement('div', 'fourier-row-result');
  result.append(createMath(
    null,
    String.raw`X[${frequencyBinIndex}]=\sum_{n=0}^{127}c_n=${formatComplex(coefficient.real, coefficient.imaginary)},\qquad|X[${frequencyBinIndex}]|=${coefficient.magnitude.toFixed(3)}`,
    true,
  ));
  row.append(header, terms, result);
  container.append(row);
}

function renderToneBreakdown(container, frequencies, samples, frequencyHz) {
  container.replaceChildren();
  if (frequencyHz === null) {
    const empty = createElement('div', 'fourier-breakdown-empty');
    empty.append(
      createElement('strong', null, 'Select a tone to reveal its Fourier row calculation.'),
      createElement('p', null, 'With nothing selected, every one of the 128 row-by-column products returns zero.'),
    );
    container.append(empty);
    return;
  }

  const frequencyBins = relevantFrequencyBins(frequencyHz);
  const exactBin = frequencyHz / SIGNAL_CONFIG.binSpacingHz;
  const breakdown = createElement('article', 'fourier-tone-breakdown');
  const heading = createElement('header', 'fourier-tone-heading');
  const mapping = createElement('div', 'fourier-tone-mapping');
  mapping.append(createMath(
    null,
    frequencyBins.length === 1
      ? String.raw`k=\frac{${frequencyHz}}{50}=${frequencyBins[0]}`
      : String.raw`k=\frac{${frequencyHz}}{50}=${exactBin.toFixed(1)}`,
  ));
  if (frequencyBins.length > 1) {
    mapping.append(createElement(
      'p',
      null,
      `No row matches exactly, so rows ${frequencyBins[0]} and ${frequencyBins[1]} share its energy.`,
    ));
  }
  heading.append(createElement('h6', null, `${frequencyHz} Hz`), mapping);
  breakdown.append(heading);
  for (const frequencyBinIndex of frequencyBins) {
    renderMeasurementRow(breakdown, samples, frequencies, frequencyBinIndex);
  }
  container.append(breakdown);
  renderMath(container);
}

function renderToneTabs(container, frequencies, activeFrequencyHz, onSelect) {
  container.replaceChildren();
  container.hidden = frequencies.length < 2;
  for (const frequencyHz of frequencies) {
    const button = createElement('button', 'fourier-tone-tab', `${frequencyHz} Hz`);
    button.type = 'button';
    button.style.setProperty('--frequency-colour', frequencyColour(frequencyHz));
    button.setAttribute('aria-pressed', String(frequencyHz === activeFrequencyHz));
    button.addEventListener('click', () => onSelect(frequencyHz));
    container.append(button);
  }
}

export function mountFourierMatrixWorkbench(root) {
  const sampleIndexControl = root.querySelector('#sample-index');
  const sampleReadoutOutput = root.querySelector('#sample-index-output');
  const selectedBreakdowns = root.querySelector('#fourier-selected-breakdowns');
  const toneTabs = root.querySelector('#fourier-tone-tabs');
  let previousRenderSignature = null;
  let activeFrequencyHz = null;
  let latestFrequencies = [];

  const render = (frequencies, sampleIndex) => {
    const frequencySignature = frequencies.join(',');
    const readout = sampleReadout(frequencies, sampleIndex);
    const spokenSampleValue = formatSmallNumber(readout.sampleValue);
    updateMath(
      sampleReadoutOutput,
      String.raw`n=${sampleIndex}\;\cdot\;t=${readout.timeMilliseconds.toFixed(3)}\,\mathrm{ms}\;\cdot\;x[n]=${spokenSampleValue}`,
    );
    sampleIndexControl.setAttribute(
      'aria-valuetext',
      `sample ${sampleIndex}, time ${readout.timeMilliseconds.toFixed(3)} milliseconds, value ${spokenSampleValue}`,
    );

    if (!frequencies.includes(activeFrequencyHz)) activeFrequencyHz = frequencies[0] ?? null;
    const renderSignature = `${frequencySignature}|${activeFrequencyHz}`;
    if (renderSignature === previousRenderSignature) return;
    previousRenderSignature = renderSignature;
    latestFrequencies = frequencies;

    const samples = createCompositeSampleVector(frequencies);
    renderToneTabs(toneTabs, frequencies, activeFrequencyHz, (frequencyHz) => {
      activeFrequencyHz = frequencyHz;
      render(latestFrequencies, Number(sampleIndexControl.value));
    });
    renderToneBreakdown(selectedBreakdowns, frequencies, samples, activeFrequencyHz);
  };

  return {
    render,
    cleanup() {},
  };
}
