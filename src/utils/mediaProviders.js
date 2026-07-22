export const buildPlayerUrl = ({ provider, mediaType, tmdbId, title, season = 1, episode, progressSeconds = 0 }) => {
  const type = mediaType === 'tv' ? 'tv' : 'movie';
  const identifier = tmdbId || encodeURIComponent(title || '');
  const params = new URLSearchParams();

  if (provider === 'moviepire') {
    params.set('server', 'blaze');
    params.set('autoplay', '1');
    const path = type === 'tv' && episode
      ? `tv/${identifier}/${season}/${episode}`
      : `${type}/${identifier}`;
    return `https://video.moviepire.co/embed/${path}?${params.toString()}`;
  }

  // Videasy params per their official docs
  if (progressSeconds > 5) params.set('progress', String(progressSeconds));
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
