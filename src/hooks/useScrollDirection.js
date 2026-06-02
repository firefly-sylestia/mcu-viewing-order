import { useEffect, useRef, useState } from 'react';

export function useScrollDirection(threshold = 10) {
  const [scrollDirection, setScrollDirection] = useState('up');
  const [isNearTop, setIsNearTop] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;

      setIsNearTop(currentScrollY < 80);

      if (Math.abs(delta) >= threshold) {
        setScrollDirection(delta > 0 ? 'down' : 'up');
        lastScrollY.current = currentScrollY > 0 ? currentScrollY : 0;
      }

      ticking.current = false;
    };

    const onScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [threshold]);

  return {
    scrollDirection,
    isNearTop,
    shouldShowNav: scrollDirection === 'up' || isNearTop,
  };
}

export default useScrollDirection;
