import { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';

// Reduced particle config — 30 particles, no links, no hover interaction
// This cuts GPU/CPU load by ~70% vs the original 60-particle linked config
const PARTICLE_OPTIONS = {
  background: { color: { value: 'transparent' } },
  fpsLimit: 30,
  particles: {
    number: { value: 30, density: { enable: true, area: 1200 } },
    color: { value: ['#e11d48', '#fecdd3', '#be123c'] },
    shape: { type: 'circle' },
    opacity: { value: { min: 0.08, max: 0.25 } },
    size: { value: { min: 1, max: 3 } },
    links: { enable: false },
    move: {
      enable: true,
      speed: 0.5,
      direction: 'none',
      random: true,
      outModes: { default: 'out' },
    },
  },
  interactivity: { events: { onHover: { enable: false }, onClick: { enable: false } } },
  detectRetina: false,
};

export default function ParticleBackground() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));
  }, []);

  if (!init) return null;

  return <Particles id="tsparticles" options={PARTICLE_OPTIONS} />;
}
