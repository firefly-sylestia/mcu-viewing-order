import React from 'react';
import './TitleCard.css';
export default function TitleCard({ children, className = '', variant = 'compact' }) { return <article className={`spectrum-title-card spectrum-title-card--${variant} ${className}`.trim()}>{children}</article>; }
