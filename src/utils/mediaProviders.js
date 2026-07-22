export const buildPlayerUrl = ({ provider, mediaType, tmdbId, title, season = 1, episode }) => {
  const type = mediaType === 'tv' ? 'tv' : 'movie';
  const identifier = tmdbId || encodeURIComponent(title || '');
  const params = new URLSearchParams({ autoplay: '1' });

  if (provider === 'moviepire') {
    // server=blaze uses MP4 direct links (better A/V sync than HLS)
    params.set('server', 'blaze');
    const path = type === 'tv' && episode
      ? `tv/${identifier}/${season}/${episode}`
      : `${type}/${identifier}`;
    return `https://video.moviepire.co/embed/${path}?${params.toString()}`;
  }

  // NOTE: progress param intentionally omitted — seeking on load causes
  // audio/video desync in cross-origin iframe players.
  const path = type === 'tv' && episode
    ? `${type}/${identifier}/${season}/${episode}`
    : `${type}/${identifier}`;
  return `https://player.videasy.net/${path}?${params.toString()}`;
};

export const buildDownloadUrl = ({ mediaType, tmdbId, season = 1, episode }) => {
  if (!tmdbId) return '';
  if (mediaType === 'tv') {
    if (!episode) return '';
    return `https://video.moviepire.co/download/tv/${tmdbId}/${season}/${episode}`;
  }
  return `https://video.moviepire.co/download/movie/${tmdbId}`;
};
