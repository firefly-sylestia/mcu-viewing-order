import React from 'react';
import './ProgressSection.css';
export default function ProgressSection({ children, label = 'Progress overview' }) { return <section className="progress-section glass-surface" aria-label={label}>{children}</section>; }
