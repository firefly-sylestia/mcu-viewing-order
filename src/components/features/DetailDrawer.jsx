import React from 'react';
import { X } from '../../constants/icons';
import './DetailDrawer.css';

/**
 * DetailDrawer — slide-in detail panel per DESIGN_SPEC Section 5.5.
 *
 * Wraps detail content with a cinematic slide-in animation,
 * backdrop blur, and max-width container for stat cards layout.
 */
export default function DetailDrawer({ open, onClose, children }) {
  if (!open) return null;

  return (
    <aside className="detail-drawer" role="dialog" aria-modal="true" aria-label="Title details">
      <div className="detail-drawer__backdrop" onClick={onClose} aria-label="Close details" />
      <div className="detail-drawer__panel" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="detail-drawer__close" onClick={onClose} aria-label="Close details">
          <X size={18} />
        </button>

        {/* Scrollable content */}
        <div className="detail-drawer__content">
          {children}
        </div>
      </div>
    </aside>
  );
}
