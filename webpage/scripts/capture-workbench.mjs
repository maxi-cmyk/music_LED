import { SIGNAL_CONFIG } from './config.mjs?release=20260924-distill-23';
import { reconstructCoefficient } from './capture-analysis.mjs?release=20260924-distill-23';
import { mountCaptureComparison } from './capture-comparison.mjs?release=20260924-distill-23';
import { updateMath } from './math-renderer.mjs?release=20260924-distill-23';
import { allFourierContributions } from './vector-workbench.mjs?release=20260924-distill-23';
import { drawFourierContributionPath, drawSampleVector, ledDisplayColour } from './visualizations.mjs?release=20260924-distill-23';

const STAGE_COUNT = 4;
const DFT_STAGE = 1;
const ANIMATION_DURATION_MILLISECONDS = 7800;
const NEXT_STAGE_LABELS = Object.freeze([
  'Show direct DFT',
  'Show colour mapping',
  'Show FFT',
  'Exit capture',
]);

function signedImaginary(value) {
  return value < 0 ? `-${Math.abs(value).toFixed(2)}i` : `+${value.toFixed(2)}i`;
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
  const binSelect = root.querySelector('#capture-bin-select');
  const binPreviousButton = root.querySelector('#capture-bin-previous');
  const binNextButton = root.querySelector('#capture-bin-next');
  const binOutput = root.querySelector('#capture-bin-output');
  const rawCanvas = root.querySelector('#capture-raw-canvas');
  const preparedCanvas = root.querySelector('#capture-prepared-canvas');
  const complexCanvas = root.querySelector('#capture-complex-canvas');
  const preparationEquation = root.querySelector('#capture-preparation-equation');
  const complexEquation = root.querySelector('#capture-complex-equation');
  const complexProgress = root.querySelector('#complex-progress');
  const captureRgbEquation = root.querySelector('#capture-rgb-equation');
  const colourSteps = root.querySelector('#colour-steps');
  const colourStepBands = root.querySelector('#colour-step-bands');
  const colourStepGains = root.querySelector('#colour-step-gains');
  const colourStepLeakage = root.querySelector('#colour-step-leakage');
  const colourStepPwm = root.querySelector('#colour-step-pwm');
  const colourStepConstant = root.querySelector('#colour-step-constant');
  const captureRgbSwatch = root.querySelector('#capture-rgb-swatch');
  const captureRgbOutput = root.querySelector('#capture-rgb-output');
  const captureComparison = mountCaptureComparison(root);
  let complexAnimationFrame = null;
  let previousStage = null;
  let previousBin = null;
  const captureApiAvailable = typeof serialSource.requestCapture === 'function';

  function stopComplexAnimation() {
    if (complexAnimationFrame) cancelAnimationFrame(complexAnimationFrame);
    complexAnimationFrame = null;
  }

  function playComplexAnimation(capture, frequencyBinIndex) {
    stopComplexAnimation();
    const contributions = allFourierContributions(capture.prepared, frequencyBinIndex);
    if (reducedMotion.matches) {
      drawFourierContributionPath(complexCanvas, contributions, contributions.length - 1);
      complexProgress.textContent = '128 of 128 terms';
      return;
    }
    const startedAt = performance.now();
    const drawFrame = (now) => {
      const progress = Math.min(1, (now - startedAt) / ANIMATION_DURATION_MILLISECONDS);
      const visibleTerms = Math.max(1, Math.ceil(progress * contributions.length));
      drawFourierContributionPath(
        complexCanvas,
        contributions.slice(0, visibleTerms),
        visibleTerms - 1,
      );
      complexProgress.textContent = `${visibleTerms} of 128 terms`;
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
    const binSpacingHz = capture.frame.sampleRateHz / SIGNAL_CONFIG.sampleCount;
    const frequencyHz = frequencyBinIndex * binSpacingHz;
    sourceLabel.textContent = capture.aboveSilenceThreshold
      ? capture.sourceLabel
      : `${capture.sourceLabel} · below the LED silence gate`;
    captureMeta.textContent = `${capture.id} · 128 samples · ${(capture.sampleSpanMicroseconds / 1000).toFixed(1)} ms · ${capture.frame.sampleRateHz.toFixed(0)} Hz sample rate`;
    binSelect.value = String(frequencyBinIndex);
    binOutput.textContent = `Bin ${frequencyBinIndex} · ${frequencyHz.toFixed(1)} Hz`;
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

    const reconstructed = reconstructCoefficient(capture.prepared, frequencyBinIndex);
    updateMath(
      complexEquation,
      String.raw`\begin{aligned}X[${frequencyBinIndex}]&=\sum_{n=0}^{127}x[n]\,e^{-i2\pi(${frequencyBinIndex})n/128}=${reconstructed.real.toFixed(2)}${signedImaginary(reconstructed.imaginary)}\\|X[${frequencyBinIndex}]|&=${Math.hypot(reconstructed.real, reconstructed.imaginary).toFixed(2)}\end{aligned}`,
      true,
    );
    const contributions = allFourierContributions(capture.prepared, frequencyBinIndex);
    if (!complexAnimationFrame) {
      drawFourierContributionPath(complexCanvas, contributions, contributions.length - 1);
      complexProgress.textContent = '128 of 128 terms';
    }
    captureComparison.render(capture, frequencyBinIndex, frequencyHz);

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
    const column = (values) => String.raw`\begin{bmatrix}${values.join(String.raw`\\`)}\end{bmatrix}`;
    const channels = ['red', 'green', 'blue'];
    const fullScaleStrength = SIGNAL_CONFIG.maximumBrightness / SIGNAL_CONFIG.brightnessPerMagnitudeUnit;
    const leakageRemoved = channels.map((channel) => Math.max(0, weightedStrengths[channel] - leakageFloor));
    const isAboveGate = capture.aboveSilenceThreshold;
    colourSteps.hidden = !isAboveGate;
    captureRgbEquation.hidden = isAboveGate;
    if (isAboveGate) {
      updateMath(
        colourStepBands,
        String.raw`\mathbf{b}=${column(channels.map((channel) => capture.frame.bands[channel].toFixed(1)))}\begin{matrix}\leftarrow\text{bass}\\\leftarrow\text{mids}\\\leftarrow\text{treble}\end{matrix}`,
        true,
      );
      updateMath(
        colourStepGains,
        String.raw`\mathbf{u}=G\mathbf{b}=\begin{bmatrix}${SIGNAL_CONFIG.bands.red.gain}&0&0\\0&${SIGNAL_CONFIG.bands.green.gain}&0\\0&0&${SIGNAL_CONFIG.bands.blue.gain}\end{bmatrix}\mathbf{b}=${column(channels.map((channel) => weightedStrengths[channel].toFixed(1)))}`,
        true,
      );
      updateMath(
        colourStepLeakage,
        String.raw`\begin{aligned}t&=${leakageRatio}\times\max(\mathbf{u})=${leakageRatio}\times${strongestWeightedStrength.toFixed(1)}=${leakageFloor.toFixed(1)}\\\mathbf{v}&=\frac{\max(0,\;\mathbf{u}-t)}{${remainingRange.toFixed(2)}}=\frac{1}{${remainingRange.toFixed(2)}}${column(leakageRemoved.map((value) => value.toFixed(1)))}=${column(channels.map((channel) => cleanedStrengths[channel].toFixed(1)))}\end{aligned}`,
        true,
      );
      updateMath(
        colourStepPwm,
        String.raw`\begin{bmatrix}R\\G\\B\end{bmatrix}=\operatorname{clip}_{0}^{255}\!\left(\left\lceil c\,\mathbf{v}\right\rceil\right)=${column(channels.map((channel) => capture.frame.rgb[channel]))}`,
        true,
      );
      updateMath(colourStepConstant, String.raw`c=\tfrac{255}{${fullScaleStrength.toFixed(0)}}\approx${SIGNAL_CONFIG.brightnessPerMagnitudeUnit}`);
    } else {
      updateMath(
        captureRgbEquation,
        String.raw`\operatorname{RMS}=${capture.frame.rms.toFixed(2)}<${capture.frame.silenceThreshold.toFixed(2)}\quad\Longrightarrow\quad\begin{bmatrix}R\\G\\B\end{bmatrix}=\begin{bmatrix}0\\0\\0\end{bmatrix}\quad\text{(silence gate)}`,
        true,
      );
    }
    const { red, green, blue } = capture.frame.rgb;
    captureRgbSwatch.style.backgroundColor = ledDisplayColour(capture.frame.rgb).css;
    captureRgbSwatch.setAttribute('aria-label', `Captured RGB result: red ${red}, green ${green}, blue ${blue}`);
    captureRgbOutput.textContent = `R ${red} · G ${green} · B ${blue}`;

    if (stageIndex === DFT_STAGE && (previousStage !== DFT_STAGE || previousBin !== frequencyBinIndex)) {
      playComplexAnimation(capture, frequencyBinIndex);
    }
    if (stageIndex !== DFT_STAGE) stopComplexAnimation();
    previousStage = stageIndex;
    previousBin = frequencyBinIndex;
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
