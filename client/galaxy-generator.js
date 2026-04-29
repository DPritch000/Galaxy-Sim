import { randomRange } from "./sim-utils.js";
import { SIM_CONFIG } from "./sim-config.js";

function randomNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function randomUnitVector() {
  const theta = randomRange(0, Math.PI * 2);
  const z = randomRange(-1, 1);
  const planar = Math.sqrt(1 - z * z);
  return {
    x: Math.cos(theta) * planar,
    y: Math.sin(theta) * planar,
    z
  };
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
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
  armTightness = 3.6,
  rotationStrength = 1
) {
  const bodies = [];
  const densityScale = Math.min(1, 220 / Math.max(count, 1));
  const minRadius = 0.12 + 0.08 * densityScale;
  const maxRadius = 0.28 + 0.16 * densityScale;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const galaxyRadius = Math.min(width, height) * 0.48;
  const cloudRadius = galaxyRadius * 0.92;
  const spinBase = 0.96 + armTightness * 0.03;
  const spinAxis = randomUnitVector();
  const spiralPhase = randomRange(0, Math.PI * 2);

  for (let i = 0; i < count; i += 1) {
    const temperature = randomRange(0, 1);
    const dir = randomUnitVector();
    const radius = cloudRadius * Math.cbrt(Math.random());
    const px = dir.x * radius;
    const py = dir.y * radius;
    const pz = dir.z * radius * 0.9;
    const x = cx + px;
    const y = cy + py;
    const z = pz;

    const rPlanar = Math.max(4, Math.hypot(px, py));
    const r3 = Math.max(6, Math.hypot(px, py, pz));
    const isBulge = r3 < galaxyRadius * 0.22;

    const vCirc = Math.sqrt(
      circularVelocitySquared(rPlanar, galaxyRadius, gravityStrength, blackHoleStrength, darkMatterStrength, count)
    );

    const radialDirection = {
      x: px / r3,
      y: py / r3,
      z: pz / r3
    };
    const tangentialVec = cross(spinAxis, radialDirection);
    const tangentialMag = Math.hypot(tangentialVec.x, tangentialVec.y, tangentialVec.z);
    const tangential = tangentialMag > 1e-6
      ? {
          x: tangentialVec.x / tangentialMag,
          y: tangentialVec.y / tangentialMag,
          z: tangentialVec.z / tangentialMag
        }
      : {
          x: -py / rPlanar,
          y: px / rPlanar,
          z: 0
        };

    const radialFraction = Math.min(1, rPlanar / cloudRadius);
    const azimuth = Math.atan2(py, px);
    const armSeed = 1 + 0.03 * Math.cos(2 * azimuth + spiralPhase);
    const spinScatter = randomRange(0.9, 1.08);
    const support = isBulge ? 0.72 : 1.12;
    const spinVelocity =
      vCirc * support * spinBase * Math.max(0.2, rotationStrength) * Math.pow(radialFraction, 0.08) * spinScatter * armSeed;
    const dispersion = isBulge ? 0.055 : 0.022;
    const collapseBias = isBulge ? randomRange(-0.003, 0.003) : randomRange(-0.004, 0.003);

    bodies.push({
      id: i + 1,
      isBulge,
      orbitBias: randomRange(0.72, 1.28),
      x,
      y,
      z,
      vx: tangential.x * spinVelocity - radialDirection.x * collapseBias + randomRange(-dispersion, dispersion),
      vy: tangential.y * spinVelocity - radialDirection.y * collapseBias + randomRange(-dispersion, dispersion),
      vz:
        tangential.z * spinVelocity -
        radialDirection.z * collapseBias -
        z * 0.00095 +
        randomRange(isBulge ? -0.028 : -0.015, isBulge ? 0.028 : 0.015),
      radius: isBulge
        ? randomRange(minRadius * 0.72, maxRadius * 0.82)
        : randomRange(minRadius, maxRadius),
      mass: randomRange(0.6, 2.4),
      color: `hsl(${Math.floor(temperature < 0.55 ? randomRange(200, 230) : randomRange(35, 60))} 95% ${Math.floor(randomRange(72, 92))}%)`
    });
  }
  return bodies;
}
