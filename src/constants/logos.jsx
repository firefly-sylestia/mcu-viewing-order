import React from 'react';
import marvelSvg from '../../public/logos/marvel-logo.svg?raw';
import sonySvg from '../../public/logos/sony-logo.svg?raw';
import xmenSvg from '../../public/logos/xmen-logo.svg?raw';
import dcSvg from '../../public/logos/dc-logo.svg?raw';

// Inline SVG data keeps brand marks available from the app bundle, even offline.
const embeddedLogo = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/<\?xml[^>]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, ''))}`;
const Logo = ({ svg, className = '', style = {} }) => (
  <img className={`universe-logo-img ${className}`} src={embeddedLogo(svg)} alt="" aria-hidden="true" draggable="false" style={style} />
);

export const UNIVERSE_LOGOS = {
  marvel: <Logo svg={marvelSvg} style={{ '--logo-h': '16px' }} />,
  sony: <Logo svg={sonySvg} className="universe-logo-monochrome" style={{ '--logo-h': '11px', '--logo-w': '60px' }} />,
  xmen: <Logo svg={xmenSvg} className="universe-logo-monochrome" style={{ '--logo-h': '27px', '--logo-w': '30px' }} />,
  dc: <Logo svg={dcSvg} style={{ '--logo-h': '18px' }} />,
};
