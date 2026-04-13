self.onmessage = (event) => {
  const { bodies, dt } = event.data;
  const next = bodies.map((b) => ({ ...b, x: b.x + b.vx * dt, y: b.y + b.vy * dt }));
  self.postMessage({ bodies: next });
};
