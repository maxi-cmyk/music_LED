const { renderTextBitmap } = require('./text-bitmap');

function displayState(
  { available, trackId, title, artist, progressMs, durationMs, isPlaying, albumArt },
  renderText,
) {
  const titleBitmap = renderText(title, 'title');
  const artistBitmap = renderText(artist, 'artist');
  return {
    available,
    trackId,
    title,
    artist,
    titleBitmap: titleBitmap.data,
    titleBitmapWidth: titleBitmap.width,
    artistBitmap: artistBitmap.data,
    artistBitmapWidth: artistBitmap.width,
    albumArtBitmap: albumArt?.data || null,
    albumArtWidth: albumArt?.width || 0,
    albumArtHeight: albumArt?.height || 0,
    progressMs,
    durationMs,
    isPlaying,
  };
}

function normalizePlayback(payload, renderText = renderTextBitmap, albumArt = null) {
  if (!payload || !payload.item) {
    return displayState({
      available: false,
      trackId: '',
      title: 'Nothing playing',
      artist: 'Open Spotify on any device',
      progressMs: 0,
      durationMs: 1,
      isPlaying: false,
      albumArt: null,
    }, renderText);
  }

  return displayState({
    available: true,
    trackId: payload.item.id || `${payload.item.name || ''}:${payload.item.artists?.[0]?.name || ''}`,
    title: payload.item.name || 'Unknown track',
    artist: (payload.item.artists || []).map((artist) => artist.name).join(', ') || 'Unknown artist',
    progressMs: payload.progress_ms || 0,
    durationMs: payload.item.duration_ms || 1,
    isPlaying: Boolean(payload.is_playing),
    albumArt,
  }, renderText);
}

module.exports = { normalizePlayback };
