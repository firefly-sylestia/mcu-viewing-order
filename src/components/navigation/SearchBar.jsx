import React, { memo, useRef } from 'react';
import { Search, X } from '../../constants/icons';
import './SearchBar.css';

/**
 * SearchBar — pill-shaped search input per DESIGN_SPEC Section 5.6.
 * Cinema design: translucent surface bg, accent border on focus, subtle glow.
 */
export const SearchBar = memo(function SearchBar({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search titles...',
  className = '',
}) {
  const inputRef = useRef(null);

  const handleClear = () => {
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className={`search-bar ${className}`.trim()}>
      <Search size={16} className="search-bar__icon" />
      <input
        ref={inputRef}
        className="search-bar__input"
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        aria-label="Search titles"
      />
      {value && (
        <button
          className="search-bar__clear"
          onClick={handleClear}
          aria-label="Clear search"
          type="button"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
});

export default SearchBar;
