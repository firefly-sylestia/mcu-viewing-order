import React from 'react';
import './AmbientBackground.css';

const orbs = ['morpho', 'cyan', 'violet', 'crimson', 'gold'];
const butterflies = Array.from({ length: 10 }, (_, index) => index + 1);

export default function AmbientBackground() {
  return (
    <div className="ambient-spectrum" aria-hidden="true">
      <div className="ambient-spectrum__orbs">
        {orbs.map((orb) => <span key={orb} className={`ambient-spectrum__orb ambient-spectrum__orb--${orb}`} />)}
      </div>
      <div className="ambient-spectrum__dust" />
      <div className="ambient-spectrum__butterflies">
        {butterflies.map((index) => <span key={index} className={`ambient-butterfly ambient-butterfly--${index}`} />)}
      </div>
      <div className="ambient-spectrum__noise" />
    </div>
  );
}
