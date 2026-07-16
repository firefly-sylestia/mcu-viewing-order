import React, { memo } from 'react';
import './FilterChips.css';

/**
 * FilterChips — pill-shaped filter toggle bar per DESIGN_SPEC Section 5.6.
 * Shows phase, type, and status filters as horizontal scrollable pill row.
 */
export const FilterChips = memo(function FilterChips({
  phases = [],
  activePhase = 0,
  onPhaseChange,
  typeFilter = null,
  onTypeChange,
  statusFilter = null,
  onStatusChange,
  typeMeta = {},
  statusMeta = {},
  className = '',
}) {
  const phaseOptions = [{ id: 0, label: 'All', name: 'All Phases' }, ...phases];

  return (
    <div className={`filter-chips ${className}`.trim()}>
      {/* Phase chips */}
      <div className="filter-chips__group">
        {phaseOptions.map((ph) => (
          <button
            key={ph.id}
            className={`filter-chip ${activePhase === ph.id ? 'is-active' : ''}`}
            onClick={() => onPhaseChange?.(ph.id)}
            aria-pressed={activePhase === ph.id}
          >
            {ph.label === 'All' ? 'All' : `Phase ${ph.id}`}
          </button>
        ))}
      </div>

      {/* Type chips */}
      <div className="filter-chips__separator" aria-hidden="true" />
      <div className="filter-chips__group">
        <button
          className={`filter-chip filter-chip--type ${!typeFilter ? 'is-active' : ''}`}
          onClick={() => onTypeChange?.(null)}
          aria-pressed={!typeFilter}
        >
          All
        </button>
        {Object.entries(typeMeta).map(([key, meta]) => (
          <button
            key={key}
            className={`filter-chip filter-chip--type ${typeFilter === key ? 'is-active' : ''}`}
            onClick={() => onTypeChange?.(key)}
            aria-pressed={typeFilter === key}
            style={typeFilter === key ? { '--chip-accent': meta.color } : undefined}
          >
            {meta.label}
          </button>
        ))}
      </div>

      {/* Status chips */}
      <div className="filter-chips__separator" aria-hidden="true" />
      <div className="filter-chips__group">
        <button
          className={`filter-chip filter-chip--status ${!statusFilter ? 'is-active' : ''}`}
          onClick={() => onStatusChange?.(null)}
          aria-pressed={!statusFilter}
        >
          All
        </button>
        {Object.entries(statusMeta).map(([key, meta]) => (
          <button
            key={key}
            className={`filter-chip filter-chip--status ${statusFilter === key ? 'is-active' : ''}`}
            onClick={() => onStatusChange?.(key)}
            aria-pressed={statusFilter === key}
            style={statusFilter === key ? { '--chip-accent': meta.color } : undefined}
          >
            {meta.label}
          </button>
        ))}
      </div>
    </div>
  );
});

export default FilterChips;
