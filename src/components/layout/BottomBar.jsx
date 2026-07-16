import React, { memo } from 'react';

/**
 * BottomBar — fixed bottom tab bar for mobile (<768px).
 * Replaces sidebar navigation with 3-4 tab icons.
 */
export const BottomBar = memo(function BottomBar({
  tabs = [],
  activeTab = '',
  onTabChange,
}) {
  if (!tabs.length) return null;

  return (
    <nav className="bottombar" aria-label="Main navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`bottombar-tab ${activeTab === tab.id ? 'is-active' : ''}`}
          onClick={() => onTabChange?.(tab.id)}
          aria-label={tab.label}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          <span className="bottombar-tab-icon">{tab.icon}</span>
          <span className="bottombar-tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
});

export default BottomBar;
