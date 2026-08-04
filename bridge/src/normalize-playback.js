function normalizePlayback(payload) {
  if (!payload || !payload.item) {
    return {
      available: false,
      title: 'Nothing playing',
      artist: 'Open Spotify on any device',
      progressMs: 0,
      durationMs: 1,
      volumePercent: 0,
      isPlaying: false,
    };
  }

  return {
    available: true,
    title: payload.item.name || 'Unknown track',
    artist: (payload.item.artists || []).map((artist) => artist.name).join(', ') || 'Unknown artist',
    progressMs: payload.progress_ms || 0,
    durationMs: payload.item.duration_ms || 1,
    volumePercent: payload.device?.volume_percent || 0,
    isPlaying: Boolean(payload.is_playing),
  };
}

module.exports = { normalizePlayback };
