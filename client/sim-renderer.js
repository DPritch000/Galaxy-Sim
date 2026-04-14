function drawBlackHole(ctx, camera, width, height, blackHoleStrength, blackHoleBody) {
  if (blackHoleStrength <= 0 || !blackHoleBody) {
    return;
  }

  const center = camera.project(blackHoleBody);
  if (!center) {
    return;
  }

  const glowRadius = Math.max(6, Math.min(28, 6 + blackHoleStrength * 0.012));
  const coreRadius = Math.max(2, Math.min(8, 2 + blackHoleStrength * 0.0025));

  const glow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, glowRadius);
  glow.addColorStop(0, "rgba(255, 244, 200, 0.18)");
  glow.addColorStop(0.45, "rgba(255, 170, 80, 0.12)");
  glow.addColorStop(1, "rgba(255, 120, 40, 0)");

  ctx.globalAlpha = 1;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(center.x, center.y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(8, 8, 12, 0.96)";
  ctx.beginPath();
  ctx.arc(center.x, center.y, coreRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 190, 110, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(center.x, center.y, coreRadius + 1.5, 0, Math.PI * 2);
  ctx.stroke();
}

export function renderFrame(ctx, bodies, width, height, camera, blackHoleStrength = 0, blackHoleBody = null) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#05070f";
  ctx.fillRect(0, 0, width, height);

  drawBlackHole(ctx, camera, width, height, blackHoleStrength, blackHoleBody);

  const count = bodies.length;
  const stride = count > 90000 ? 4 : count > 50000 ? 3 : count > 20000 ? 2 : 1;

  for (let i = 0; i < count; i += stride) {
    const body = bodies[i];
    const p = camera.project(body);
    if (!p) {
      continue;
    }

    const alpha = Math.max(0.28, Math.min(1, 1.08 - p.depth / 3000));
    const size = body.radius * (body.isBulge ? 0.82 : 1) * (0.3 + p.scale * 1.2);
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
