const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePlayback } = require('../src/normalize-playback');

test('converts Spotify currently-playing data into the ESP32 display contract', () => {
  const renderText = (value, style) => ({ data: `bitmap:${style}:${value}`, width: style === 'title' ? 160 : 120 });
  const result = normalizePlayback({
    is_playing: true,
    progress_ms: 12_345,
    device: { volume_percent: 67 },
    item: {
      name: 'Midnight City',
      duration_ms: 243_000,
      artists: [{ name: 'M83' }, { name: 'Featured Artist' }],
    },
  }, renderText);

  assert.deepEqual(result, {
    available: true,
    title: 'Midnight City',
    artist: 'M83, Featured Artist',
    titleBitmap: 'bitmap:title:Midnight City',
    titleBitmapWidth: 160,
    artistBitmap: 'bitmap:artist:M83, Featured Artist',
    artistBitmapWidth: 120,
    progressMs: 12_345,
    durationMs: 243_000,
    isPlaying: true,
  });
});

test('returns an unavailable display state when Spotify has no active track', () => {
  const renderText = (value, style) => ({ data: `bitmap:${style}:${value}`, width: 80 });
  assert.deepEqual(normalizePlayback(null, renderText), {
    available: false,
    title: 'Nothing playing',
    artist: 'Open Spotify on any device',
    titleBitmap: 'bitmap:title:Nothing playing',
    titleBitmapWidth: 80,
    artistBitmap: 'bitmap:artist:Open Spotify on any device',
    artistBitmapWidth: 80,
    progressMs: 0,
    durationMs: 1,
    isPlaying: false,
  });
});
