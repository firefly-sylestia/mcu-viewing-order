import React from 'react';
import './Header.css';
export default function Header({ children, title = 'Marvel Spectrum', subtitle, actions }) {
  return <header className="spectrum-header feature-header" aria-label="Application header"><div className="spectrum-header__brand"><span className="spectrum-orb" aria-hidden="true"/><div>{title && <h1>{title}</h1>}{subtitle && <p>{subtitle}</p>}</div></div>{actions && <div className="spectrum-header__actions">{actions}</div>}{children}</header>;
}
