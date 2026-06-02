import React from 'react';
import './TitleCard.css';
export default function TitleCard({ children, className = '' }) { return <article className={`spectrum-title-card feature-title-card ${className}`.trim()}>{children}</article>; }
