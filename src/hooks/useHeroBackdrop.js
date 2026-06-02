import { useEffect, useState } from 'react';

export function useHeroBackdrop() {
  const [heroBackdropScale, setHeroBackdropScale] = useState(104);
  const [heroBackdropOpacity, setHeroBackdropOpacity] = useState(0.67);

  useEffect(() => {
    try {
      const savedScale = Number(localStorage.getItem('mcu-hero-backdrop-scale-v1'));
      const savedOpacity = Number(localStorage.getItem('mcu-hero-backdrop-opacity-v1'));
      if (Number.isFinite(savedScale)) setHeroBackdropScale(Math.max(100, Math.min(112, savedScale)));
      if (Number.isFinite(savedOpacity)) {
        const clampedOpacity = Math.max(0.12, Math.min(1, savedOpacity));
        setHeroBackdropOpacity(clampedOpacity > 0.75 ? 0.67 : clampedOpacity);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('mcu-hero-backdrop-scale-v1', String(heroBackdropScale)); } catch {}
  }, [heroBackdropScale]);

  useEffect(() => {
    try { localStorage.setItem('mcu-hero-backdrop-opacity-v1', String(heroBackdropOpacity)); } catch {}
  }, [heroBackdropOpacity]);

  return { heroBackdropScale, setHeroBackdropScale, heroBackdropOpacity, setHeroBackdropOpacity };
}
