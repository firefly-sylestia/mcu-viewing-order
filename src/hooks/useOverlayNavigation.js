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
  hasInAppBackStep = false,
  onInAppBack = null,
}) {
  const hasHistoryEntryRef = useRef(false);

  useEffect(() => {
    const hasOverlay = Boolean(sidebarOpen || settingsOpen || detailItem || analyticsOpen);
    const hasBackStep = hasOverlay || hasInAppBackStep;
    if (!hasBackStep) {
      hasHistoryEntryRef.current = false;
      return;
    }

    if (!hasHistoryEntryRef.current) {
      window.history.pushState({ mcuOverlay: true, hasOverlay, hasInAppBackStep: Boolean(hasInAppBackStep) }, '');
      hasHistoryEntryRef.current = true;
    }

    const onBack = () => {
      const currentScroll = window.scrollY;
      if (detailItem) onCloseDetail();
      else if (analyticsOpen) onCloseAnalytics();
      else if (settingsOpen) onCloseSettings();
      else if (sidebarOpen) onCloseSidebar();
      else if (hasInAppBackStep && typeof onInAppBack === 'function') onInAppBack();
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
    hasInAppBackStep,
    onInAppBack,
  ]);
}
