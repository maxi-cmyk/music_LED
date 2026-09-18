import { SIGNAL_CONFIG } from './signal-analysis.mjs?v=analysis-lab-1';
import { Esp32SerialSource } from './serial-source.mjs?v=analysis-lab-1';

const frequencyInputs = [...document.querySelectorAll('input[name="frequency"]')];
const volumeInput = document.querySelector('#volume');
const volumeReadout = document.querySelector('#volume-readout');
const activeReadout = document.querySelector('#active-readout');
const playButton = document.querySelector('#play');
const stopButton = document.querySelector('#stop');
const statusText = document.querySelector('#status-text');
const statusLight = document.querySelector('#status-light');
const canvas = document.querySelector('#scope-canvas');
const canvasContext = canvas.getContext('2d');
const componentReadout = document.querySelector('#component-readout');
const componentCanvas = document.querySelector('#component-canvas');
const componentContext = componentCanvas.getContext('2d');
const connectSerialButton = document.querySelector('#connect-serial');
const disconnectSerialButton = document.querySelector('#disconnect-serial');
const analysisStatus = document.querySelector('#analysis-status');
const spectrumCanvas = document.querySelector('#spectrum-canvas');
const spectrumContext = spectrumCanvas.getContext('2d');
const spectrumSummary = document.querySelector('#spectrum-summary');
const colourResultLabel = document.querySelector('#colour-result-label');
const rgbSwatch = document.querySelector('#rgb-swatch');
const rgbOutput = document.querySelector('#rgb-output');
const metricSource = document.querySelector('#metric-source');
const metricSampleRate = document.querySelector('#metric-sample-rate');
const metricRms = document.querySelector('#metric-rms');
const metricNoiseFloor = document.querySelector('#metric-noise-floor');
const metricDominantBin = document.querySelector('#metric-dominant-bin');
const bandOutputs = {
  red: document.querySelector('#red-strength'),
  green: document.querySelector('#green-strength'),
  blue: document.querySelector('#blue-strength'),
};
const bandMeters = {
  red: document.querySelector('#red-meter'),
  green: document.querySelector('#green-meter'),
  blue: document.querySelector('#blue-meter'),
};

const frequencyDetails = {
  200: { detail: 'bin 4 · red', band: 'red', colour: '#ff5b45' },
  225: { detail: 'between bins 4–5 · leakage', band: 'leakage', colour: '#d8ff52' },
  500: { detail: 'bin 10 · green', band: 'green', colour: '#91e75c' },
  1000: { detail: 'bin 20 · green', band: 'green', colour: '#91e75c' },
  2000: { detail: 'bin 40 · blue', band: 'blue', colour: '#5cbcff' },
};

let audioContext;
let masterGain;
let activeOscillators = [];
let isPlaying = false;
let animationFrame;
let currentAnalysisFrame;
let lastLiveFrameAt = 0;
let displayedSpectrumMagnitudes = new Array(SIGNAL_CONFIG.nyquistBin + 1).fill(0);
let targetSpectrumMagnitudes = [...displayedSpectrumMagnitudes];
let spectrumScaleMaximum = 1;
let spectrumAnimationFrame;
let previousSpectrumAnimationTime = 0;

const serialSource = new Esp32SerialSource({
  onFrame: (frame) => {
    lastLiveFrameAt = performance.now();
    renderAnalysisFrame(frame);
    setSerialStatus('live', `Live ESP32 frame ${frame.sequence} · measured PWM output.`);
  },
  onStatus: setSerialStatus,
});

function selectedFrequencies() {
  return frequencyInputs.filter((input) => input.checked).map((input) => Number(input.value));
}

function updateReadouts() {
  const frequencies = selectedFrequencies();
  volumeReadout.textContent = `${volumeInput.value}%`;
  activeReadout.textContent = frequencies.length
    ? `${frequencies.join(' + ')} Hz selected`
    : 'No frequency selected';
  playButton.disabled = frequencies.length === 0 || isPlaying;
  updateComponentReadout(frequencies);
}

