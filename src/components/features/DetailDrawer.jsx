import React from 'react';
import './DetailDrawer.css';
export default function DetailDrawer({ open, children }) { return <aside className={`detail-drawer ${open ? 'is-open' : ''}`}>{children}</aside>; }
