import React, { forwardRef, memo } from 'react';
import { Menu, Settings, X } from '../../constants/icons';

/**
 * Sidebar — main navigation panel.
 * Desktop: fixed left, 300px wide, togglable to 64px icon-only.
 * Mobile (<768px): overlay slide-out, 80vw max, with backdrop.
 */
export const Sidebar = memo(forwardRef(function Sidebar({
  open = false,
  onClose,
  onToggle,
  onOpenSettings,
  controlsHidden = false,
  children,
}, ref) {
  return (
    <>
      {/* Toggle cluster — always visible */}
      <div
        className="sidebar-control-cluster"
        style={controlsHidden ? { opacity: 0, pointerEvents: 'none', visibility: 'hidden' } : undefined}
      >
        <button
          className="theme-btn sidebar-toggle-btn"
          onClick={onToggle}
          aria-label="Toggle sidebar menu"
        >
          <Menu size={18} />
        </button>
        <button
          className="theme-btn sidebar-toggle-btn settings-toggle-btn"
          onClick={onOpenSettings}
          aria-label="Open settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Backdrop — mobile only */}
      <div
        className="sidebar-backdrop"
        data-state={open ? 'open' : 'closed'}
        onPointerDown={(e) => { e.preventDefault(); onClose?.(); }}
      />

      {/* Sidebar panel */}
      <aside
        ref={ref}
        data-state={open ? 'open' : 'closed'}
        aria-hidden={!open}
        className="sidebar-menu"
      >
        {/* Close button inside sidebar (mobile) */}
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X size={16} />
        </button>

        <div className="sidebar-scroll">
          {children}
        </div>
      </aside>
    </>
  );
}));

export default Sidebar;