function updateComponentReadout(frequencies) {
  componentCanvas.style.height = `${Math.max(104, frequencies.length * 76)}px`;
  if (!frequencies.length) {
    const emptyState = document.createElement('span');
    emptyState.className = 'component-empty';
    emptyState.textContent = 'Select one or more tones below';
    componentReadout.replaceChildren(emptyState);
    componentCanvas.setAttribute('aria-label', 'No constituent frequency waveforms selected');
    return;
  }

  const components = frequencies.map((frequency) => {
    const details = frequencyDetails[frequency];
    const component = document.createElement('span');
    component.className = `component-frequency ${details.band}`;

    const value = document.createElement('strong');
    value.textContent = `${frequency} Hz`;
    const description = document.createElement('small');
    description.textContent = details.detail;
    component.append(value, description);
    return component;
  });
  componentReadout.replaceChildren(...components);
  componentCanvas.setAttribute(
    'aria-label',
    `Individual waveforms for ${frequencies.join(', ')} hertz`,
  );
}

function drawConstituentWaves(frequencies, timeOffset) {
  resizeCanvasForDisplay(componentCanvas);
  const width = componentCanvas.width;
  const height = componentCanvas.height;
  const pixelRatio = window.devicePixelRatio || 1;

  componentContext.clearRect(0, 0, width, height);
  componentContext.fillStyle = '#0a0b09';
  componentContext.fillRect(0, 0, width, height);

  if (!frequencies.length) {
    componentContext.fillStyle = '#73786b';
    componentContext.font = `${12 * pixelRatio}px "SFMono-Regular", monospace`;
    componentContext.fillText('Select tones below to reveal their individual waves', 14 * pixelRatio, 30 * pixelRatio);
    return;
  }

  const laneHeight = height / frequencies.length;
  const labelWidth = Math.min(154 * pixelRatio, width * 0.3);
  const plotWidth = Math.max(1, width - labelWidth);

  frequencies.forEach((frequency, laneIndex) => {
    const details = frequencyDetails[frequency];
    const laneTop = laneIndex * laneHeight;
    const laneMiddle = laneTop + laneHeight / 2;

    componentContext.strokeStyle = '#272b24';
    componentContext.lineWidth = 1;
    componentContext.beginPath();
    componentContext.moveTo(0, laneTop);
    componentContext.lineTo(width, laneTop);
    componentContext.stroke();
    componentContext.beginPath();
    componentContext.moveTo(labelWidth, laneMiddle);
    componentContext.lineTo(width, laneMiddle);
    componentContext.stroke();
    for (let column = 0; column <= 8; column += 1) {
      const x = labelWidth + (column / 8) * plotWidth;
      componentContext.beginPath();
      componentContext.moveTo(x, laneTop);
      componentContext.lineTo(x, laneTop + laneHeight);
      componentContext.stroke();
    }

    componentContext.fillStyle = details.colour;
    componentContext.font = `600 ${13 * pixelRatio}px "SFMono-Regular", monospace`;
    componentContext.fillText(`${frequency} Hz`, 14 * pixelRatio, laneMiddle - 4 * pixelRatio);
    componentContext.fillStyle = '#9d9a91';
    componentContext.font = `${10 * pixelRatio}px "SFMono-Regular", monospace`;
    componentContext.fillText(details.detail, 14 * pixelRatio, laneMiddle + 14 * pixelRatio);

    componentContext.strokeStyle = details.colour;
    componentContext.lineWidth = Math.max(1.5 * pixelRatio, 2);
    componentContext.beginPath();
    for (let x = labelWidth; x < width; x += 2 * pixelRatio) {
      const normalizedTime = (x - labelWidth) / plotWidth / 180;
      const amplitude = Math.sin(2 * Math.PI * frequency * (normalizedTime + timeOffset));
      const y = laneMiddle - amplitude * laneHeight * 0.31;
      if (x === labelWidth) componentContext.moveTo(x, y);
      else componentContext.lineTo(x, y);
    }
    componentContext.stroke();
  });
}

