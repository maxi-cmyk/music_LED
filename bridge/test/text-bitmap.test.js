const test = require('node:test');
const assert = require('node:assert/strict');
const { BYTES_PER_BITMAP, renderTextBitmap } = require('../src/text-bitmap');

const languageSamples = [
  ['Simplified Chinese', '简体中文歌曲'],
  ['Korean', '한국어 노래'],
  ['Japanese', '日本語の歌'],
  ['Spanish', 'Canción española'],
  ['French', 'Chanson française'],
  ['Vietnamese', 'Bài hát tiếng Việt'],
];

const glyphPairs = [
  ['Simplified Chinese', '中文', '歌曲'],
  ['Korean', '한국', '노래'],
  ['Japanese', '日本', '音楽'],
  ['Spanish', 'canción', 'cancion'],
  ['French', 'français', 'francais'],
  ['Vietnamese', 'Việt', 'Viet'],
];

for (const [language, value] of languageSamples) {
  test(`renders ${language} text into a non-empty OLED bitmap`, () => {
    const encoded = renderTextBitmap(value);
    const bitmap = Buffer.from(encoded, 'hex');
    assert.equal(bitmap.length, BYTES_PER_BITMAP);
    assert.ok(bitmap.some((byte) => byte !== 0));
  });
}

for (const [language, first, second] of glyphPairs) {
  test(`uses distinct ${language} glyphs instead of replacement boxes`, () => {
    assert.notEqual(renderTextBitmap(first), renderTextBitmap(second));
  });
}
