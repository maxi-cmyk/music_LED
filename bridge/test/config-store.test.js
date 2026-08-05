const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ConfigStore, DEFAULT_CONFIG, sanitizeConfig } = require('../src/config-store');

test('sanitizes visual settings to safe firmware ranges', () => {
  const result = sanitizeConfig({
    rgbEnabled: false,
    beatSensitivity: 99,
    maxBrightness: -20,
    paletteMode: 'album',
  });
  assert.equal(result.beatSensitivity, 2);
  assert.equal(result.rgbEnabled, false);
  assert.equal(result.maxBrightness, 80);
  assert.equal(result.paletteMode, 'album');
  assert.equal(result.gamma, DEFAULT_CONFIG.gamma);
});

test('persists dashboard settings outside the public response source tree', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'music-led-config-'));
  const filePath = path.join(directory, 'display-config.json');
  const store = new ConfigStore(filePath);
  store.update({ rgbEnabled: false, redGain: 1.4, paletteMode: 'spectrum' });
  const reloaded = new ConfigStore(filePath);
  assert.equal(reloaded.get().rgbEnabled, false);
  assert.equal(reloaded.get().redGain, 1.4);
  assert.equal(reloaded.get().paletteMode, 'spectrum');
});