function spectrumColour(binIndex) {
  if (binIndex >= SIGNAL_CONFIG.bands.red.firstBin && binIndex <= SIGNAL_CONFIG.bands.red.lastBin) return '#ff5b45';
  if (binIndex >= SIGNAL_CONFIG.bands.green.firstBin && binIndex <= SIGNAL_CONFIG.bands.green.lastBin) return '#91e75c';
  if (binIndex >= SIGNAL_CONFIG.bands.blue.firstBin && binIndex <= SIGNAL_CONFIG.bands.blue.lastBin) return '#5cbcff';
  return '#666b61';
}

function formatFftMagnitude(magnitude) {
  if (magnitude >= 10000) return `${(magnitude / 1000).toFixed(0)}k`;
  if (magnitude >= 1000) return `${(magnitude / 1000).toFixed(1)}k`;
  if (magnitude >= 100) return magnitude.toFixed(0);
  if (magnitude >= 10) return magnitude.toFixed(1);
  return magnitude.toFixed(magnitude > 0 ? 1 : 0);
}

function drawSpectrum(magnitudes = displayedSpectrumMagnitudes) {
  resizeCanvasForDisplay(spectrumCanvas);
  const width = spectrumCanvas.width;
  const height = spectrumCanvas.height;
  const pixelRatio = window.devicePixelRatio || 1;
  const plotLeft = 54 * pixelRatio;
  const plotRight = width - 8 * pixelRatio;
  const plotTop = 18 * pixelRatio;
  const plotBottom = height - 34 * pixelRatio;
  const plotWidth = Math.max(1, plotRight - plotLeft);
  const plotHeight = Math.max(1, plotBottom - plotTop);
  const maximumMagnitude = Math.max(1, spectrumScaleMaximum);

  spectrumContext.clearRect(0, 0, width, height);
  spectrumContext.fillStyle = '#0a0b09';
  spectrumContext.fillRect(0, 0, width, height);
  spectrumContext.strokeStyle = '#272b24';
  spectrumContext.fillStyle = '#73786b';
  spectrumContext.lineWidth = 1;
  spectrumContext.font = `${9 * pixelRatio}px "SFMono-Regular", monospace`;

  for (let row = 0; row <= 4; row += 1) {
    const y = plotTop + row / 4 * plotHeight;
    const normalizedLogPosition = 1 - row / 4;
    const coefficientMagnitude = Math.expm1(normalizedLogPosition * Math.log1p(maximumMagnitude));
    spectrumContext.beginPath();
    spectrumContext.moveTo(plotLeft, y);
    spectrumContext.lineTo(plotRight, y);
    spectrumContext.stroke();
    spectrumContext.fillStyle = '#858a7d';
    spectrumContext.textAlign = 'right';
    spectrumContext.textBaseline = 'middle';
    spectrumContext.fillText(formatFftMagnitude(coefficientMagnitude), plotLeft - 7 * pixelRatio, y);
  }

  for (let frequencyHz = 0; frequencyHz <= 3000; frequencyHz += 500) {
    const x = plotLeft + frequencyHz / (SIGNAL_CONFIG.sampleRateHz / 2) * plotWidth;
    spectrumContext.beginPath();
    spectrumContext.moveTo(x, plotTop);
    spectrumContext.lineTo(x, plotBottom);
    spectrumContext.stroke();
    spectrumContext.fillStyle = '#858a7d';
    spectrumContext.textAlign = frequencyHz === 0 ? 'left' : 'center';
    spectrumContext.textBaseline = 'alphabetic';
    spectrumContext.fillText(`${frequencyHz}`, x + 4 * pixelRatio, height - 10 * pixelRatio);
  }

  spectrumContext.textAlign = 'right';
  spectrumContext.fillText('Hz', plotRight, height - 10 * pixelRatio);

  const slotWidth = plotWidth / magnitudes.length;
  magnitudes.forEach((magnitude, binIndex) => {
    const normalizedMagnitude = Math.log1p(magnitude) / Math.log1p(maximumMagnitude);
    const barHeight = normalizedMagnitude * plotHeight;
    const barWidth = Math.max(1, slotWidth - Math.max(1, pixelRatio));
    spectrumContext.fillStyle = spectrumColour(binIndex);
    spectrumContext.globalAlpha = 0.2;
    const barX = plotLeft + binIndex * slotWidth;
    spectrumContext.fillRect(barX, plotBottom - 2 * pixelRatio, barWidth, 2 * pixelRatio);
    spectrumContext.globalAlpha = 0.88;
    if (barHeight > 0.5 * pixelRatio) {
      spectrumContext.fillRect(barX, plotBottom - barHeight, barWidth, barHeight);
    }
  });
  spectrumContext.globalAlpha = 1;
}

