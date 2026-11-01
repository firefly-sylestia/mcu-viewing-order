import React from 'react';
import { assetUrl } from '../utils/apiBase';

/**
 * Universe brand marks for the header switcher.
 *
 * Real vector logos (Marvel, Sony, X-Men, DC) served from /public/logos.
 * Marvel and DC keep their own brand colours; Sony and X-Men are monochrome
 * marks rendered through a CSS mask so they inherit the pill's ink colour in
 * both light and dark mode.
 */

const logoFile = (name) => assetUrl(`/logos/${name}`);

const ImageLogo = ({ file, height }) => (
  <img className="universe-logo-img" src={logoFile(file)} alt="" aria-hidden="true" style={{ '--logo-h': `${height}px` }} />
);

const MaskLogo = ({ file, width, height }) => (
  <span
    className="universe-logo-mask"
    aria-hidden="true"
    style={{ '--logo-url': `url("${logoFile(file)}")`, '--logo-w': `${width}px`, '--logo-h': `${height}px` }}
  />
);

export const UNIVERSE_LOGOS = {
  marvel: <ImageLogo file="marvel-logo.svg" height={16} />,
  sony: <MaskLogo file="sony-logo.svg" width={58} height={10} />,
  xmen: <MaskLogo file="xmen-logo.svg" width={16} height={15} />,
  dc: <ImageLogo file="dc-logo.svg" height={16} />,
};
