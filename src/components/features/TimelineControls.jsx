import React from 'react';
import './TimelineControls.css';
export default function TimelineControls({ children, label = 'Timeline controls' }) { return (<section className="timeline-controls glass-surface" aria-label={label}>{children}</section>); }