function animateSpectrum(timestamp) {
  const elapsedMilliseconds = previousSpectrumAnimationTime
    ? Math.min(50, timestamp - previousSpectrumAnimationTime)
    : 16;
  previousSpectrumAnimationTime = timestamp;
  let largestDifference = 0;

  displayedSpectrumMagnitudes = displayedSpectrumMagnitudes.map((displayedMagnitude, binIndex) => {
    const targetMagnitude = targetSpectrumMagnitudes[binIndex] ?? 0;
    const timeConstant = targetMagnitude >= displayedMagnitude ? 105 : 520;
    const blend = 1 - Math.exp(-elapsedMilliseconds / timeConstant);
    const nextMagnitude = displayedMagnitude + (targetMagnitude - displayedMagnitude) * blend;
    largestDifference = Math.max(largestDifference, Math.abs(targetMagnitude - nextMagnitude));
    return nextMagnitude;
  });

  const visibleMaximum = Math.max(1, ...displayedSpectrumMagnitudes.slice(1));
  const scaleDecay = Math.exp(-elapsedMilliseconds / 1900);
  spectrumScaleMaximum = Math.max(visibleMaximum, spectrumScaleMaximum * scaleDecay, 1);
  if (currentAnalysisFrame) drawSpectrum();

  if (largestDifference > 0.35) {
    spectrumAnimationFrame = requestAnimationFrame(animateSpectrum);
  } else {
    displayedSpectrumMagnitudes = [...targetSpectrumMagnitudes];
    if (currentAnalysisFrame) drawSpectrum();
    spectrumAnimationFrame = undefined;
    previousSpectrumAnimationTime = 0;
  }
}

function updateSpectrum(frame) {
  targetSpectrumMagnitudes = [...frame.magnitudes];
  const targetMaximum = Math.max(1, ...targetSpectrumMagnitudes.slice(1));

  if (frame.source !== 'esp32' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cancelAnimationFrame(spectrumAnimationFrame);
    spectrumAnimationFrame = undefined;
    previousSpectrumAnimationTime = 0;
    displayedSpectrumMagnitudes = [...targetSpectrumMagnitudes];
    spectrumScaleMaximum = targetMaximum;
    drawSpectrum();
    return;
  }

  spectrumScaleMaximum = Math.max(spectrumScaleMaximum, targetMaximum);
  if (!spectrumAnimationFrame) spectrumAnimationFrame = requestAnimationFrame(animateSpectrum);
}

