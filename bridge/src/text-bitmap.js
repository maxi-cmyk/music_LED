const { createCanvas } = require('@napi-rs/canvas');

const SCREEN_WIDTH = 128;
const TITLE_HEIGHT = 14;
const ARTIST_HEIGHT = 12;
const MAX_BITMAP_WIDTH = 2048;
const MAX_CACHE_ENTRIES = 100;
const FONT_FAMILY = '"PingFang SC", "Hiragino Sans", "Apple SD Gothic Neo", "Noto Sans", sans-serif';
const cache = new Map();

const textStyles = {
  title: { font: `600 12px ${FONT_FAMILY}`, height: TITLE_HEIGHT },
  artist: { font: `400 10px ${FONT_FAMILY}`, height: ARTIST_HEIGHT },
};

function renderTextBitmap(value, styleName = 'title') {
  const text = String(value || '');
  const style = textStyles[styleName] || textStyles.title;
  const cacheKey = `${styleName}:${text}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const measurementCanvas = createCanvas(1, 1);
  const measurementContext = measurementCanvas.getContext('2d');
  measurementContext.font = style.font;
  const measuredWidth = Math.ceil(measurementContext.measureText(text).width) + 2;
  const width = Math.min(MAX_BITMAP_WIDTH, Math.max(8, Math.ceil(measuredWidth / 8) * 8));

  const canvas = createCanvas(width, style.height);
  const context = canvas.getContext('2d');
  context.fillStyle = 'black';
  context.fillRect(0, 0, width, style.height);
  context.fillStyle = 'white';
  context.font = style.font;
  context.textBaseline = 'top';
  context.fillText(text, 0, 0);

  const pixels = context.getImageData(0, 0, width, style.height).data;
  const bitmap = Buffer.alloc((width * style.height) / 8);
  for (let y = 0; y < style.height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelOffset = (y * width + x) * 4;
      const lit = pixels[pixelOffset + 3] > 0 && pixels[pixelOffset] >= 96;
      if (lit) bitmap[y * (width / 8) + Math.floor(x / 8)] |= 0x80 >> (x % 8);
    }
  }

  const result = { data: bitmap.toString('hex'), width, height: style.height };
  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(cacheKey, result);
  return result;
}

module.exports = {
  SCREEN_WIDTH,
  TITLE_HEIGHT,
  ARTIST_HEIGHT,
  MAX_BITMAP_WIDTH,
  renderTextBitmap,
};
