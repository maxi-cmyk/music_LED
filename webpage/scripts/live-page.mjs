import { mountCaptureWorkbench } from './capture-workbench.mjs?release=20261023-fft-steps-20';
import { mountHalvingTree } from './fft-halving-tree.mjs?release=20261023-fft-steps-20';
import { mountFftStepper } from './fft-stepper.mjs?release=20261023-fft-steps-20';
import { drawSpectrum, ledDisplayColour, spectrumBinAtPosition } from './visualizations.mjs?release=20261023-fft-steps-20';

export function mount(root, { store, serialSource }) {
  const connectButton = root.querySelector('#connect-serial');
  const disconnectButton = root.querySelector('#disconnect-serial');
  const serialMessage = root.querySelector('#serial-message');
  const spectrumCanvas = root.querySelector('#spectrum-canvas');
  const spectrumSummary = root.querySelector('#spectrum-summary');
  const spectrumTooltip = root.querySelector('#spectrum-tooltip');
  const colourPanel = root.querySelector('#spectrum-colour');
  const colourSwatch = root.querySelector('#spectrum-colour-swatch');
  const colourTitle = root.querySelector('#spectrum-colour-title');
  const colourDetail = root.querySelector('#spectrum-colour-detail');
  const colourChannels = [...colourPanel.querySelectorAll('[data-channel]')];
  let hoveredBin = null;
  let pointerPosition = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const captureWorkbench = mountCaptureWorkbench(root, { store, serialSource, reducedMotion });
  const halvingTree = mountHalvingTree(root, { reducedMotion });
  const FFT_TREE_PANEL = 3;
  const cleanupFftStepper = mountFftStepper(root, {
    onShow: (panelIndex) => { if (panelIndex === FFT_TREE_PANEL) halvingTree.play(); else halvingTree.stop(); },
  });
  let animationFrameId = null;
  let previousAnimationTime = 0;
  let targetFrame = null;
  let displayedMagnitudes = [];
  let targetMagnitudes = [];
  let animatedScaleMaximum = 1;

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

  const drawAnimatedSpectrum = (state, frame, magnitudes) => {
    const displayFrame = frame ? { ...frame, magnitudes } : null;
    drawSpectrum(spectrumCanvas, displayFrame, [], animatedScaleMaximum, hoveredBin);
    updateTooltip(displayFrame);
  };

  const updateTooltip = (displayFrame) => {
    const magnitudes = displayFrame?.magnitudes;
    if (hoveredBin === null || !magnitudes || hoveredBin >= magnitudes.length || !pointerPosition) {
      spectrumTooltip.hidden = true;
      return;
    }
    const frequencyHz = hoveredBin * displayFrame.sampleRateHz / (2 * (magnitudes.length - 1));
    spectrumTooltip.textContent = `${frequencyHz.toFixed(0)} Hz · bin ${hoveredBin} · |X_${hoveredBin}| = ${magnitudes[hoveredBin].toFixed(1)}`;
    spectrumTooltip.hidden = false;
    const stage = spectrumCanvas.parentElement.getBoundingClientRect();
    const tooltipWidth = spectrumTooltip.offsetWidth;
    const left = Math.min(Math.max(pointerPosition.x - stage.left + 14, 4), stage.width - tooltipWidth - 4);
    spectrumTooltip.style.left = `${left}px`;
    spectrumTooltip.style.top = `${Math.max(pointerPosition.y - stage.top - 34, 4)}px`;
  };

  const onPointerMove = (event) => {
    const magnitudes = (store.get().isFrozen ? store.get().frozenFrame : store.get().analysisFrame)?.magnitudes;
    hoveredBin = magnitudes ? spectrumBinAtPosition(spectrumCanvas, event.clientX, magnitudes.length) : null;
    pointerPosition = { x: event.clientX, y: event.clientY };
    render(store.get());
  };
  const onPointerLeave = () => {
    hoveredBin = null;
    pointerPosition = null;
    render(store.get());
  };
  spectrumCanvas.addEventListener('pointermove', onPointerMove);
  spectrumCanvas.addEventListener('pointerleave', onPointerLeave);

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

  const updateColourReadout = (frame, isFrozen) => {
    if (!frame?.rgb) {
      colourPanel.hidden = true;
      return;
    }
    const { css, brightnessPercent } = ledDisplayColour(frame.rgb);
    colourPanel.hidden = false;
    colourSwatch.style.backgroundColor = css;
    colourSwatch.setAttribute('aria-label', `LED colour: red ${frame.rgb.red}, green ${frame.rgb.green}, blue ${frame.rgb.blue}`);
    colourTitle.textContent = isFrozen ? 'Captured colour' : 'Live colour';
    colourDetail.textContent = `LED brightness ${brightnessPercent}%`;
    for (const row of colourChannels) {
      const value = frame.rgb[row.dataset.channel];
      row.querySelector('.spectrum-colour-bar span').style.width = `${(value / 255) * 100}%`;
      row.querySelector('output').textContent = String(value);
    }
  };

  const render = (state) => {
    const frame = state.isFrozen ? state.frozenFrame : state.analysisFrame;
    connectButton.disabled = ['requesting', 'waiting', 'live', 'warning'].includes(state.serialStatus);
    disconnectButton.disabled = !serialSource.connected;
    serialMessage.textContent = state.serialMessage;
    serialMessage.dataset.status = state.serialStatus;
    // Once frames are streaming the frame counter is noise; only instructions and errors show.
    serialMessage.hidden = state.serialStatus === 'live';

    updateSpectrum(state, frame);
    updateColourReadout(frame, state.isFrozen);

    const frameStateLabel = state.isFrozen
      ? frame?.source === 'simulation' ? 'Simulated capture' : 'Captured'
      : 'Live';
    spectrumSummary.textContent = frame
      ? `${frameStateLabel} · bar height |X_k| on a log scale · strongest at ${frame.dominantHz.toFixed(0)} Hz · ${frame.sampleRateHz.toFixed(0)} Hz sample rate`
      : 'Waiting for ESP32 data · bar height will be |X_k| on a log scale';

  };

  const unsubscribe = store.subscribe(render);
  const onResize = () => render(store.get());
  window.addEventListener('resize', onResize);
  return () => {
    if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    captureWorkbench.cleanup();
    cleanupFftStepper();
    halvingTree.cleanup();
    unsubscribe();
    window.removeEventListener('resize', onResize);
    spectrumCanvas.removeEventListener('pointermove', onPointerMove);
    spectrumCanvas.removeEventListener('pointerleave', onPointerLeave);
  };
}
