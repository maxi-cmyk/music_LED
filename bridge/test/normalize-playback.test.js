const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePlayback } = require('../src/normalize-playback');

test('converts Spotify currently-playing data into the ESP32 display contract', () => {
  const result = normalizePlayback({
    is_playing: true,
    progress_ms: 12_345,
    device: { volume_percent: 67 },
    item: {
      name: 'Midnight City',
      duration_ms: 243_000,
      artists: [{ name: 'M83' }, { name: 'Featured Artist' }],
    },
  });

  assert.deepEqual(result, {
    available: true,
    title: 'Midnight City',
    artist: 'M83, Featured Artist',
    progressMs: 12_345,
    durationMs: 243_000,
    volumePercent: 67,
    isPlaying: true,
  });
});

test('returns an unavailable display state when Spotify has no active track', () => {
  assert.deepEqual(normalizePlayback(null), {
    available: false,
    title: 'Nothing playing',
    artist: 'Open Spotify on any device',
    progressMs: 0,
    durationMs: 1,
    volumePercent: 0,
    isPlaying: false,
  });
});
