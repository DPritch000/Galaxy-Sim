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
  const diskRadius = galaxyRadius * 0.94;
  const diskScaleLength = galaxyRadius * 0.25;
  const bulgeFraction = 0.18;
  const armCount = 2;
  const armPitch = 1.3 + armTightness * 0.48;
  const armStrength = 0.09 + armTightness * 0.01;
  const spinBase = 1.02 + armTightness * 0.02;
  const spiralPhase = randomRange(0, Math.PI * 2);

  for (let i = 0; i < count; i += 1) {
    const temperature = randomRange(0, 1);
    const isBulge = Math.random() < bulgeFraction;

    let px;
    let py;
    let pz;
    let armPhase = 0;

    if (isBulge) {
      const dir = randomUnitVector();
      const radius = galaxyRadius * 0.24 * Math.cbrt(Math.random());
      px = dir.x * radius;
      py = dir.y * radius;
      pz = dir.z * radius * 0.9;
    } else {
      const u = Math.max(1e-6, 1 - Math.random());
      const baseRadius = Math.min(diskRadius, -diskScaleLength * Math.log(u));
      const baseTheta = randomRange(0, Math.PI * 2);
      armPhase = armCount * baseTheta - armPitch * Math.log((baseRadius + 18) / 18) + spiralPhase;
      const armWave = Math.cos(armPhase);
      const radius = Math.max(3, Math.min(diskRadius, baseRadius * (1 + armWave * armStrength + randomNormal() * 0.035)));
      const theta =
        baseTheta + (Math.sin(armPhase) * 0.07 + randomNormal() * 0.035) / Math.sqrt(1 + radius / 70);

      px = Math.cos(theta) * radius;
      py = Math.sin(theta) * radius;
      pz = randomNormal() * (2.6 + radius * 0.009);
    }

    const x = cx + px;
    const y = cy + py;
    const z = pz;

    const rPlanar = Math.max(4, Math.hypot(px, py));
    const r3 = Math.max(6, Math.hypot(px, py, pz));

    const vCirc = Math.sqrt(
      circularVelocitySquared(rPlanar, galaxyRadius, gravityStrength, blackHoleStrength, darkMatterStrength, count)
    );

    const radialDirection = {
      x: px / r3,
      y: py / r3,
      z: pz / r3
    };
    const tangential = {
      x: -py / rPlanar,
      y: px / rPlanar,
      z: 0
    };

    const radialFraction = Math.min(1, rPlanar / diskRadius);
    const armSeed = isBulge ? 1 : 1 + Math.cos(armPhase) * 0.08;
    const spinScatter = isBulge ? randomRange(0.82, 1.12) : randomRange(0.96, 1.04);
    const support = isBulge ? 0.72 : 1.02;
    const spinVelocity =
      vCirc * support * spinBase * Math.max(0.2, rotationStrength) * Math.pow(radialFraction, 0.08) * spinScatter * armSeed;
    const dispersion = isBulge ? 0.05 : 0.014;
    const collapseBias = isBulge ? randomRange(-0.0025, 0.0025) : randomRange(-0.0008, 0.0006);

    bodies.push({
      id: i + 1,
      isBulge,
      orbitBias: randomRange(0.9, 1.1),
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
