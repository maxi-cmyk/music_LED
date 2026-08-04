const { renderTextBitmap } = require('./text-bitmap');

function displayState(
  { available, title, artist, progressMs, durationMs, volumePercent, isPlaying },
  renderText,
) {
  return {
    available,
    title,
    artist,
    titleBitmap: renderText(title),
    artistBitmap: renderText(artist),
    progressMs,
    durationMs,
    volumePercent,
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
      volumePercent: 0,
      isPlaying: false,
    }, renderText);
  }

  return displayState({
    available: true,
    title: payload.item.name || 'Unknown track',
    artist: (payload.item.artists || []).map((artist) => artist.name).join(', ') || 'Unknown artist',
    progressMs: payload.progress_ms || 0,
    durationMs: payload.item.duration_ms || 1,
    volumePercent: payload.device?.volume_percent || 0,
    isPlaying: Boolean(payload.is_playing),
  }, renderText);
}

module.exports = { normalizePlayback };
