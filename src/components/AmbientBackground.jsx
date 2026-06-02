import React from 'react';

const butterflyParticles = Array.from({ length: 10 }, (_, index) => ({
  id: index,
  style: {
    '--particle-x': `${8 + ((index * 17) % 84)}vw`,
    '--particle-delay': `${index * -3.7}s`,
    '--particle-duration': `${54 + (index % 5) * 9}s`,
    '--particle-size': `${12 + (index % 4) * 4}px`,
    '--particle-hue': index % 3 === 0 ? 'var(--accent-cyan)' : index % 3 === 1 ? 'var(--accent-violet)' : 'var(--accent-gold)',
  },
}));

export default function AmbientBackground() {
  return (
    <div className="spectrum-ambient" aria-hidden="true">
      <div className="spectrum-ambient__orbs">
        <span className="spectrum-orb spectrum-orb--morpho" />
        <span className="spectrum-orb spectrum-orb--cyan" />
        <span className="spectrum-orb spectrum-orb--violet" />
        <span className="spectrum-orb spectrum-orb--crimson" />
        <span className="spectrum-orb spectrum-orb--gold" />
      </div>
      <div className="spectrum-ambient__dust" />
      <div className="spectrum-ambient__noise" />
      <div className="spectrum-ambient__butterflies">
        {butterflyParticles.map((particle) => <i key={particle.id} style={particle.style} />)}
      </div>
    </div>
  );
}
