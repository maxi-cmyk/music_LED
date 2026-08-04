const { createCanvas, loadImage } = require('@napi-rs/canvas');

const ART_WIDTH = 32;
const ART_HEIGHT = 32;
const MAX_CACHE_ENTRIES = 40;
const cache = new Map();
const FALLBACK_PALETTE = [[255, 0, 140], [20, 70, 255], [0, 255, 80]];
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

function extractDominantPalette(pixels) {
  const buckets = new Map();
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] < 128) continue;
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum;
    if (maximum < 35 || maximum > 245 || saturation < 0.16) continue;
    const key = `${red >> 5}:${green >> 5}:${blue >> 5}`;
    const bucket = buckets.get(key) || { red: 0, green: 0, blue: 0, count: 0, score: 0 };
    bucket.red += red;
    bucket.green += green;
    bucket.blue += blue;
    bucket.count += 1;
    bucket.score += saturation * (0.45 + maximum / 510);
    buckets.set(key, bucket);
  }

  const candidates = [...buckets.values()]
    .map((bucket) => ({
      color: [
        Math.round(bucket.red / bucket.count),
        Math.round(bucket.green / bucket.count),
        Math.round(bucket.blue / bucket.count),
      ],
      score: bucket.score,
    }))
    .sort((left, right) => right.score - left.score);

  const palette = [];
  for (const candidate of candidates) {
    const distinct = palette.every((color) => {
      const distance = Math.hypot(
        color[0] - candidate.color[0],
        color[1] - candidate.color[1],
        color[2] - candidate.color[2],
      );
      return distance >= 75;
    });
    if (distinct) palette.push(candidate.color);
    if (palette.length === 3) break;
  }
  for (const fallback of FALLBACK_PALETTE) {
    if (palette.length === 3) break;
    palette.push(fallback);
  }
  return palette;
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
        palette: extractDominantPalette(pixels),
      };
    } catch {
      return null;
    }
  })();

  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(url, pending);
  return pending;
}

module.exports = {
  ART_WIDTH,
  ART_HEIGHT,
  extractDominantPalette,
  pixelsToBitmap,
  renderAlbumArtBitmap,
};
