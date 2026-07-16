import React, { memo, useRef, useEffect } from 'react';
import { ChevDown, Check } from '../../constants/icons';
import './SortDropdown.css';

/**
 * SortDropdown — cinema-styled sort menu per DESIGN_SPEC Section 5.6.
 * Pill trigger with chevron, popover menu with active indicator checkmark.
 */
export const SortDropdown = memo(function SortDropdown({
  sortBy = 'order',
  onSortChange,
  sortLabels = {},
  isOpen = false,
  onToggle,
  className = '',
}) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onToggle?.(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onToggle]);

  const currentLabel = sortLabels[sortBy] || 'Sort';

  return (
    <div className={`sort-dropdown ${className}`.trim()} ref={dropdownRef}>
      <button
        className={`sort-dropdown__trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => onToggle?.(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Sort by ${currentLabel}`}
      >
        <span className="sort-dropdown__label">{currentLabel}</span>
        <ChevDown
          size={11}
          className={`sort-dropdown__chevron ${isOpen ? 'is-open' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="sort-dropdown__menu" role="listbox" aria-label="Sort options">
          {Object.entries(sortLabels).map(([key, label]) => (
            <button
              key={key}
              className={`sort-dropdown__item ${sortBy === key ? 'is-active' : ''}`}
              role="option"
              aria-selected={sortBy === key}
              onClick={() => {
                onSortChange?.(key);
                onToggle?.(false);
              }}
            >
              <span className="sort-dropdown__item-label">{label}</span>
              {sortBy === key && (
                <Check size={14} className="sort-dropdown__check" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default SortDropdown;
