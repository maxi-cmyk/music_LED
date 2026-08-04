const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_CONFIG = Object.freeze({
  beatSensitivity: 1,
  tempoCorrection: 0.25,
  tempoHoldMs: 2500,
  flashDecay: 0.65,
  idleBrightness: 18,
  maxBrightness: 240,
  redGain: 1,
  greenGain: 1,
  blueGain: 1,
  gamma: 1.6,
  dancerSpeed: 1,
  dancerIntensity: 1,
  paletteMode: 'album',
});

const limits = {
  beatSensitivity: [0.5, 2],
  tempoCorrection: [0.05, 0.8],
  tempoHoldMs: [1000, 5000],
  flashDecay: [0.4, 0.85],
  idleBrightness: [0, 60],
  maxBrightness: [80, 255],
  redGain: [0.25, 2],
  greenGain: [0.25, 2],
  blueGain: [0.25, 2],
  gamma: [1, 2.8],
  dancerSpeed: [0.5, 2],
  dancerIntensity: [0.5, 2],
};

function sanitizeConfig(input = {}, base = DEFAULT_CONFIG) {
  const result = { ...DEFAULT_CONFIG, ...base };
  for (const [key, [minimum, maximum]] of Object.entries(limits)) {
    if (input[key] === undefined) continue;
    const numeric = Number(input[key]);
    if (Number.isFinite(numeric)) result[key] = Math.min(maximum, Math.max(minimum, numeric));
  }
  if (['club', 'album', 'spectrum'].includes(input.paletteMode)) {
    result.paletteMode = input.paletteMode;
  }
  return result;
}

class ConfigStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.config = this.#load();
  }

  #load() {
    try {
      return sanitizeConfig(JSON.parse(fs.readFileSync(this.filePath, 'utf8')));
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  get() {
    return { ...this.config };
  }

  update(values) {
    this.config = sanitizeConfig(values, this.config);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, `${JSON.stringify(this.config, null, 2)}\n`, { mode: 0o600 });
    return this.get();
  }
}

module.exports = { ConfigStore, DEFAULT_CONFIG, sanitizeConfig };
