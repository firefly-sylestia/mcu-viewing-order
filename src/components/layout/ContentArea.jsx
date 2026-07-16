import React, { forwardRef, memo } from 'react';

/**
 * ContentArea — main scrollable content wrapper.
 * Offsets for sidebar (desktop) and topbar/bottombar (mobile).
 * Preserves overlay blocking, scroll containment, and layout CSS custom properties.
 */
export const ContentArea = memo(forwardRef(function ContentArea({
  children,
  sidebarOpen = false,
  overlayActive = false,
  blockHomeInteractions = false,
  performanceMode = false,
  headerCompact = false,
}, ref) {
  return (
    <main
      ref={ref}
      className={`app-scroll-shell app-content ${performanceMode ? 'scroll-performance' : ''} ${sidebarOpen ? 'sidebar-is-open' : ''}`}
      style={{
        overflow: overlayActive ? 'hidden' : 'visible',
        touchAction: overlayActive ? 'none' : 'pan-y',
        pointerEvents: blockHomeInteractions ? 'none' : 'auto',
        flex: '1 1 auto',
        '--content-max': '95vw',
        '--content-pad': '20px',
        '--sticky-offset': headerCompact ? '44px' : '72px',
      }}
    >
      {children}
    </main>
  );
}));

export default ContentArea;
