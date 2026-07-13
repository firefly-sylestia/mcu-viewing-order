import React from 'react';
import './Header.css';
export default function Header({ children, title, subtitle, actions }) { return (<header className="feature-header glass-surface" aria-label="Application header"><div className="feature-header__text">{title && <h1 className="feature-header__title">{title}</h1>}{subtitle && <p className="feature-header__subtitle">{subtitle}</p>}</div>{actions && <div className="feature-header__actions">{actions}</div>}{children}</header>); }
