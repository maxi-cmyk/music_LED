import { FREQUENCIES, PRESETS, SIGNAL_CONFIG } from './config.mjs?release=20260922-capture-3';
import { mountCaptureWorkbench } from './capture-workbench.mjs?release=20260923-comparison-1';
import { updateMath } from './math-renderer.mjs?release=20260922-capture-3';
import { findExpectedPeaks } from './signal-analysis.mjs?release=20260922-capture-3';
import { drawSpectrum, drawWaveComposition } from './visualizations.mjs?release=20260922-capture-3';

function selectionLabel(frequencies) {
  if (!frequencies.length) return 'Silence';
  return frequencies.map((frequencyHz) => {
    const detail = FREQUENCIES.find((item) => item.frequencyHz === frequencyHz);
    return `${detail?.label ?? 'Tone'} · ${frequencyHz} Hz`;
  }).join(' + ');
}

function createPresetButtons(container, onSelect) {
  for (const preset of PRESETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `preset-button ${preset.colourClass}`;
    button.dataset.preset = preset.id;
    button.textContent = preset.label;
    button.addEventListener('click', () => onSelect(preset));
    container.append(button);
  }
}

function frequencyColour(detail) {
  return detail.band === 'leakage'
    ? '#d8ff52'
    : SIGNAL_CONFIG.bands[detail.band].colour;
}

function createFrequencyButtons(container, onToggle) {
  for (const detail of FREQUENCIES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'frequency-button';
    button.dataset.frequencyHz = String(detail.frequencyHz);
    button.style.setProperty('--frequency-colour', frequencyColour(detail));
    const label = document.createElement('strong');
    label.textContent = detail.label;
    const frequency = document.createElement('span');
    frequency.textContent = `${detail.frequencyHz} Hz`;
    button.append(label, frequency);
    button.addEventListener('click', () => onToggle(detail.frequencyHz));
    container.append(button);
  }
}

function toneSample(frequencyHz, sampleIndex) {
  return Math.sin(2 * Math.PI * frequencyHz * sampleIndex / SIGNAL_CONFIG.sampleRateHz);
}

function compositeSample(frequencies, sampleIndex) {
  if (!frequencies.length) return 0;
  return frequencies.reduce(
    (sum, frequencyHz) => sum + toneSample(frequencyHz, sampleIndex),
    0,
  ) / frequencies.length;
}

function formatSample(value) {
  const rounded = Math.abs(value) < 0.0005 ? 0 : value;
  return rounded.toFixed(3);
}

function joinedSampleValues(values) {
  return values.map((value, index) => {
    const formatted = formatSample(Math.abs(value));
    if (index === 0) return value < 0 ? `-${formatted}` : formatted;
    return value < 0 ? `-${formatted}` : `+${formatted}`;
  }).join('');
}

function sampleSumLatex(frequencies, sampleIndex) {
  if (!frequencies.length) return `x[${sampleIndex}]=0\\quad\\text{(no components selected)}`;
  const symbols = frequencies.map((frequencyHz) => `x_{${frequencyHz}}[${sampleIndex}]`);
  const values = frequencies.map((frequencyHz) => toneSample(frequencyHz, sampleIndex));
  const divisor = frequencies.length > 1 ? `\\frac{1}{${frequencies.length}}` : '';
  return String.raw`x[${sampleIndex}]=${divisor}\left(${symbols.join('+')}\right)=${divisor}\left(${joinedSampleValues(values)}\right)=${formatSample(compositeSample(frequencies, sampleIndex))}`;
}

function vectorWindowLatex(frequencies, sampleIndex) {
  const start = Math.max(0, Math.min(SIGNAL_CONFIG.sampleCount - 5, sampleIndex - 2));
  const entries = Array.from({ length: 5 }, (_, offset) => {
    const index = start + offset;
    const value = formatSample(compositeSample(frequencies, index));
    return index === sampleIndex ? `\\color{#d8ff52}{\\mathbf{${value}}}` : value;
  });
  return String.raw`\mathbf{x}=\begin{bmatrix}\cdots&${entries.join('&')}&\cdots\end{bmatrix}^{\mathsf T}\in\mathbb{R}^{128}`;
}

