const { createCanvas } = require('@napi-rs/canvas');

const BITMAP_WIDTH = 128;
const BITMAP_HEIGHT = 14;
const BYTES_PER_BITMAP = (BITMAP_WIDTH * BITMAP_HEIGHT) / 8;
const MAX_CACHE_ENTRIES = 100;
const cache = new Map();

function renderTextBitmap(value) {
  const text = String(value || '');
  const cached = cache.get(text);
  if (cached) return cached;

  const canvas = createCanvas(BITMAP_WIDTH, BITMAP_HEIGHT);
  const context = canvas.getContext('2d');
  context.fillStyle = 'black';
  context.fillRect(0, 0, BITMAP_WIDTH, BITMAP_HEIGHT);
  context.fillStyle = 'white';
  context.font = '12px "PingFang SC", "Hiragino Sans", "Apple SD Gothic Neo", "Noto Sans", sans-serif';
  context.textBaseline = 'top';
  context.fillText(text, 0, 0);

  const pixels = context.getImageData(0, 0, BITMAP_WIDTH, BITMAP_HEIGHT).data;
  const bitmap = Buffer.alloc(BYTES_PER_BITMAP);
  for (let y = 0; y < BITMAP_HEIGHT; y += 1) {
    for (let x = 0; x < BITMAP_WIDTH; x += 1) {
      const pixelOffset = (y * BITMAP_WIDTH + x) * 4;
      const lit = pixels[pixelOffset + 3] > 0 && pixels[pixelOffset] >= 96;
      if (lit) bitmap[y * (BITMAP_WIDTH / 8) + Math.floor(x / 8)] |= 0x80 >> (x % 8);
    }
  }

  const encoded = bitmap.toString('hex');
  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(text, encoded);
  return encoded;
}

module.exports = { BITMAP_WIDTH, BITMAP_HEIGHT, BYTES_PER_BITMAP, renderTextBitmap };
