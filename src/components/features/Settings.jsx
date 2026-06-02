import React from 'react';
import './Settings.css';
export default function Settings({ children, open = false }) { return <section className={`feature-settings ${open ? 'is-open' : ''}`}>{children}</section>; }
