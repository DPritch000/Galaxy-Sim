export function renderFrame(ctx, bodies, width, height, camera) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#05070f";
  ctx.fillRect(0, 0, width, height);

  const count = bodies.length;
  const stride = count > 90000 ? 4 : count > 50000 ? 3 : count > 20000 ? 2 : 1;

  for (let i = 0; i < count; i += stride) {
    const body = bodies[i];
    const p = camera.project(body);
    if (!p) {
      continue;
    }

    const alpha = Math.max(0.28, Math.min(1, 1.08 - p.depth / 3000));
    const size = body.radius * (0.3 + p.scale * 1.2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = body.color;
    if (size < 0.7) {
      ctx.fillRect(p.x, p.y, 1, 1);
    } else {
      ctx.fillRect(p.x, p.y, 2, 2);
    }
  }

  ctx.globalAlpha = 1;
}
