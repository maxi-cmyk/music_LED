const test = require('node:test');
const assert = require('node:assert/strict');
const { createCanvas } = require('@napi-rs/canvas');
const { ART_HEIGHT, ART_WIDTH, pixelsToBitmap, renderAlbumArtBitmap } = require('../src/album-art');

test('packs a 32 by 32 monochrome image into exactly 128 bytes', () => {
  const pixels = Buffer.alloc(ART_WIDTH * ART_HEIGHT * 4, 255);
  const bitmap = pixelsToBitmap(pixels);
  assert.equal(bitmap.length, 128);
  assert.equal(bitmap.every((value) => value !== 0), true);
});

test('downloads, resizes, and dithers album artwork for the ESP32', async () => {
  const canvas = createCanvas(8, 8);
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 8, 8);
  gradient.addColorStop(0, 'black');
  gradient.addColorStop(1, 'white');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 8, 8);
  const png = canvas.toBuffer('image/png');
  const fetchImage = async () => ({
    ok: true,
    arrayBuffer: async () => png,
  });

  const result = await renderAlbumArtBitmap('https://example.test/cover.png', fetchImage);
  assert.equal(result.width, 32);
  assert.equal(result.height, 32);
  assert.equal(result.data.length, 256);
  assert.equal(result.palette.length, 3);
  assert.equal(result.palette.every((color) => color.length === 3), true);
  assert.notEqual(result.data, '00'.repeat(128));
  assert.notEqual(result.data, 'ff'.repeat(128));
});

test('returns no artwork when the image cannot be downloaded', async () => {
  const result = await renderAlbumArtBitmap(
    'https://example.test/missing.png',
    async () => ({ ok: false }),
  );
  assert.equal(result, null);
});