function renderExpectedResults(container, frame, frequencies) {
  container.replaceChildren();
  if (!frequencies.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Silence selected. The LED should turn off when the room is below the measured gate.';
    container.append(empty);
    return;
  }
  if (!frame) {
    const empty = document.createElement('p');
    empty.textContent = 'Connect the ESP32 to compare each selected tone with a measured peak.';
    container.append(empty);
    return;
  }

  for (const result of findExpectedPeaks(frame.magnitudes, frequencies)) {
    const item = document.createElement('article');
    item.className = `peak-result ${result.isLeakageExample ? 'leakage-result' : result.withinOneBin ? 'pass-result' : 'check-result'}`;
    const title = document.createElement('strong');
    const resultNoun = frame.source === 'simulation' ? 'simulated' : 'measured';
    title.textContent = result.isLeakageExample
      ? `${result.frequencyHz} Hz spreads between measured frequencies`
      : `${result.frequencyHz} Hz → ${resultNoun} ${result.observedHz} Hz`;
    const detail = document.createElement('span');
    detail.textContent = result.isLeakageExample
      ? 'Expected leakage: energy should occupy neighbouring bars.'
      : result.withinOneBin
        ? `Within one 50 Hz step · ${result.errorHz >= 0 ? '+' : ''}${result.errorHz} Hz`
        : `Outside the one-step target · ${result.errorHz >= 0 ? '+' : ''}${result.errorHz} Hz`;
    item.append(title, detail);
    container.append(item);
  }
}

