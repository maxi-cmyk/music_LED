import { SIGNAL_CONFIG, bandRangeHz } from './config.mjs?release=20260924-distill-23';
import { mountCaptureWorkbench } from './capture-workbench.mjs?release=20260925-seeded-frame-1';
import { drawSpectrum, ledDisplayColour } from './visualizations.mjs?release=20260924-distill-23';

export function mount(root, { store, serialSource }) {
  const connectButton = root.querySelector('#connect-serial');
  const disconnectButton = root.querySelector('#disconnect-serial');
  const serialMessage = root.querySelector('#serial-message');
  const spectrumCanvas = root.querySelector('#spectrum-canvas');
  const spectrumSummary = root.querySelector('#spectrum-summary');
  const rgbSwatch = root.querySelector('#rgb-swatch');
  const rgbOutput = root.querySelector('#rgb-output');
  const rgbBrightness = root.querySelector('#rgb-brightness');
  const bandOutputs = {
    red: root.querySelector('#red-strength'),
    green: root.querySelector('#green-strength'),
    blue: root.querySelector('#blue-strength'),
  };
  for (const [channel, band] of Object.entries(SIGNAL_CONFIG.bands)) {
    const { lowHz, highHz } = bandRangeHz(band);
    root.querySelector(`#${channel}-band-range`).textContent = `${lowHz}–${highHz} Hz`;
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const captureWorkbench = mountCaptureWorkbench(root, { store, serialSource, reducedMotion });
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
    drawSpectrum(spectrumCanvas, displayFrame, [], animatedScaleMaximum);
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
    connectButton.disabled = ['requesting', 'waiting', 'live', 'warning'].includes(state.serialStatus);
    disconnectButton.disabled = !serialSource.connected;
    serialMessage.textContent = state.serialMessage;
    serialMessage.dataset.status = state.serialStatus;
    // Once frames are streaming the frame counter is noise; only instructions and errors show.
    serialMessage.hidden = state.serialStatus === 'live';

    updateSpectrum(state, frame);

    const frameStateLabel = state.isFrozen
      ? frame?.source === 'simulation' ? 'Simulated capture' : 'Captured'
      : 'Live';
    spectrumSummary.textContent = frame
      ? `${frameStateLabel} · bar height |X[k]| on a log scale · strongest at ${frame.dominantHz.toFixed(0)} Hz · ${frame.sampleRateHz.toFixed(0)} Hz sample rate`
      : 'Waiting for ESP32 data · bar height will be |X[k]| on a log scale';

    const rgb = frame?.rgb ?? { red: 0, green: 0, blue: 0 };
    const display = ledDisplayColour(rgb);
    rgbSwatch.style.backgroundColor = display.css;
    rgbBrightness.textContent = display.brightnessPercent
      ? `Hue shown at full brightness · LED at ${display.brightnessPercent}%`
      : 'Off';
    const evidenceLabel = frame?.source === 'simulation' ? 'Simulated colour' : 'Measured colour';
    rgbSwatch.setAttribute('aria-label', `${evidenceLabel}: red ${rgb.red}, green ${rgb.green}, blue ${rgb.blue}`);
    rgbOutput.textContent = `R ${rgb.red} · G ${rgb.green} · B ${rgb.blue}`;
    for (const channel of ['red', 'green', 'blue']) {
      bandOutputs[channel].textContent = `strength ${(frame?.bands[channel] ?? 0).toFixed(1)}`;
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
