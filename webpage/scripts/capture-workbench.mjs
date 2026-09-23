import { SIGNAL_CONFIG } from './config.mjs?release=20260922-capture-3';
import {
  capturedCoefficient,
  reconstructCoefficient,
} from './capture-analysis.mjs?release=20260922-capture-3';
import { mountCaptureComparison } from './capture-comparison.mjs?release=20260923-comparison-1';
import { updateMath } from './math-renderer.mjs?release=20260922-capture-3';
import { allFourierContributions } from './vector-workbench.mjs?release=20260922-capture-3';
import { drawFourierContributionPath, drawSampleVector } from './visualizations.mjs?release=20260922-capture-3';

const STAGE_COUNT = 6;
const NEXT_STAGE_LABELS = Object.freeze([
  'Show direct DFT',
  'Show DFT sum',
  'Show FFT reuse',
  'Compare results',
  'Show colour mapping',
  'Exit capture',
]);

function signedImaginary(value) {
  return value < 0 ? `-${Math.abs(value).toFixed(2)}i` : `+${value.toFixed(2)}i`;
}

const REPRESENTATIVE_MATRIX_ROWS = Object.freeze([0, 1, 2, 125, 126, 127]);

function matrixColumnIndices() {
  return [0, 1, 2, 3, 124, 125, 126, 127];
}

function matrixRowDescription(frequencyBinIndex) {
  if (frequencyBinIndex === 0) return 'DC · constant pattern';
  if (frequencyBinIndex < SIGNAL_CONFIG.sampleCount / 2) {
    return `positive frequency · ${frequencyBinIndex} cycles per frame`;
  }
  const positivePartner = SIGNAL_CONFIG.sampleCount - frequencyBinIndex;
  return `negative-frequency mirror of row ${positivePartner}`;
}

function renderMatrixWeights(container, frequencyBinIndex) {
  container.replaceChildren();
  for (const sampleIndex of matrixColumnIndices()) {
    const cell = document.createElement('span');
    const phaseTurns = frequencyBinIndex * sampleIndex / SIGNAL_CONFIG.sampleCount;
    const phaseRadians = -2 * Math.PI * phaseTurns;
    const real = Math.cos(phaseRadians);
    const imaginary = Math.sin(phaseRadians);
    const complexValue = `${real.toFixed(2)} ${imaginary < 0 ? '−' : '+'} ${Math.abs(imaginary).toFixed(2)}i`;
    cell.innerHTML = `<small>n=${sampleIndex}</small><b>${complexValue}</b><small>θ=${phaseTurns.toFixed(2)} turns</small>`;
    container.append(cell);
    if (sampleIndex === 3) {
      const ellipsis = document.createElement('i');
      ellipsis.textContent = '…';
      ellipsis.setAttribute('aria-label', 'remaining matrix entries');
      container.append(ellipsis);
    }
  }
}

function renderRepresentativeMatrixRows(container, preparedSamples) {
  container.replaceChildren();
  for (const frequencyBinIndex of REPRESENTATIVE_MATRIX_ROWS) {
    const row = document.createElement('article');
    row.className = 'capture-matrix-row-example';

    const heading = document.createElement('header');
    const title = document.createElement('strong');
    title.textContent = `Row ${frequencyBinIndex} → X[${frequencyBinIndex}]`;
    const description = document.createElement('span');
    description.textContent = matrixRowDescription(frequencyBinIndex);
    heading.append(title, description);

    const weights = document.createElement('div');
    weights.className = 'capture-matrix-row';
    weights.setAttribute('aria-label', `Representative weights from Fourier matrix row ${frequencyBinIndex}`);
    renderMatrixWeights(weights, frequencyBinIndex);

    const coefficient = reconstructCoefficient(preparedSamples, frequencyBinIndex);
    const equation = document.createElement('div');
    equation.className = 'math capture-row-equation';

    row.append(heading, weights, equation);
    container.append(row);
    updateMath(
      equation,
      String.raw`X_{\mathrm{DFT}}[${frequencyBinIndex}]=\sum_{n=0}^{127}x[n]e^{-i2\pi(${frequencyBinIndex})n/128}=${coefficient.real.toFixed(2)}${signedImaginary(coefficient.imaginary)}`,
      true,
    );
  }
}

