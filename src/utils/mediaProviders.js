export const STREAM_PROVIDERS = [
  { id: 'cinesrc', name: 'CineSrc', movie: true, tv: true, sync: true },
  { id: 'vidfast', name: 'VidFast', movie: true, tv: true, sync: false, qualityFocus: true },
  { id: 'vidsrc', name: 'VidSrc', movie: true, tv: true, sync: false },
  { id: 'vidrock', name: 'VidRock', movie: true, tv: true, sync: false },
  { id: '2embed', name: '2Embed', movie: true, tv: true, sync: false },
];

export const getProvider = id => STREAM_PROVIDERS.find(provider => provider.id === id) || STREAM_PROVIDERS[0];
export const getProviderFallbacks = mediaType => mediaType === 'tv'
  ? ['vidsrc', 'vidfast', 'vidrock', '2embed']
  : ['vidfast', 'vidsrc', 'vidrock', '2embed'];

export const buildPlayerUrl = ({ provider = 'cinesrc', mediaType = 'movie', tmdbId, title, season = 1, episode = 1, progressSeconds = 0 }) => {
  if (!tmdbId) return '';
  const type = mediaType === 'tv' ? 'tv' : 'movie';
  const id = encodeURIComponent(String(tmdbId));
  const ep = Math.max(1, Number(episode) || 1);
  const sn = Math.max(1, Number(season) || 1);
  const startAt = Math.max(0, Math.floor(Number(progressSeconds) || 0));

  if (provider === 'vidfast') {
    const url = type === 'tv'
      ? new URL(`https://vidfast.vc/tv/${id}/${sn}/${ep}`)
      : new URL(`https://vidfast.vc/movie/${id}`);
    url.searchParams.set('autoPlay', 'true');
    if (startAt > 5) url.searchParams.set('startAt', String(startAt));
    return url.toString();
  }
  if (provider === 'vidsrc') {
    const url = type === 'tv'
      ? new URL(`https://vidsrc.mov/embed/tv/${id}/${sn}/${ep}`)
      : new URL(`https://vidsrc.mov/embed/movie/${id}`);
    url.searchParams.set('autoplay', '1');
    if (startAt > 5) url.searchParams.set('startAt', String(startAt));
    return url.toString();
  }
  if (provider === 'vidrock') {
    return type === 'tv'
      ? `https://vidrock.to/tv/${id}/${sn}/${ep}`
      : `https://vidrock.to/movie/${id}`;
  }
  if (provider === '2embed') {
    return type === 'tv'
      ? `https://www.2embed.cc/embedtv/${id}&s=${sn}&e=${ep}`
      : `https://www.2embed.cc/embed/${id}`;
  }

  const url = type === 'tv'
    ? new URL(`https://cinesrc.st/embed/tv/${id}`)
    : new URL(`https://cinesrc.st/embed/movie/${id}`);
  if (type === 'tv') {
    url.searchParams.set('s', String(sn));
    url.searchParams.set('e', String(ep));
  }
  url.searchParams.set('autoplay', 'true');
  url.searchParams.set('controls', 'true');
  url.searchParams.set('back', 'close');
  url.searchParams.set('autonext', 'true');
  url.searchParams.set('color', '#e50914');
  if (startAt > 5) url.searchParams.set('seek', String(startAt));
  return url.toString();
};

// Legacy MoviePire download route retained as a separate external destination.
// None of CineSrc, VidFast, VidSrc, VidRock or 2Embed documents a download API.
export const buildDownloadUrl = ({ mediaType, tmdbId, season = 1, episode }) => {
  if (!tmdbId) return '';
  if (mediaType === 'tv') {
    if (!episode) return '';
    return `https://moviepire.sc/download/tv/${encodeURIComponent(tmdbId)}/${season}/${episode}`;
  }
  return `https://moviepire.sc/download/movie/${encodeURIComponent(tmdbId)}`;
};
