import React from 'react';
import './Header.css';
export default function Header({ children, title = 'Marvel Spectrum', subtitle = 'Your cinematic path through every phase, arc, and universe.', actions }) {
  return (<header className="spectrum-header" aria-label="Application header"><div className="spectrum-header__brand"><span className="spectrum-orb" aria-hidden="true" /><div><p>Marvel Spectrum</p>{title && <h1>{title}</h1>}{subtitle && <span>{subtitle}</span>}</div></div>{actions && <div className="spectrum-header__actions">{actions}</div>}{children}</header>);
}
