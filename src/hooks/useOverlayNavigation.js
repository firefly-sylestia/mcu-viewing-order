import { useEffect } from 'react';

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
  useEffect(() => {
    const hasOverlay = Boolean(sidebarOpen || settingsOpen || detailItem || analyticsOpen);
    const hasBackStep = hasOverlay || hasInAppBackStep;
    if (!hasBackStep) return;

    window.history.pushState({ mcuOverlay: true, hasOverlay, hasInAppBackStep: Boolean(hasInAppBackStep) }, '');

    const onBack = () => {
      if (detailItem) onCloseDetail();
      else if (analyticsOpen) onCloseAnalytics();
      else if (settingsOpen) onCloseSettings();
      else if (sidebarOpen) onCloseSidebar();
      else if (hasInAppBackStep && typeof onInAppBack === 'function') onInAppBack();
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
