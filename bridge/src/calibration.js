function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function calibrateBeat(samples = []) {
  const valid = samples.filter((sample) => Number(sample.microphoneLevel) > 0 && Number(sample.noiseFloor) > 0);
  if (valid.length < 8) throw new Error('not enough live ESP32 samples');

  const confidence = median(valid.map((sample) => Number(sample.beatConfidence) || 0));
  const signalRatio = median(valid.map((sample) => Number(sample.microphoneLevel) / Number(sample.noiseFloor)));
  const bpms = valid.map((sample) => Number(sample.bpm)).filter((bpm) => bpm >= 40 && bpm <= 220);
  const bpm = median(bpms);
  const deviation = bpms.length > 1
    ? Math.sqrt(bpms.reduce((total, value) => total + (value - bpm) ** 2, 0) / bpms.length)
    : 20;

  return {
    beatSensitivity: Number(clamp(1.55 - confidence * 0.006 - (signalRatio - 2) * 0.08, 0.7, 1.8).toFixed(2)),
    noiseGateMultiplier: Number(clamp(1.12 + 0.5 / Math.max(signalRatio, 1), 1.15, 1.65).toFixed(2)),
    tempoCorrection: Number(clamp(0.18 + deviation * 0.012, 0.15, 0.55).toFixed(2)),
    tempoHoldMs: Math.round(clamp(1800 + (100 - confidence) * 18, 1800, 3800) / 100) * 100,
    flashDecay: Number((bpm >= 140 ? 0.55 : bpm > 0 && bpm < 90 ? 0.72 : 0.63).toFixed(2)),
  };
}

module.exports = { calibrateBeat, clamp, median };
