import React from 'react';
import './Analytics.css';
export default function Analytics({ children, open = false }) { return <section className={`feature-analytics ${open ? 'is-open' : ''}`}>{children}</section>; }
