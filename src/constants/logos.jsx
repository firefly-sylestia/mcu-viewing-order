import React from 'react';

/**
 * Universe brand marks used by the header switcher.
 *
 * These are hand-built inline SVG marks (no external assets, no runtime fetch)
 * so the pills stay crisp, currentColor-aware and instantly recognisable while
 * still being small enough to sit in a 38px pill.
 */

const svgProps = {
  'aria-hidden': true,
  focusable: 'false',
  style: { display: 'block' },
};

const DISPLAY_FONT = "'Arial Black', 'Helvetica Neue', Inter, system-ui, sans-serif";

export function MarvelLogo() {
  return (
    <svg viewBox="0 0 74 28" {...svgProps}>
      <rect width="74" height="28" rx="3" fill="#ec1d24" />
      <text
        x="37"
        y="20.2"
        textAnchor="middle"
        fontFamily={DISPLAY_FONT}
        fontWeight="900"
        fontSize="15.5"
        letterSpacing="0.4"
        fill="#ffffff"
      >
        MARVEL
      </text>
    </svg>
  );
}

export function SpiderMark() {
  return (
    <g>
      <ellipse cx="8" cy="10.2" rx="2.05" ry="3.1" fill="currentColor" />
      <circle cx="8" cy="5.5" r="1.65" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" fill="none">
        <path d="M6.2 8.1 2.5 5.7" />
        <path d="M6.1 9.7 1.5 9.3" />
        <path d="M6.2 11.2 2.2 13.4" />
        <path d="M6.5 12.2 3.8 15.1" />
        <path d="M9.8 8.1 13.5 5.7" />
        <path d="M9.9 9.7 14.5 9.3" />
        <path d="M9.8 11.2 13.8 13.4" />
        <path d="M9.5 12.2 12.2 15.1" />
      </g>
    </g>
  );
}

export function SonyLogo() {
  return (
    <svg viewBox="0 0 74 20" {...svgProps}>
      <g transform="translate(0 1.6) scale(0.9)">
        <SpiderMark />
      </g>
      <text
        x="19"
        y="15.4"
        fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
        fontWeight="700"
        fontSize="15"
        letterSpacing="1.9"
        fill="currentColor"
      >
        SONY
      </text>
    </svg>
  );
}

export function XMenLogo() {
  return (
    <svg viewBox="0 0 30 30" {...svgProps}>
      <circle cx="15" cy="15" r="12.9" fill="none" stroke="currentColor" strokeWidth="2.3" />
      <path
        d="M8.9 8.9 21.1 21.1M21.1 8.9 8.9 21.1"
        stroke="currentColor"
        strokeWidth="3.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DcLogo() {
  return (
    <svg viewBox="0 0 34 30" {...svgProps}>
      <circle cx="17" cy="15" r="12.6" fill="none" stroke="currentColor" strokeWidth="2.3" />
      <text
        x="17"
        y="19.4"
        textAnchor="middle"
        fontFamily={DISPLAY_FONT}
        fontWeight="900"
        fontSize="11.5"
        letterSpacing="-0.6"
        fill="currentColor"
      >
        DC
      </text>
    </svg>
  );
}

export const UNIVERSE_LOGOS = {
  marvel: <MarvelLogo />,
  sony: <SonyLogo />,
  xmen: <XMenLogo />,
  dc: <DcLogo />,
};
