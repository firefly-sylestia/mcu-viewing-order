import React, { memo } from 'react';
import { Menu, Search, Settings } from '../../constants/icons';

/**
 * TopBar — fixed top navigation bar for mobile (<768px).
 * Shows logo, search toggle, and overflow menu.
 */
export const TopBar = memo(function TopBar({
  title = 'MCU Tracker',
  onMenuToggle,
  onSearchToggle,
  onSettingsToggle,
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="topbar-icon-btn"
          onClick={onMenuToggle}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <span className="topbar-title">{title}</span>
      </div>

      <div className="topbar-right">
        <button
          className="topbar-icon-btn"
          onClick={onSearchToggle}
          aria-label="Search"
        >
          <Search size={18} />
        </button>
        <button
          className="topbar-icon-btn"
          onClick={onSettingsToggle}
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
});

export default TopBar;