export function mount(root, { store, audioController, serialSource }) {
  const frequencyList = root.querySelector('#frequency-list');
  const presetList = root.querySelector('#preset-list');
  const selectionSummary = root.querySelector('#selection-summary');
  const volumeControl = root.querySelector('#volume-control');
  const volumeReadout = root.querySelector('#volume-readout');
  const playButton = root.querySelector('#play-button');
  const stopButton = root.querySelector('#stop-button');
  const muteButton = root.querySelector('#mute-button');
  const audioMessage = root.querySelector('#audio-message');
  const componentCanvas = root.querySelector('#component-canvas');
  const compositeCanvas = root.querySelector('#composite-canvas');
  const composerSelection = root.querySelector('#composer-selection');
  const sampleIndex = root.querySelector('#sample-index');
  const sampleIndexOutput = root.querySelector('#sample-index-output');
  const sampleSumEquation = root.querySelector('#sample-sum-equation');
  const vectorWindowEquation = root.querySelector('#vector-window-equation');
  const connectButton = root.querySelector('#connect-serial');
  const disconnectButton = root.querySelector('#disconnect-serial');
  const serialMessage = root.querySelector('#serial-message');
  const scaleMode = root.querySelector('#scale-mode');
  const resetScaleButton = root.querySelector('#reset-scale-button');
  const spectrumCanvas = root.querySelector('#spectrum-canvas');
  const spectrumSummary = root.querySelector('#spectrum-summary');
  const expectedResults = root.querySelector('#expected-results');
  const rgbSwatch = root.querySelector('#rgb-swatch');
  const rgbOutput = root.querySelector('#rgb-output');
  const bandOutputs = {
    red: root.querySelector('#red-strength'),
    green: root.querySelector('#green-strength'),
    blue: root.querySelector('#blue-strength'),
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const captureWorkbench = mountCaptureWorkbench(root, { store, serialSource, reducedMotion });
  let animationFrameId = null;
  let previousAnimationTime = 0;
  let targetFrame = null;
  let displayedMagnitudes = [];
  let targetMagnitudes = [];
  let animatedScaleMaximum = 1;
  let fixedScaleMaximum = 1;

  const updateSelection = (frequencies, activePreset = null) => {
    store.patch({ selectedFrequencies: [...frequencies], activePreset });
    audioController.setSelection(frequencies);
  };

  createPresetButtons(presetList, (preset) => updateSelection(preset.frequencies, preset.id));
  createFrequencyButtons(frequencyList, (frequencyHz) => {
    const selected = new Set(store.get().selectedFrequencies);
    if (selected.has(frequencyHz)) selected.delete(frequencyHz);
    else selected.add(frequencyHz);
    const ordered = FREQUENCIES
      .map((detail) => detail.frequencyHz)
      .filter((candidate) => selected.has(candidate));
    updateSelection(ordered, null);
  });

  playButton.addEventListener('click', () => audioController.play());
  stopButton.addEventListener('click', () => audioController.stop());
  muteButton.addEventListener('click', () => audioController.setMuted(!store.get().isMuted));
  volumeControl.addEventListener('input', () => audioController.setVolume(Number(volumeControl.value)));
  sampleIndex.addEventListener('input', () => render(store.get()));
  connectButton.addEventListener('click', async () => {
    try {
      await serialSource.connect();
    } catch (error) {
      const message = error.name === 'NotFoundError'
        ? 'No port selected. Choose Connect ESP32 when ready.'
        : `Could not open the ESP32 port: ${error.message}`;
      store.patch({ serialStatus: 'error', serialMessage: message });
    }
  });
  disconnectButton.addEventListener('click', () => serialSource.disconnect());
  scaleMode.addEventListener('change', () => {
    if (scaleMode.value === 'fixed') fixedScaleMaximum = animatedScaleMaximum;
    store.patch({ scaleMode: scaleMode.value });
  });
  resetScaleButton.addEventListener('click', () => {
    animatedScaleMaximum = 1;
    fixedScaleMaximum = 1;
    store.patch({ scaleMaximum: 1 });
  });

  const drawAnimatedSpectrum = (state, frame, magnitudes) => {
    const displayFrame = frame ? { ...frame, magnitudes } : null;
    const requestedMaximum = state.scaleMode === 'fixed'
      ? fixedScaleMaximum
      : animatedScaleMaximum;
    drawSpectrum(spectrumCanvas, displayFrame, state.selectedFrequencies, requestedMaximum);
  };

  const animateSpectrum = (timestamp) => {
    const state = store.get();
    if (!targetFrame || state.isFrozen) {
      animationFrameId = null;
      previousAnimationTime = 0;
      return;
    }
    const elapsedMilliseconds = previousAnimationTime
      ? Math.min(50, timestamp - previousAnimationTime)
      : 16;
    previousAnimationTime = timestamp;
    let largestDifference = 0;
    displayedMagnitudes = targetMagnitudes.map((targetMagnitude, binIndex) => {
      const displayedMagnitude = displayedMagnitudes[binIndex] ?? 0;
      const timeConstant = targetMagnitude >= displayedMagnitude ? 105 : 520;
      const blend = 1 - Math.exp(-elapsedMilliseconds / timeConstant);
      const nextMagnitude = displayedMagnitude + (targetMagnitude - displayedMagnitude) * blend;
      largestDifference = Math.max(largestDifference, Math.abs(targetMagnitude - nextMagnitude));
      return nextMagnitude;
    });
    const visibleMaximum = Math.max(1, ...displayedMagnitudes.slice(1));
    const scaleDecay = Math.exp(-elapsedMilliseconds / 1900);
    animatedScaleMaximum = Math.max(visibleMaximum, animatedScaleMaximum * scaleDecay, 1);
    drawAnimatedSpectrum(state, targetFrame, displayedMagnitudes);

    if (largestDifference > 0.35) {
      animationFrameId = window.requestAnimationFrame(animateSpectrum);
    } else {
      displayedMagnitudes = [...targetMagnitudes];
      drawAnimatedSpectrum(state, targetFrame, displayedMagnitudes);
      animationFrameId = null;
      previousAnimationTime = 0;
    }
  };

  const updateSpectrum = (state, frame) => {
    if (!frame) {
      targetFrame = null;
      displayedMagnitudes = [];
      targetMagnitudes = [];
      drawAnimatedSpectrum(state, null, []);
      return;
    }
    const frameChanged = frame !== targetFrame;
    targetFrame = frame;
    if (frameChanged) targetMagnitudes = [...frame.magnitudes];

    if (state.isFrozen || frame.source !== 'esp32' || reducedMotion.matches) {
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
      previousAnimationTime = 0;
      displayedMagnitudes = [...targetMagnitudes];
      animatedScaleMaximum = Math.max(1, ...displayedMagnitudes.slice(1));
      drawAnimatedSpectrum(state, frame, displayedMagnitudes);
      return;
    }
    if (!displayedMagnitudes.length) displayedMagnitudes = new Array(targetMagnitudes.length).fill(0);
    if (!animationFrameId) animationFrameId = window.requestAnimationFrame(animateSpectrum);
  };

  const render = (state) => {
    const frame = state.isFrozen ? state.frozenFrame : state.analysisFrame;
    const evidenceFrequencies = state.isFrozen && state.capturedEvidence
      ? state.capturedEvidence.frequencies
      : state.selectedFrequencies;
    selectionSummary.textContent = selectionLabel(state.selectedFrequencies);
    volumeControl.value = state.volumePercent;
    volumeReadout.textContent = `${state.volumePercent}%`;
    playButton.disabled = state.isPlaying;
    stopButton.disabled = !state.isPlaying;
    muteButton.disabled = !state.isPlaying;
    muteButton.textContent = state.isMuted ? 'Unmute audio' : 'Mute audio';
    muteButton.setAttribute('aria-pressed', String(state.isMuted));
    audioMessage.textContent = state.audioMessage;
    connectButton.disabled = ['requesting', 'waiting', 'live', 'warning'].includes(state.serialStatus);
    disconnectButton.disabled = !serialSource.connected;
    serialMessage.textContent = state.serialMessage;
    serialMessage.dataset.status = state.serialStatus;
    scaleMode.value = state.scaleMode;

    presetList.querySelectorAll('button').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.preset === state.activePreset));
    });
    frequencyList.querySelectorAll('button').forEach((button) => {
      button.setAttribute(
        'aria-pressed',
        String(state.selectedFrequencies.includes(Number(button.dataset.frequencyHz))),
      );
    });

    const selectedSampleIndex = Number(sampleIndex.value);
    drawWaveComposition(
      componentCanvas,
      compositeCanvas,
      state.selectedFrequencies,
      selectedSampleIndex,
    );
    composerSelection.textContent = state.selectedFrequencies.length
      ? `${state.selectedFrequencies.join(' + ')} Hz selected`
      : 'No frequencies selected';
    updateMath(sampleIndexOutput, `n=${selectedSampleIndex}`);
    updateMath(sampleSumEquation, sampleSumLatex(state.selectedFrequencies, selectedSampleIndex), true);
    updateMath(vectorWindowEquation, vectorWindowLatex(state.selectedFrequencies, selectedSampleIndex), true);

    updateSpectrum({ ...state, selectedFrequencies: evidenceFrequencies }, frame);

    const frameStateLabel = state.isFrozen
      ? frame?.source === 'simulation' ? 'Simulated capture' : 'Captured'
      : 'Live';
    spectrumSummary.textContent = frame
      ? `${frameStateLabel} · dominant ${frame.dominantHz.toFixed(0)} Hz · sample rate ${frame.sampleRateHz.toFixed(1)} Hz`
      : 'Waiting for ESP32 data';
    renderExpectedResults(expectedResults, frame, evidenceFrequencies);

    const rgb = frame?.rgb ?? { red: 0, green: 0, blue: 0 };
    rgbSwatch.style.backgroundColor = `rgb(${rgb.red}, ${rgb.green}, ${rgb.blue})`;
    const evidenceLabel = frame?.source === 'simulation' ? 'Simulated colour' : 'Measured colour';
    rgbSwatch.setAttribute('aria-label', `${evidenceLabel}: red ${rgb.red}, green ${rgb.green}, blue ${rgb.blue}`);
    rgbOutput.textContent = `R ${rgb.red} · G ${rgb.green} · B ${rgb.blue}`;
    for (const channel of ['red', 'green', 'blue']) {
      bandOutputs[channel].textContent = `${(frame?.bands[channel] ?? 0).toFixed(1)} · PWM ${rgb[channel]}`;
    }
  };

  const unsubscribe = store.subscribe(render);
  const onResize = () => render(store.get());
  window.addEventListener('resize', onResize);
  return () => {
    if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    captureWorkbench.cleanup();
    unsubscribe();
    window.removeEventListener('resize', onResize);
  };
}