export function mountCaptureWorkbench(root, { store, serialSource, reducedMotion }) {
  const captureButton = root.querySelector('#capture-button');
  const captureStatus = root.querySelector('#capture-status');
  const workbench = root.querySelector('#capture-workbench');
  const sourceLabel = root.querySelector('#capture-source');
  const captureMeta = root.querySelector('#capture-meta');
  const stageButtons = [...root.querySelectorAll('[data-capture-stage]')];
  const stagePanels = [...root.querySelectorAll('[data-capture-panel]')];
  const previousButton = root.querySelector('#capture-previous');
  const nextButton = root.querySelector('#capture-next');
  const resumeButton = root.querySelector('#resume-live');
  const replayButton = root.querySelector('#replay-complex-path');
  const speedButtons = [...root.querySelectorAll('[data-complex-speed]')];
  const binSelect = root.querySelector('#capture-bin-select');
  const binPreviousButton = root.querySelector('#capture-bin-previous');
  const binNextButton = root.querySelector('#capture-bin-next');
  const binOutput = root.querySelector('#capture-bin-output');
  const rawCanvas = root.querySelector('#capture-raw-canvas');
  const preparedCanvas = root.querySelector('#capture-prepared-canvas');
  const complexCanvas = root.querySelector('#capture-complex-canvas');
  const matrixRows = root.querySelector('#capture-matrix-rows');
  const preparationEquation = root.querySelector('#capture-preparation-equation');
  const outputVector = root.querySelector('#capture-output-vector');
  const complexEquation = root.querySelector('#capture-complex-equation');
  const magnitudeEquation = root.querySelector('#capture-magnitude-equation');
  const complexProgress = root.querySelector('#complex-progress');
  const coefficientCheck = root.querySelector('#capture-coefficient-check');
  const captureBandOutputs = {
    red: root.querySelector('#capture-red-band'),
    green: root.querySelector('#capture-green-band'),
    blue: root.querySelector('#capture-blue-band'),
  };
  const captureRgbEquation = root.querySelector('#capture-rgb-equation');
  const captureRgbSwatch = root.querySelector('#capture-rgb-swatch');
  const captureRgbOutput = root.querySelector('#capture-rgb-output');
  const captureComparison = mountCaptureComparison(root);
  let complexAnimationFrame = null;
  let animationSpeedMultiplier = 3;
  let previousStage = null;
  const captureApiAvailable = typeof serialSource.requestCapture === 'function';

  function speedLabel() {
    return animationSpeedMultiplier === 1
      ? 'normal speed'
      : `${animationSpeedMultiplier}× slower`;
  }

  function stopComplexAnimation() {
    if (complexAnimationFrame) cancelAnimationFrame(complexAnimationFrame);
    complexAnimationFrame = null;
  }

  function playComplexAnimation(capture, frequencyBinIndex) {
    stopComplexAnimation();
    const contributions = allFourierContributions(capture.prepared, frequencyBinIndex);
    if (reducedMotion.matches) {
      drawFourierContributionPath(complexCanvas, contributions, contributions.length - 1);
      complexProgress.textContent = '128 of 128 measured terms accumulated · reduced motion';
      return;
    }
    const startedAt = performance.now();
    const durationMilliseconds = 2600 * animationSpeedMultiplier;
    const drawFrame = (now) => {
      const progress = Math.min(1, (now - startedAt) / durationMilliseconds);
      const visibleTerms = Math.max(1, Math.ceil(progress * contributions.length));
      drawFourierContributionPath(
        complexCanvas,
        contributions.slice(0, visibleTerms),
        visibleTerms - 1,
      );
      complexProgress.textContent = `${visibleTerms} of 128 measured terms accumulated · ${speedLabel()}`;
      if (progress < 1) complexAnimationFrame = requestAnimationFrame(drawFrame);
      else complexAnimationFrame = null;
    };
    complexAnimationFrame = requestAnimationFrame(drawFrame);
  }

  function showStage(stageIndex) {
    store.patch({ captureStage: Math.max(0, Math.min(STAGE_COUNT - 1, stageIndex)) });
  }

  captureButton.addEventListener('click', async () => {
    if (!serialSource.connected || store.get().captureStatus === 'capturing') return;
    if (!captureApiAvailable) {
      store.patch({
        captureStatus: 'error',
        captureMessage: 'This page mixed two cached versions. Reload once, reconnect the ESP32, then capture again.',
      });
      return;
    }
    const frequenciesAtRequest = [...store.get().selectedFrequencies];
    store.patch({
      captureStatus: 'capturing',
      captureMessage: 'Capturing the next complete 20 ms ESP32 window…',
    });
    try {
      const capture = await serialSource.requestCapture();
      const capturedEvidence = { ...capture, frequencies: frequenciesAtRequest };
      store.patch({
        capturedEvidence,
        captureStage: 0,
        selectedCaptureBin: Math.max(1, capture.frame.dominantBin),
        isFrozen: true,
        frozenFrame: capture.frame,
        captureStatus: 'captured',
        captureMessage: `Captured ESP32 frame ${capture.captureId}.`,
      });
      requestAnimationFrame(() => {
        workbench.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      });
    } catch (error) {
      store.patch({
        captureStatus: 'error',
        captureMessage: `Capture incomplete. Live view was not changed. ${error.message}`,
      });
    }
  });

  function resumeLiveView() {
    stopComplexAnimation();
    store.patch({
      capturedEvidence: null,
      isFrozen: false,
      frozenFrame: null,
      captureStatus: serialSource.connected ? 'ready' : 'disconnected',
      captureMessage: serialSource.connected
        ? 'Ready to capture one measured ESP32 frame.'
        : 'Connect ESP32 to capture a measured frame.',
    });
    requestAnimationFrame(() => {
      captureButton.focus({ preventScroll: true });
      captureButton.scrollIntoView({
        behavior: reducedMotion.matches ? 'auto' : 'smooth',
        block: 'center',
      });
    });
  }

  function selectBin(frequencyBinIndex) {
    const boundedBin = Math.max(0, Math.min(SIGNAL_CONFIG.nyquistBin, frequencyBinIndex));
    store.patch({ selectedCaptureBin: boundedBin });
  }

  resumeButton.addEventListener('click', resumeLiveView);
  previousButton.addEventListener('click', () => showStage(store.get().captureStage - 1));
  nextButton.addEventListener('click', () => {
    if (store.get().captureStage === STAGE_COUNT - 1) resumeLiveView();
    else showStage(store.get().captureStage + 1);
  });
  replayButton.addEventListener('click', () => {
    const state = store.get();
    if (state.capturedEvidence) playComplexAnimation(state.capturedEvidence, state.selectedCaptureBin);
  });
  for (const button of speedButtons) {
    button.disabled = reducedMotion.matches;
    button.addEventListener('click', () => {
      animationSpeedMultiplier = Number(button.dataset.complexSpeed);
      speedButtons.forEach((candidate) => {
        candidate.setAttribute(
          'aria-pressed',
          String(candidate === button),
        );
      });
      const state = store.get();
      if (state.capturedEvidence && state.captureStage === 2) {
        playComplexAnimation(state.capturedEvidence, state.selectedCaptureBin);
      }
    });
  }
  binSelect.addEventListener('input', () => selectBin(Number(binSelect.value)));
  binPreviousButton.addEventListener('click', () => selectBin(store.get().selectedCaptureBin - 1));
  binNextButton.addEventListener('click', () => selectBin(store.get().selectedCaptureBin + 1));
  for (const button of stageButtons) {
    button.addEventListener('click', () => showStage(Number(button.dataset.captureStage)));
    button.addEventListener('keydown', (event) => {
      const currentIndex = Number(button.dataset.captureStage);
      const requestedIndex = event.key === 'ArrowRight'
        ? (currentIndex + 1) % STAGE_COUNT
        : event.key === 'ArrowLeft'
          ? (currentIndex - 1 + STAGE_COUNT) % STAGE_COUNT
          : event.key === 'Home' ? 0
            : event.key === 'End' ? STAGE_COUNT - 1 : null;
      if (requestedIndex === null) return;
      event.preventDefault();
      showStage(requestedIndex);
      requestAnimationFrame(() => stageButtons[requestedIndex].focus());
    });
  }

  function render(state) {
    const capture = state.capturedEvidence;
    workbench.hidden = !capture;
    captureStatus.textContent = state.captureMessage;
    captureStatus.dataset.status = state.captureStatus;
    const isCapturing = state.captureStatus === 'capturing';
    captureButton.textContent = isCapturing ? 'Capturing frame…' : 'Capture frame';
    captureButton.disabled = !serialSource.connected || isCapturing;
    captureButton.setAttribute('aria-pressed', String(Boolean(capture)));
    if (!capture) {
      previousStage = null;
      return;
    }

    const stageIndex = state.captureStage;
    const frequencyBinIndex = state.selectedCaptureBin;
    const coefficient = capturedCoefficient(capture, frequencyBinIndex);
    const binSpacingHz = capture.frame.sampleRateHz / SIGNAL_CONFIG.sampleCount;
    const frequencyHz = frequencyBinIndex * binSpacingHz;
    sourceLabel.textContent = capture.aboveSilenceThreshold
      ? capture.sourceLabel
      : `${capture.sourceLabel} · below the LED silence gate`;
    captureMeta.textContent = `${capture.id} · 128 samples · ${(capture.sampleSpanMicroseconds / 1000).toFixed(1)} ms · ${capture.frame.sampleRateHz.toFixed(0)} Hz sample rate`;
    binSelect.value = String(frequencyBinIndex);
    binOutput.textContent = `Bin ${frequencyBinIndex} of 0–64 · ${frequencyHz.toFixed(1)} Hz`;
    binPreviousButton.disabled = frequencyBinIndex <= 0;
    binNextButton.disabled = frequencyBinIndex >= SIGNAL_CONFIG.nyquistBin;

    stageButtons.forEach((button, index) => {
      const selected = index === stageIndex;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    stagePanels.forEach((panel, index) => { panel.hidden = index !== stageIndex; });
    previousButton.disabled = stageIndex === 0;
    nextButton.disabled = false;
    nextButton.textContent = NEXT_STAGE_LABELS[stageIndex];

    drawSampleVector(rawCanvas, capture.raw);
    drawSampleVector(preparedCanvas, capture.prepared);
    updateMath(
      preparationEquation,
      String.raw`\begin{aligned}\mu&=\frac{1}{128}\sum_{m=0}^{127}a[m]=${capture.mean.toFixed(2)}\ \text{ADC counts}\\w_H[n]&=0.54-0.46\cos\!\left(\frac{2\pi n}{127}\right)\\x[n]&=(a[n]-\mu)w_H[n]\end{aligned}`,
      true,
    );

    renderRepresentativeMatrixRows(matrixRows, capture.prepared);
    const reconstructed = reconstructCoefficient(capture.prepared, frequencyBinIndex);
    updateMath(
      outputVector,
      String.raw`\mathbf{X}=F_{128}\mathbf{x}=\begin{bmatrix}X[0]\\X[1]\\\vdots\\\color{#d8ff52}{X[${frequencyBinIndex}]}\\\vdots\\X[127]\end{bmatrix}\in\mathbb{C}^{128}`,
      true,
    );
    updateMath(
      complexEquation,
      String.raw`\begin{aligned}X_{\mathrm{DFT}}[${frequencyBinIndex}]&=\sum_{n=0}^{127}x[n]e^{-i2\pi(${frequencyBinIndex})n/128}\\&=\sum_{n=0}^{127}x[n]\!\left(\cos\!\frac{2\pi(${frequencyBinIndex})n}{128}-i\sin\!\frac{2\pi(${frequencyBinIndex})n}{128}\right)\\&=${reconstructed.real.toFixed(2)}${signedImaginary(reconstructed.imaginary)}\end{aligned}`,
      true,
    );
    updateMath(
      magnitudeEquation,
      String.raw`|X_{\mathrm{DFT}}[${frequencyBinIndex}]|=\sqrt{(${reconstructed.real.toFixed(2)})^2+(${reconstructed.imaginary.toFixed(2)})^2}=${Math.hypot(reconstructed.real, reconstructed.imaginary).toFixed(2)}`,
      true,
    );

    const contributions = allFourierContributions(capture.prepared, frequencyBinIndex);
    const complexDifference = Math.hypot(
      reconstructed.real - coefficient.real,
      reconstructed.imaginary - coefficient.imaginary,
    );
    coefficientCheck.textContent = `Browser row sum ${reconstructed.real.toFixed(2)} ${signedImaginary(reconstructed.imaginary)} · ESP32 FFT difference ${complexDifference.toFixed(3)}`;
    drawFourierContributionPath(complexCanvas, contributions, contributions.length - 1);
    complexProgress.textContent = `128 of 128 measured terms accumulated · ${speedLabel()}`;
    captureComparison.render(capture, frequencyBinIndex, frequencyHz);

    for (const [channelName, output] of Object.entries(captureBandOutputs)) {
      const band = SIGNAL_CONFIG.bands[channelName];
      output.textContent = `${capture.frame.bands[channelName].toFixed(1)} · bins ${band.firstBin}–${band.lastBin}`;
    }
    const weightedStrengths = {
      red: capture.frame.bands.red * SIGNAL_CONFIG.bands.red.gain,
      green: capture.frame.bands.green * SIGNAL_CONFIG.bands.green.gain,
      blue: capture.frame.bands.blue * SIGNAL_CONFIG.bands.blue.gain,
    };
    const strongestWeightedStrength = Math.max(...Object.values(weightedStrengths));
    const configuredLeakageRatio = SIGNAL_CONFIG.crossBandLeakageRatio;
    const leakageRatio = Number.isFinite(configuredLeakageRatio)
      && configuredLeakageRatio >= 0
      && configuredLeakageRatio < 1
      ? configuredLeakageRatio
      : 0.15;
    const leakageFloor = leakageRatio * strongestWeightedStrength;
    const remainingRange = 1 - leakageRatio;
    const cleanedStrengths = Object.fromEntries(
      Object.entries(weightedStrengths).map(([channel, strength]) => [
        channel,
        Math.max(0, (strength - leakageFloor) / remainingRange),
      ]),
    );
    const rgbEquation = capture.aboveSilenceThreshold
      ? String.raw`\begin{aligned}\mathbf{b}&=\begin{bmatrix}${capture.frame.bands.red.toFixed(1)}\\${capture.frame.bands.green.toFixed(1)}\\${capture.frame.bands.blue.toFixed(1)}\end{bmatrix},\qquad G=\begin{bmatrix}1&0&0\\0&0.82&0\\0&0&0.92\end{bmatrix}\\[4pt]\mathbf{u}=G\mathbf{b}&=\begin{bmatrix}${weightedStrengths.red.toFixed(1)}\\${weightedStrengths.green.toFixed(1)}\\${weightedStrengths.blue.toFixed(1)}\end{bmatrix}\\[4pt]\mathbf{v}&=\max\!\left(\mathbf{0},\frac{\mathbf{u}-0.15\max(\mathbf{u})\mathbf{1}}{0.85}\right)=\begin{bmatrix}${cleanedStrengths.red.toFixed(1)}\\${cleanedStrengths.green.toFixed(1)}\\${cleanedStrengths.blue.toFixed(1)}\end{bmatrix}\\[4pt]\begin{bmatrix}R\\G\\B\end{bmatrix}&=\operatorname{clip}_{0}^{255}\!\left(\left\lceil0.12\mathbf{v}\right\rceil\right)=\begin{bmatrix}${capture.frame.rgb.red}\\${capture.frame.rgb.green}\\${capture.frame.rgb.blue}\end{bmatrix}\end{aligned}`
      : String.raw`\operatorname{RMS}=${capture.frame.rms.toFixed(2)}<${capture.frame.silenceThreshold.toFixed(2)}\quad\Longrightarrow\quad\begin{bmatrix}R\\G\\B\end{bmatrix}=\begin{bmatrix}0\\0\\0\end{bmatrix}\quad\text{(silence gate)}`;
    updateMath(captureRgbEquation, rgbEquation, true);
    const { red, green, blue } = capture.frame.rgb;
    captureRgbSwatch.style.backgroundColor = `rgb(${red}, ${green}, ${blue})`;
    captureRgbSwatch.setAttribute('aria-label', `Captured RGB result: red ${red}, green ${green}, blue ${blue}`);
    captureRgbOutput.textContent = `R ${red} · G ${green} · B ${blue}`;

    if (stageIndex === 2 && previousStage !== 2) playComplexAnimation(capture, frequencyBinIndex);
    if (stageIndex !== 2) stopComplexAnimation();
    previousStage = stageIndex;
  }

  const unsubscribe = store.subscribe(render);
  return {
    render,
    cleanup() {
      stopComplexAnimation();
      unsubscribe();
    },
  };
}
