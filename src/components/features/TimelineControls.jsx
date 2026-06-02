import React from 'react';
import './TimelineControls.css';
export default function TimelineControls({ children, label = 'Timeline command bar' }) { return (<section className="spectrum-command-bar" aria-label={label}>{children}</section>); }
