const fs = require('node:fs');
const path = require('node:path');
const { sanitizeConfig } = require('./config-store');

const BUILT_IN_SCENES = Object.freeze([
  { id: 'chill', name: 'CHILL', builtIn: true, config: { beatSensitivity: 0.8, noiseGateMultiplier: 1.35, tempoCorrection: 0.18, tempoHoldMs: 3200, flashDecay: 0.72, idleBrightness: 5, maxBrightness: 145, dancerSpeed: 0.7, dancerIntensity: 0.65, paletteMode: 'album', rgbEnabled: true } },
  { id: 'club', name: 'CLUB', builtIn: true, config: { beatSensitivity: 1.45, noiseGateMultiplier: 1.22, tempoCorrection: 0.35, tempoHoldMs: 2200, flashDecay: 0.54, idleBrightness: 8, maxBrightness: 255, dancerSpeed: 1.55, dancerIntensity: 1.65, paletteMode: 'club', rgbEnabled: true } },
  { id: 'album', name: 'ALBUM', builtIn: true, config: { beatSensitivity: 1, noiseGateMultiplier: 1.3, tempoCorrection: 0.25, tempoHoldMs: 2500, flashDecay: 0.65, idleBrightness: 12, maxBrightness: 220, dancerSpeed: 1, dancerIntensity: 1, paletteMode: 'album', rgbEnabled: true } },
  { id: 'max-energy', name: 'MAX ENERGY', builtIn: true, config: { beatSensitivity: 1.8, noiseGateMultiplier: 1.18, tempoCorrection: 0.45, tempoHoldMs: 1800, flashDecay: 0.46, idleBrightness: 16, maxBrightness: 255, dancerSpeed: 2, dancerIntensity: 2, paletteMode: 'spectrum', rgbEnabled: true } },
  { id: 'lights-out', name: 'LIGHTS OUT', builtIn: true, config: { rgbEnabled: false } },
]);

function sceneId(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);
}

class SceneStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.custom = this.#load();
  }

  #load() {
    try {
      const values = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      return Array.isArray(values) ? values.slice(0, 8) : [];
    } catch {
      return [];
    }
  }

  #save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, `${JSON.stringify(this.custom, null, 2)}\n`, { mode: 0o600 });
  }

  list() {
    return [...BUILT_IN_SCENES, ...this.custom].map((scene) => ({ ...scene, config: { ...scene.config } }));
  }

  find(id) {
    return this.list().find((scene) => scene.id === id);
  }

  save(name, config) {
    const cleanName = String(name || '').trim().slice(0, 24);
    const baseId = sceneId(cleanName);
    if (!baseId) throw new Error('scene name is required');
    let id = baseId;
    let suffix = 2;
    while (this.find(id)) id = `${baseId}-${suffix++}`;
    const scene = { id, name: cleanName.toUpperCase(), builtIn: false, config: sanitizeConfig(config) };
    this.custom = [...this.custom, scene].slice(-8);
    this.#save();
    return { ...scene, config: { ...scene.config } };
  }

  remove(id) {
    const before = this.custom.length;
    this.custom = this.custom.filter((scene) => scene.id !== id);
    if (this.custom.length === before) return false;
    this.#save();
    return true;
  }
}

module.exports = { SceneStore, BUILT_IN_SCENES, sceneId };
