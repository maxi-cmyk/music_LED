const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { calibrateBeat } = require('../src/calibration');
const { isNightActive } = require('../src/night-schedule');
const { RgbTestStore } = require('../src/rgb-test-store');
const { SceneStore } = require('../src/scene-store');

test('calculates a safe beat calibration from live samples', () => {
  const samples = Array.from({ length: 20 }, (_, index) => ({
    microphoneLevel: 90 + index * 2,
    noiseFloor: 30,
    beatConfidence: 72,
    bpm: 118 + (index % 3),
  }));
  const result = calibrateBeat(samples);
  assert.ok(result.beatSensitivity >= 0.5 && result.beatSensitivity <= 2);
  assert.ok(result.noiseGateMultiplier >= 1.1 && result.noiseGateMultiplier <= 2);
  assert.ok(result.tempoCorrection >= 0.05 && result.tempoCorrection <= 0.8);
  assert.equal(result.flashDecay, 0.63);
  assert.throws(() => calibrateBeat(samples.slice(0, 3)), /not enough/);
});

test('handles overnight and same-day night schedules', () => {
  const at = (hours, minutes) => ({ getHours: () => hours, getMinutes: () => minutes });
  assert.equal(isNightActive({ nightEnabled: true, nightStart: '23:00', nightEnd: '07:00' }, at(1, 0)), true);
  assert.equal(isNightActive({ nightEnabled: true, nightStart: '23:00', nightEnd: '07:00' }, at(12, 0)), false);
  assert.equal(isNightActive({ nightEnabled: true, nightStart: '09:00', nightEnd: '17:00' }, at(12, 0)), true);
  assert.equal(isNightActive({ nightEnabled: false, nightStart: '00:00', nightEnd: '00:00' }, at(0, 0)), false);
});

test('expires temporary RGB tests automatically', () => {
  let now = 1_000;
  const store = new RgbTestStore(() => now);
  assert.deepEqual(store.start('red', 5_000), { mode: 'red', remainingMs: 5_000 });
  now += 5_001;
  assert.deepEqual(store.get(), { mode: 'off', remainingMs: 0 });
  assert.throws(() => store.start('ultraviolet'), /invalid/);
});

test('keeps built-in scenes and persists custom scenes privately', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'music-led-scenes-'));
  const filePath = path.join(directory, 'scenes.json');
  const store = new SceneStore(filePath);
  const custom = store.save('My Room', { redGain: 1.4, maxBrightness: 190 });
  assert.equal(custom.builtIn, false);
  assert.equal(store.find(custom.id).config.redGain, 1.4);
  assert.equal(new SceneStore(filePath).find(custom.id).config.maxBrightness, 190);
  assert.equal(store.remove(custom.id), true);
  assert.equal(store.find('club').builtIn, true);
});
