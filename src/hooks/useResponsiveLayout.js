import { useEffect, useState } from 'react';

export function useResponsiveLayout() {
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : false));
  useEffect(() => {
    const onResize = () => setIsDesktopViewport(window.innerWidth >= 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return { isDesktopViewport };
}
