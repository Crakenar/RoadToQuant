// Confetti particle system — pure RN Animated, no third-party lib needed

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
}

const COLORS = ['#4D8EF0', '#00C47C', '#FF6B6B', '#FFD93D', '#C77DFF', '#FF9A3C', '#4ECDC4'];

export function generateParticles(count = 60, originX = 200): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: originX + (Math.random() - 0.5) * 100,
    y: 0,
    vx: (Math.random() - 0.5) * 8,
    vy: -(Math.random() * 12 + 6),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: Math.random() * 8 + 4,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 20,
  }));
}
