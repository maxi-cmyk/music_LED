const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SCREEN_WIDTH,
  TITLE_HEIGHT,
  ARTIST_HEIGHT,
  MAX_BITMAP_WIDTH,
  renderTextBitmap,
} = require('../src/text-bitmap');

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
    const rendered = renderTextBitmap(value, 'title');
    const bitmap = Buffer.from(rendered.data, 'hex');
    assert.equal(rendered.height, TITLE_HEIGHT);
    assert.equal(bitmap.length, (rendered.width * rendered.height) / 8);
    assert.equal(rendered.width % 8, 0);
    assert.ok(bitmap.some((byte) => byte !== 0));
  });
}

for (const [language, first, second] of glyphPairs) {
  test(`uses distinct ${language} glyphs instead of replacement boxes`, () => {
    assert.notEqual(renderTextBitmap(first, 'title').data, renderTextBitmap(second, 'title').data);
  });
}

test('preserves full long text width for firmware marquee animation', () => {
  const rendered = renderTextBitmap('A very long song title that must move smoothly from right to left', 'title');
  assert.ok(rendered.width > SCREEN_WIDTH);
  assert.ok(rendered.width <= MAX_BITMAP_WIDTH);
});

test('renders artist text smaller and in a distinct regular-weight bitmap', () => {
  const value = 'A moderately long artist name';
  const title = renderTextBitmap(value, 'title');
  const artist = renderTextBitmap(value, 'artist');
  assert.equal(artist.height, ARTIST_HEIGHT);
  assert.ok(artist.width < title.width);
  assert.notEqual(artist.data, title.data);
});
