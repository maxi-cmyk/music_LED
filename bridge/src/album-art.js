const { createCanvas, loadImage } = require('@napi-rs/canvas');

const ART_WIDTH = 32;
const ART_HEIGHT = 32;
const MAX_CACHE_ENTRIES = 40;
const cache = new Map();
const bayer4x4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function pixelsToBitmap(pixels, width = ART_WIDTH, height = ART_HEIGHT) {
  const bitmap = Buffer.alloc((width * height) / 8);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const luminance =
        pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722;
      const threshold = 64 + bayer4x4[y % 4][x % 4] * 8;
      if (pixels[offset + 3] >= 96 && luminance >= threshold) {
        bitmap[y * (width / 8) + Math.floor(x / 8)] |= 0x80 >> (x % 8);
      }
    }
  }
  return bitmap;
}

async function renderAlbumArtBitmap(url, fetchImplementation = fetch) {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url);

  const pending = (async () => {
    try {
      const response = await fetchImplementation(url);
      if (!response.ok) return null;
      const image = await loadImage(Buffer.from(await response.arrayBuffer()));
      const canvas = createCanvas(ART_WIDTH, ART_HEIGHT);
      const context = canvas.getContext('2d');
      context.fillStyle = 'black';
      context.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);
      context.drawImage(image, 0, 0, ART_WIDTH, ART_HEIGHT);
      const pixels = context.getImageData(0, 0, ART_WIDTH, ART_HEIGHT).data;
      return {
        data: pixelsToBitmap(pixels).toString('hex'),
        width: ART_WIDTH,
        height: ART_HEIGHT,
      };
    } catch {
      return null;
    }
  })();

  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(url, pending);
  return pending;
}

module.exports = { ART_WIDTH, ART_HEIGHT, pixelsToBitmap, renderAlbumArtBitmap };
