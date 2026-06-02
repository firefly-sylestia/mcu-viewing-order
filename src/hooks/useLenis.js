import { useEffect } from 'react';

const isEditableTarget = (target) => {
  if (!(target instanceof Element)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(target.closest('[contenteditable], [contenteditable="true"], [contenteditable="plaintext-only"]'));
};

const hasScrollableParent = (target, { deltaX = 0, deltaY = 0, axis = 'y' } = {}) => {
  if (!(target instanceof Element)) return false;
  let node = target;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    const canScrollY = (overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1;
    const canScrollX = (overflowX === 'auto' || overflowX === 'scroll') && node.scrollWidth > node.clientWidth + 1;

    if (axis === 'x' && canScrollX) {
      const atLeft = node.scrollLeft <= 0;
      const atRight = node.scrollLeft + node.clientWidth >= node.scrollWidth - 1;
      if ((deltaX < 0 && !atLeft) || (deltaX > 0 && !atRight)) return true;
    }

    if (axis === 'y' && canScrollY) {
      const atTop = node.scrollTop <= 0;
      const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
      if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) return true;
    }

    node = node.parentElement;
  }
  return false;
};

const normalizeDeltaY = (event) => {
  if (event.deltaMode === 1) return event.deltaY * 16;
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
  return event.deltaY;
};

export const useLenis = () => {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const html = document.documentElement;
    html.classList.add('lenis-ready');

    let touchY = null;
    let touchX = null;
    let lastTouchTime = 0;
    let touchVelocity = 0;
    let momentumVelocity = 0;
    let targetY = window.scrollY;
    let rafId = null;

    const isOverlayActive = () => Boolean(window.__overlayActive);
    const clamp = (value) => Math.max(0, Math.min(value, document.documentElement.scrollHeight - window.innerHeight));

    const startLoop = () => {
      if (rafId == null) rafId = window.requestAnimationFrame(tick);
    };

    const tick = () => {
      const currentY = window.scrollY;
      targetY = clamp(targetY + momentumVelocity);
      momentumVelocity *= 0.92;

      const diff = targetY - currentY;
      const easing = Math.abs(diff) > 48 ? 0.2 : 0.16;
      const nextY = currentY + diff * easing;

      window.scrollTo(0, nextY);

      const closeEnough = Math.abs(diff) < 0.45;
      const almostStill = Math.abs(momentumVelocity) < 0.08;
      if (closeEnough && almostStill) {
        window.scrollTo(0, targetY);
        rafId = null;
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    const queueScroll = (deltaY) => {
      targetY = clamp(targetY + deltaY);
      startLoop();
    };

    const onWheel = (event) => {
      if (event.defaultPrevented || event.ctrlKey) return;
      if (isOverlayActive()) return;
      if (isEditableTarget(event.target)) return;

      const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.1;
      const deltaY = normalizeDeltaY(event);

      if (horizontalIntent) {
        if (hasScrollableParent(event.target, { deltaX: event.deltaX, axis: 'x' })) return;
        return;
      }

      if (!Number.isFinite(deltaY) || deltaY === 0) return;
      if (hasScrollableParent(event.target, { deltaY, axis: 'y' })) return;

      event.preventDefault();
      momentumVelocity = 0;
      queueScroll(deltaY * 0.98);
    };

    const onTouchStart = (event) => {
      if (event.touches.length !== 1 || isOverlayActive()) return;
      touchY = event.touches[0].clientY;
      touchX = event.touches[0].clientX;
      lastTouchTime = performance.now();
      touchVelocity = 0;
      momentumVelocity = 0;
      targetY = window.scrollY;
    };

    const onTouchMove = (event) => {
      if (event.touches.length !== 1 || isOverlayActive()) return;
      if (isEditableTarget(event.target)) return;

      if (touchY == null) {
        touchY = event.touches[0].clientY;
        touchX = event.touches[0].clientX;
        lastTouchTime = performance.now();
        return;
      }

      const now = performance.now();
      const nextY = event.touches[0].clientY;
      const nextX = event.touches[0].clientX;
      const deltaY = touchY - nextY;
      const deltaX = (touchX ?? nextX) - nextX;
      const dt = Math.max(8, now - lastTouchTime);

      touchY = nextY;
      touchX = nextX;
      lastTouchTime = now;

      if (!Number.isFinite(deltaY) || Math.abs(deltaY) < 0.8) return;
      const horizontalIntent = Math.abs(deltaX) > Math.abs(deltaY) * 1.1;
      if (horizontalIntent) return;
      if (hasScrollableParent(event.target, { deltaY, axis: 'y' })) return;

      event.preventDefault();
      window.scrollBy({ top: deltaY, left: 0, behavior: 'auto' });
      targetY = window.scrollY;
      touchVelocity = deltaY / dt;
    };

    const onTouchEnd = () => {
      touchY = null;
      touchX = null;
      targetY = window.scrollY;

      const projected = touchVelocity * 26;
      momentumVelocity = Math.max(-38, Math.min(38, projected));
      touchVelocity = 0;

      if (Math.abs(momentumVelocity) > 0.25) {
        targetY = clamp(targetY + momentumVelocity * 7.5);
        startLoop();
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      if (rafId != null) window.cancelAnimationFrame(rafId);
      html.classList.remove('lenis-ready');
    };
  }, []);
};
