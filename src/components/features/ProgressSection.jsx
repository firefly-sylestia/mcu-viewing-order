import React from 'react';
import './ProgressSection.css';
export default function ProgressSection({ children, label = 'Journey progress' }) { return <section className="spectrum-progress progress-section" aria-label={label}>{children}</section>; }