function renderAnalysisFrame(frame) {
  currentAnalysisFrame = frame;
  updateSpectrum(frame);
  const hasDominantFrequency = frame.dominantBin > 0;
  spectrumSummary.textContent = hasDominantFrequency
    ? `Dominant: ${frame.dominantHz.toFixed(0)} Hz · bin ${frame.dominantBin}`
    : 'No frequency above the silence gate';

  for (const channel of ['red', 'green', 'blue']) {
    bandOutputs[channel].textContent = `${frame.bands[channel].toFixed(1)} · PWM ${frame.rgb[channel]}`;
    bandMeters[channel].style.transform = `scaleX(${frame.rgb[channel] / 255})`;
  }

  const { red, green, blue } = frame.rgb;
  rgbSwatch.style.backgroundColor = `rgb(${red}, ${green}, ${blue})`;
  rgbSwatch.setAttribute('aria-label', `Measured RGB colour: red ${red}, green ${green}, blue ${blue}`);
  rgbOutput.textContent = `R ${red} · G ${green} · B ${blue}`;
  colourResultLabel.textContent = 'Measured ESP32 output';
  metricSource.textContent = `ESP32 frame ${frame.sequence}`;
  metricSampleRate.textContent = `${frame.sampleRateHz.toFixed(1)} Hz`;
  metricRms.textContent = frame.rms.toFixed(2);
  metricNoiseFloor.textContent = `${frame.noiseFloor.toFixed(2)} · gate ${frame.silenceThreshold.toFixed(2)}`;
  metricDominantBin.textContent = hasDominantFrequency ? `${frame.dominantBin} · ${frame.dominantHz.toFixed(0)} Hz` : 'None';
}

function setSerialStatus(state, message) {
  analysisStatus.className = `analysis-status ${state}`;
  analysisStatus.textContent = message;
  if (state === 'disconnected' || state === 'error') lastLiveFrameAt = 0;
  const connectionActive = state === 'waiting' || state === 'live' || state === 'warning';
  connectSerialButton.disabled = connectionActive || !serialSource.supported;
  disconnectSerialButton.disabled = !connectionActive;
}

async function connectSerial() {
  try {
    lastLiveFrameAt = 0;
    await serialSource.connect();
  } catch (error) {
    const recovery = error.name === 'NotFoundError'
      ? 'No port selected. Choose Connect ESP32 when ready.'
      : `Could not open the ESP32 port: ${error.message}`;
    setSerialStatus('error', recovery);
  }
}

function targetMasterGain() {
  const oscillatorCount = Math.max(activeOscillators.length, selectedFrequencies().length, 1);
  return (Number(volumeInput.value) / 100) * (0.28 / oscillatorCount);
}

function updateActiveGain() {
  if (!masterGain || !audioContext) return;
  masterGain.gain.cancelScheduledValues(audioContext.currentTime);
  masterGain.gain.setTargetAtTime(targetMasterGain(), audioContext.currentTime, 0.02);
}

async function playSelectedTones() {
  const frequencies = selectedFrequencies();
  if (!frequencies.length || isPlaying) return;

  audioContext ??= new AudioContext();
  await audioContext.resume();
  masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(0, audioContext.currentTime);
  masterGain.connect(audioContext.destination);

  activeOscillators = frequencies.map((frequency) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.connect(masterGain);
    oscillator.start();
    return oscillator;
  });
  masterGain.gain.linearRampToValueAtTime(targetMasterGain(), audioContext.currentTime + 0.05);

  isPlaying = true;
  statusLight.classList.add('active');
  statusText.textContent = `Playing ${frequencies.join(' + ')} Hz. Audio travels through the speaker and microphone.`;
  playButton.disabled = true;
  stopButton.disabled = false;
  drawScope();
}

function stopTones() {
  if (!isPlaying || !audioContext || !masterGain) return;
  const stopTime = audioContext.currentTime + 0.05;
  masterGain.gain.cancelScheduledValues(audioContext.currentTime);
  masterGain.gain.setValueAtTime(masterGain.gain.value, audioContext.currentTime);
  masterGain.gain.linearRampToValueAtTime(0, stopTime);
  activeOscillators.forEach((oscillator) => oscillator.stop(stopTime + 0.01));
  activeOscillators = [];
  isPlaying = false;
  statusLight.classList.remove('active');
  statusText.textContent = 'Stopped. Change the frequency selection or run the next controlled test.';
  stopButton.disabled = true;
  updateReadouts();
}

