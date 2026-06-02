import { useState } from 'react';

export function usePosterCache() {
  const [posterCache, setPosterCache] = useState({});
  const [localPosterMap, setLocalPosterMap] = useState({});
  return { posterCache, setPosterCache, localPosterMap, setLocalPosterMap };
}
