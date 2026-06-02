import React from 'react';
import './Analytics.css';
export default function Analytics({ children, open = false }) { return <section className={`spectrum-analytics feature-analytics ${open ? 'is-open' : ''}`}>{children}</section>; }
