import { FREQUENCIES, SIGNAL_CONFIG } from './config.mjs';

function resizeCanvas(canvas) {
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
  const height = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height, pixelRatio };
}

function frequencyColour(frequencyHz) {
  const detail = FREQUENCIES.find((item) => item.frequencyHz === frequencyHz);
  if (!detail || detail.band === 'leakage') return '#d8ff52';
  return SIGNAL_CONFIG.bands[detail.band].colour;
}

function binColour(binIndex) {
  for (const band of Object.values(SIGNAL_CONFIG.bands)) {
    if (binIndex >= band.firstBin && binIndex <= band.lastBin) return band.colour;
  }
  return '#666b61';
}

export function drawSpectrum(canvas, frame, selectedFrequencies, requestedScaleMaximum = 1) {
  const context = canvas.getContext('2d');
  const { width, height, pixelRatio } = resizeCanvas(canvas);
  const magnitudes = frame?.magnitudes ?? new Array(SIGNAL_CONFIG.nyquistBin + 1).fill(0);
  const plot = {
    left: 58 * pixelRatio,
    right: width - 12 * pixelRatio,
    top: 20 * pixelRatio,
    bottom: height - 38 * pixelRatio,
  };
  const plotWidth = plot.right - plot.left;
  const plotHeight = plot.bottom - plot.top;
  const visibleMaximum = Math.max(1, ...magnitudes.slice(1));
  const scaleMaximum = Math.max(visibleMaximum, requestedScaleMaximum, 1);

  context.clearRect(0, 0, width, height);
  context.fillStyle = '#080906';
  context.fillRect(0, 0, width, height);
  context.font = `${10 * pixelRatio}px "SFMono-Regular", monospace`;
  context.lineWidth = 1;

  for (let row = 0; row <= 4; row += 1) {
    const y = plot.top + (row / 4) * plotHeight;
    context.strokeStyle = '#252920';
    context.beginPath();
    context.moveTo(plot.left, y);
    context.lineTo(plot.right, y);
    context.stroke();
    const logPosition = 1 - row / 4;
    const magnitude = Math.expm1(logPosition * Math.log1p(scaleMaximum));
    context.fillStyle = '#94998c';
    context.textAlign = 'right';
    context.fillText(formatMagnitude(magnitude), plot.left - 8 * pixelRatio, y + 3 * pixelRatio);
  }

  for (let frequencyHz = 0; frequencyHz <= 3000; frequencyHz += 500) {
    const x = plot.left + frequencyHz / (SIGNAL_CONFIG.sampleRateHz / 2) * plotWidth;
    context.strokeStyle = '#20241c';
    context.beginPath();
    context.moveTo(x, plot.top);
    context.lineTo(x, plot.bottom);
    context.stroke();
    context.fillStyle = '#94998c';
    context.textAlign = frequencyHz === 0 ? 'left' : 'center';
    context.fillText(`${frequencyHz}`, x, height - 12 * pixelRatio);
  }

  const slotWidth = plotWidth / magnitudes.length;
  magnitudes.forEach((magnitude, binIndex) => {
    const normalized = Math.log1p(magnitude) / Math.log1p(scaleMaximum);
    const barHeight = normalized * plotHeight;
    context.fillStyle = binColour(binIndex);
    context.globalAlpha = 0.88;
    context.fillRect(
      plot.left + binIndex * slotWidth,
      plot.bottom - barHeight,
      Math.max(1, slotWidth - pixelRatio),
      barHeight,
    );
  });
  context.globalAlpha = 1;

  for (const frequencyHz of selectedFrequencies) {
    const x = plot.left + frequencyHz / (SIGNAL_CONFIG.sampleRateHz / 2) * plotWidth;
    context.strokeStyle = frequencyColour(frequencyHz);
    context.lineWidth = 2 * pixelRatio;
    context.setLineDash([5 * pixelRatio, 5 * pixelRatio]);
    context.beginPath();
    context.moveTo(x, plot.top);
    context.lineTo(x, plot.bottom);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = frequencyColour(frequencyHz);
    context.textAlign = 'center';
    context.fillText(`${frequencyHz} Hz`, x, plot.top + 11 * pixelRatio);
  }

  return visibleMaximum;
}

function formatMagnitude(magnitude) {
  if (magnitude >= 10000) return `${(magnitude / 1000).toFixed(0)}k`;
  if (magnitude >= 1000) return `${(magnitude / 1000).toFixed(1)}k`;
  if (magnitude >= 100) return magnitude.toFixed(0);
  return magnitude.toFixed(magnitude > 0 ? 1 : 0);
}

