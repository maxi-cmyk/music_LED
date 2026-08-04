const { renderTextBitmap } = require('./text-bitmap');

function displayState(
  { available, title, artist, progressMs, durationMs, isPlaying },
  renderText,
) {
  const titleBitmap = renderText(title, 'title');
  const artistBitmap = renderText(artist, 'artist');
  return {
    available,
    title,
    artist,
    titleBitmap: titleBitmap.data,
    titleBitmapWidth: titleBitmap.width,
    artistBitmap: artistBitmap.data,
    artistBitmapWidth: artistBitmap.width,
    progressMs,
    durationMs,
    isPlaying,
  };
}

function normalizePlayback(payload, renderText = renderTextBitmap) {
  if (!payload || !payload.item) {
    return displayState({
      available: false,
      title: 'Nothing playing',
      artist: 'Open Spotify on any device',
      progressMs: 0,
      durationMs: 1,
      isPlaying: false,
    }, renderText);
  }

  return displayState({
    available: true,
    title: payload.item.name || 'Unknown track',
    artist: (payload.item.artists || []).map((artist) => artist.name).join(', ') || 'Unknown artist',
    progressMs: payload.progress_ms || 0,
    durationMs: payload.item.duration_ms || 1,
    isPlaying: Boolean(payload.is_playing),
  }, renderText);
}

module.exports = { normalizePlayback };
