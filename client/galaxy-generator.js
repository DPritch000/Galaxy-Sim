import { randomRange } from "./sim-utils.js";
import { SIM_CONFIG } from "./sim-config.js";

function randomNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function sampleExponential(scale, maxValue) {
  const value = -scale * Math.log(1 - Math.random());
  return Math.min(value, maxValue);
}

export function circularVelocitySquared(
  radius,
  galaxyRadius,
  gravityStrength,
  blackHoleStrength,
  darkMatterStrength,
  count
) {
  const r = Math.max(1, radius);
  const { coreRadius, haloCoreRadius } = SIM_CONFIG.structure;
  const { stellar, halo } = SIM_CONFIG.forceScale;
  const diskScale = galaxyRadius * 0.32;

  const vCoreSq = blackHoleStrength * ((r * r) / Math.pow(r * r + coreRadius * coreRadius, 1.5));
  const vHaloSq = darkMatterStrength * halo * ((r * r) / (r * r + haloCoreRadius * haloCoreRadius));
  const diskAmplitude = gravityStrength * count * stellar;
  const vDiskSq = diskAmplitude * (1 - Math.exp(-r / Math.max(1, diskScale)));

  return Math.max(0, vCoreSq + vHaloSq + vDiskSq);
}

export function generateBodies(
  count,
  width,
  height,
  gravityStrength = 6,
  blackHoleStrength = 60,
  darkMatterStrength = 2200,
  armTightness = 3.6
) {
  const bodies = [];
  const densityScale = Math.min(1, 220 / Math.max(count, 1));
  const minRadius = 0.12 + 0.08 * densityScale;
  const maxRadius = 0.28 + 0.16 * densityScale;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const galaxyRadius = Math.min(width, height) * 0.45;
  const bulgeFraction = 0.18;
  const bulgeInnerRadius = 18;
  const armCount = 2;
  const armSpread = 0.22;

  for (let i = 0; i < count; i += 1) {
    const temperature = randomRange(0, 1);
    const isBulge = Math.random() < bulgeFraction;
    const radius = isBulge
      ? bulgeInnerRadius + galaxyRadius * 0.28 * Math.pow(Math.random(), 0.75)
      : sampleExponential(galaxyRadius * 0.18, galaxyRadius);

    const armIndex = Math.floor(Math.random() * armCount);
    const armBaseAngle = (armIndex / armCount) * Math.PI * 2;
    const spiralAngle = armBaseAngle + (radius / galaxyRadius) * armTightness * Math.PI * 2;
    const angle = isBulge
      ? randomRange(0, Math.PI * 2)
      : spiralAngle + randomNormal() * armSpread;

    const z = isBulge ? randomNormal() * 18 : randomNormal() * 10;
    const radialJitter = isBulge ? 2.2 : 1.6;
    const x = cx + Math.cos(angle) * radius + randomNormal() * radialJitter;
    const y = cy + Math.sin(angle) * radius + randomNormal() * radialJitter;

    const r = Math.max(8, Math.hypot(x - cx, y - cy));
    const vCirc = Math.sqrt(
      circularVelocitySquared(r, galaxyRadius, gravityStrength, blackHoleStrength, darkMatterStrength, count)
    ) * (isBulge ? 0.84 : 0.98);
    const tangentialX = -Math.sin(angle);
    const tangentialY = Math.cos(angle);
    const radialDirectionX = Math.cos(angle);
    const radialDirectionY = Math.sin(angle);
    const dispersion = isBulge ? 0.075 : 0.018;
    const radialDrift = isBulge ? randomRange(-0.028, 0.028) : randomRange(-0.012, 0.012);

    bodies.push({
      id: i + 1,
      isBulge,
      x,
      y,
      z,
      vx:
        tangentialX * vCirc +
        radialDirectionX * radialDrift +
        randomRange(-dispersion, dispersion),
      vy:
        tangentialY * vCirc +
        radialDirectionY * radialDrift +
        randomRange(-dispersion, dispersion),
      vz: -z * 0.00075 + randomRange(-0.012, 0.012),
      radius: isBulge
        ? randomRange(minRadius * 0.72, maxRadius * 0.82)
        : randomRange(minRadius, maxRadius),
      mass: randomRange(0.6, 2.4),
      color: `hsl(${Math.floor(temperature < 0.55 ? randomRange(200, 230) : randomRange(35, 60))} 95% ${Math.floor(randomRange(72, 92))}%)`
    });
  }
  return bodies;
}