function drawGrid(context, width, height) {
  context.strokeStyle = '#282c23';
  context.lineWidth = 1;
  for (let column = 0; column <= 12; column += 1) {
    const x = column / 12 * width;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let row = 0; row <= 4; row += 1) {
    const y = row / 4 * height;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
}

export function drawWaveComposition(componentCanvas, compositeCanvas, frequencies, selectedSampleIndex = 16) {
  drawComponents(componentCanvas, frequencies, selectedSampleIndex);
  drawComposite(compositeCanvas, frequencies, selectedSampleIndex);
}

function sampleForFrequency(frequencyHz, sampleIndex) {
  return Math.sin(2 * Math.PI * frequencyHz * sampleIndex / SIGNAL_CONFIG.sampleRateHz);
}

function sampleX(sampleIndex, width) {
  return sampleIndex / (SIGNAL_CONFIG.sampleCount - 1) * width;
}

function drawSampleCursor(context, width, height, pixelRatio, selectedSampleIndex) {
  const x = sampleX(selectedSampleIndex, width);
  context.fillStyle = 'rgba(216, 255, 82, 0.08)';
  context.fillRect(x - 3 * pixelRatio, 0, 6 * pixelRatio, height);
  context.strokeStyle = '#d8ff52';
  context.lineWidth = pixelRatio;
  context.setLineDash([4 * pixelRatio, 4 * pixelRatio]);
  context.beginPath();
  context.moveTo(x, 0);
  context.lineTo(x, height);
  context.stroke();
  context.setLineDash([]);
}

function drawComponents(canvas, frequencies, selectedSampleIndex) {
  const context = canvas.getContext('2d');
  const { width, height, pixelRatio } = resizeCanvas(canvas);
  context.fillStyle = '#080906';
  context.fillRect(0, 0, width, height);
  drawGrid(context, width, height);
  const active = frequencies.length ? frequencies : [0];
  const laneHeight = height / active.length;
  active.forEach((frequencyHz, laneIndex) => {
    const middle = laneIndex * laneHeight + laneHeight / 2;
    context.strokeStyle = frequencyColour(frequencyHz);
    context.lineWidth = Math.max(1.5 * pixelRatio, 2);
    context.beginPath();
    for (let sampleIndex = 0; sampleIndex < SIGNAL_CONFIG.sampleCount; sampleIndex += 1) {
      const x = sampleX(sampleIndex, width);
      const amplitude = frequencyHz ? sampleForFrequency(frequencyHz, sampleIndex) : 0;
      const y = middle - amplitude * laneHeight * 0.3;
      if (sampleIndex === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
    context.fillStyle = frequencyColour(frequencyHz);
    context.font = `${11 * pixelRatio}px "SFMono-Regular", monospace`;
    context.fillText(frequencyHz ? `${frequencyHz} Hz` : 'No component selected', 12 * pixelRatio, middle - 8 * pixelRatio);
    if (frequencyHz) {
      const selectedX = sampleX(selectedSampleIndex, width);
      const selectedY = middle - sampleForFrequency(frequencyHz, selectedSampleIndex) * laneHeight * 0.3;
      context.fillStyle = frequencyColour(frequencyHz);
      context.beginPath();
      context.arc(selectedX, selectedY, 3.5 * pixelRatio, 0, Math.PI * 2);
      context.fill();
    }
  });
  drawSampleCursor(context, width, height, pixelRatio, selectedSampleIndex);
}

function drawComposite(canvas, frequencies, selectedSampleIndex) {
  const context = canvas.getContext('2d');
  const { width, height, pixelRatio } = resizeCanvas(canvas);
  context.fillStyle = '#080906';
  context.fillRect(0, 0, width, height);
  drawGrid(context, width, height);
  context.strokeStyle = '#d8ff52';
  context.lineWidth = Math.max(2 * pixelRatio, 2);
  context.beginPath();
  for (let sampleIndex = 0; sampleIndex < SIGNAL_CONFIG.sampleCount; sampleIndex += 1) {
    const x = sampleX(sampleIndex, width);
    const amplitude = frequencies.length
      ? frequencies.reduce((sum, frequencyHz) => sum + sampleForFrequency(frequencyHz, sampleIndex), 0) / frequencies.length
      : 0;
    const y = height / 2 - amplitude * height * 0.32;
    if (sampleIndex === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();

  context.fillStyle = '#f0f2e9';
  for (let sampleIndex = 0; sampleIndex < SIGNAL_CONFIG.sampleCount; sampleIndex += 1) {
    const x = sampleX(sampleIndex, width);
    const amplitude = frequencies.length
      ? frequencies.reduce((sum, frequencyHz) => sum + sampleForFrequency(frequencyHz, sampleIndex), 0) / frequencies.length
      : 0;
    const y = height / 2 - amplitude * height * 0.32;
    context.beginPath();
    context.arc(x, y, 2.5 * pixelRatio, 0, Math.PI * 2);
    context.fill();
  }
  drawSampleCursor(context, width, height, pixelRatio, selectedSampleIndex);
}

export function drawSampleVector(canvas, samples, selectedSampleIndex = null) {
  const context = canvas.getContext('2d');
  const { width, height, pixelRatio } = resizeCanvas(canvas);
  context.fillStyle = '#080906';
  context.fillRect(0, 0, width, height);
  drawGrid(context, width, height);
  if (!samples?.length) return;

  const largestMagnitude = Math.max(1e-9, ...samples.map((sample) => Math.abs(sample)));
  const middleY = height / 2;
  const verticalScale = (height / 2 - 18 * pixelRatio) / largestMagnitude;
  const selectedX = selectedSampleIndex === null
    ? null
    : selectedSampleIndex / (samples.length - 1) * width;

  context.strokeStyle = '#555b4a';
  context.beginPath();
  context.moveTo(0, middleY);
  context.lineTo(width, middleY);
  context.stroke();

  if (selectedX !== null) {
    context.fillStyle = 'rgba(216, 255, 82, 0.08)';
    context.fillRect(
      selectedX - Math.max(3 * pixelRatio, width / samples.length / 2),
      0,
      Math.max(6 * pixelRatio, width / samples.length),
      height,
    );
  }

  context.strokeStyle = '#d8ff52';
  context.lineWidth = 2 * pixelRatio;
  context.beginPath();
  samples.forEach((sample, index) => {
    const x = index / (samples.length - 1) * width;
    const y = middleY - sample * verticalScale;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();

  samples.forEach((sample, index) => {
    const x = index / (samples.length - 1) * width;
    const y = middleY - sample * verticalScale;
    context.fillStyle = index === selectedSampleIndex ? '#f1f2ea' : '#d8ff52';
    context.beginPath();
    context.arc(x, y, (index === selectedSampleIndex ? 4 : 1.45) * pixelRatio, 0, Math.PI * 2);
    context.fill();
  });
}

export function drawFourierContributionPath(canvas, contributions, selectedSampleIndex) {
  const context = canvas.getContext('2d');
  const { width, height, pixelRatio } = resizeCanvas(canvas);
  context.fillStyle = '#080906';
  context.fillRect(0, 0, width, height);
  drawGrid(context, width, height);
  if (!contributions?.length) return;

  const cumulativePoints = [{ real: 0, imaginary: 0 }];
  contributions.forEach((contribution) => {
    const previous = cumulativePoints.at(-1);
    cumulativePoints.push({
      real: previous.real + contribution.real,
      imaginary: previous.imaginary + contribution.imaginary,
    });
  });

  const largestCoordinate = Math.max(
    1e-9,
    ...cumulativePoints.flatMap((point) => [Math.abs(point.real), Math.abs(point.imaginary)]),
  );
  const scale = Math.min(width, height) * 0.38 / largestCoordinate;
  const centreX = width / 2;
  const centreY = height / 2;
  const mapPoint = (point) => ({
    x: centreX + point.real * scale,
    y: centreY - point.imaginary * scale,
  });

  context.strokeStyle = '#34382d';
  context.lineWidth = pixelRatio;
  context.beginPath();
  context.moveTo(centreX, 0);
  context.lineTo(centreX, height);
  context.moveTo(0, centreY);
  context.lineTo(width, centreY);
  context.stroke();

  context.strokeStyle = '#8b9084';
  context.lineWidth = 1.4 * pixelRatio;
  context.beginPath();
  cumulativePoints.forEach((point, pointIndex) => {
    const mapped = mapPoint(point);
    if (pointIndex === 0) context.moveTo(mapped.x, mapped.y);
    else context.lineTo(mapped.x, mapped.y);
  });
  context.stroke();

  const selectedStart = mapPoint(cumulativePoints[selectedSampleIndex]);
  const selectedEnd = mapPoint(cumulativePoints[selectedSampleIndex + 1]);
  context.strokeStyle = '#d8ff52';
  context.lineWidth = 4 * pixelRatio;
  context.beginPath();
  context.moveTo(selectedStart.x, selectedStart.y);
  context.lineTo(selectedEnd.x, selectedEnd.y);
  context.stroke();

  const result = mapPoint(cumulativePoints.at(-1));
  context.strokeStyle = '#f1f2ea';
  context.lineWidth = 2 * pixelRatio;
  context.beginPath();
  context.moveTo(centreX, centreY);
  context.lineTo(result.x, result.y);
  context.stroke();
  context.fillStyle = '#f1f2ea';
  context.beginPath();
  context.arc(result.x, result.y, 4 * pixelRatio, 0, Math.PI * 2);
  context.fill();
}