function resizeCanvasForDisplay(targetCanvas = canvas) {
  const pixelRatio = window.devicePixelRatio || 1;
  const displayWidth = Math.max(1, Math.floor(targetCanvas.clientWidth * pixelRatio));
  const displayHeight = Math.max(1, Math.floor(targetCanvas.clientHeight * pixelRatio));
  if (targetCanvas.width !== displayWidth || targetCanvas.height !== displayHeight) {
    targetCanvas.width = displayWidth;
    targetCanvas.height = displayHeight;
  }
}

function drawScope() {
  resizeCanvasForDisplay();
  const width = canvas.width;
  const height = canvas.height;
  const frequencies = selectedFrequencies();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timeOffset = isPlaying && !reducedMotion ? performance.now() / 1000 : 0;

  canvasContext.clearRect(0, 0, width, height);
  canvasContext.strokeStyle = '#272b24';
  canvasContext.lineWidth = 1;
  for (let column = 0; column <= 12; column += 1) {
    const x = (column / 12) * width;
    canvasContext.beginPath();
    canvasContext.moveTo(x, 0);
    canvasContext.lineTo(x, height);
    canvasContext.stroke();
  }
  for (let row = 0; row <= 6; row += 1) {
    const y = (row / 6) * height;
    canvasContext.beginPath();
    canvasContext.moveTo(0, y);
    canvasContext.lineTo(width, y);
    canvasContext.stroke();
  }

  canvasContext.strokeStyle = '#d8ff52';
  canvasContext.lineWidth = Math.max(2, window.devicePixelRatio || 1);
  canvasContext.beginPath();
  for (let x = 0; x < width; x += 2) {
    const normalizedTime = x / width / 180;
    const amplitude = frequencies.length
      ? frequencies.reduce((sum, frequency) => sum + Math.sin(2 * Math.PI * frequency * (normalizedTime + timeOffset)), 0) / frequencies.length
      : 0;
    const y = height / 2 - amplitude * height * 0.34;
    if (x === 0) canvasContext.moveTo(x, y);
    else canvasContext.lineTo(x, y);
  }
  canvasContext.stroke();

  drawConstituentWaves(frequencies, timeOffset);

  if (isPlaying && !reducedMotion) animationFrame = requestAnimationFrame(drawScope);
}

frequencyInputs.forEach((input) => input.addEventListener('change', () => {
  if (isPlaying) stopTones();
  updateReadouts();
  cancelAnimationFrame(animationFrame);
  drawScope();
}));
volumeInput.addEventListener('input', () => {
  updateReadouts();
  updateActiveGain();
});
connectSerialButton.addEventListener('click', connectSerial);
disconnectSerialButton.addEventListener('click', () => serialSource.disconnect());
playButton.addEventListener('click', playSelectedTones);
stopButton.addEventListener('click', stopTones);
window.addEventListener('resize', () => {
  drawScope();
  drawSpectrum();
});
window.addEventListener('pagehide', () => {
  cancelAnimationFrame(spectrumAnimationFrame);
  stopTones();
  serialSource.disconnect();
});

window.setInterval(() => {
  if (lastLiveFrameAt > 0 && performance.now() - lastLiveFrameAt > 1500) {
    setSerialStatus('warning', 'Telemetry is stale. Check the USB connection or reset the ESP32 in a quiet room.');
  }
}, 500);

updateReadouts();
drawScope();
drawSpectrum();
if (!serialSource.supported) {
  setSerialStatus('error', 'Web Serial is unavailable. Use desktop Chrome or Edge on localhost.');
}
