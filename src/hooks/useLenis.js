import { useEffect } from 'react';

// Lightweight native scroll enhancement — only smooth-scrolls wheel events
// without fighting the browser's native momentum/kinetic scrolling.
// Disabled on mobile (touch devices use native overscroll) and when
// prefers-reduced-motion is set.
export const useLenis = () => {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (prefersReduced || isTouchDevice) return undefined;

    const html = document.documentElement;
    html.classList.add('lenis-ready');

    const isOverlayActive = () => Boolean(window.__overlayActive);

    const onWheel = (event) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;
      if (isOverlayActive()) return;

      // Don't hijack scroll inside interactive elements or scrollable sub-containers
      const target = event.target;
      if (target instanceof Element) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (target.closest('[contenteditable], [contenteditable="true"]')) return;

        // Check for scrollable parents
        let node = target;
        while (node && node !== document.body) {
          const style = window.getComputedStyle(node);
          const overflowY = style.overflowY;
          if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
            const atTop = node.scrollTop <= 0;
            const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
            const scrollingDown = event.deltaY > 0;
            if ((scrollingDown && !atBottom) || (!scrollingDown && !atTop)) return;
          }
          node = node.parentElement;
        }
      }

      // Use native smooth scrolling — browser handles momentum natively
      event.preventDefault();
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      window.scrollBy({ top: delta, behavior: 'auto' });
    };

    window.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', onWheel);
      html.classList.remove('lenis-ready');
    };
  }, []);
};
