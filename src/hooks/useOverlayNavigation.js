import { useEffect, useRef } from 'react';

export function useOverlayNavigation({
  sidebarOpen,
  settingsOpen,
  detailItem,
  analyticsOpen,
  onCloseDetail,
  onCloseAnalytics,
  onCloseSettings,
  onCloseSidebar,
}) {
  const hasHistoryEntryRef = useRef(false);

  useEffect(() => {
    const hasOverlay = Boolean(sidebarOpen || settingsOpen || detailItem || analyticsOpen);
    if (!hasOverlay) {
      hasHistoryEntryRef.current = false;
      return;
    }

    if (!hasHistoryEntryRef.current) {
      window.history.pushState({ mcuOverlay: true, hasOverlay }, '');
      hasHistoryEntryRef.current = true;
    }

    const onBack = () => {
      const currentScroll = window.scrollY;
      if (detailItem) onCloseDetail();
      else if (analyticsOpen) onCloseAnalytics();
      else if (settingsOpen) onCloseSettings();
      else if (sidebarOpen) onCloseSidebar();
      window.requestAnimationFrame(() => window.scrollTo({ top: currentScroll, behavior: 'instant' }));
      hasHistoryEntryRef.current = false;
    };

    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, [
    sidebarOpen,
    settingsOpen,
    detailItem,
    analyticsOpen,
    onCloseDetail,
    onCloseAnalytics,
    onCloseSettings,
    onCloseSidebar,
  ]);
}
