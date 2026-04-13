export function getSystemEnergy(bodies) {
  return bodies.reduce((sum, b) => sum + 0.5 * b.mass * (b.vx * b.vx + b.vy * b.vy), 0);
}
