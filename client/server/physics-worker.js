export function stepBodies(bodies, dt) {
  return bodies.map((b) => ({ ...b, x: b.x + b.vx * dt, y: b.y + b.vy * dt }));
}
