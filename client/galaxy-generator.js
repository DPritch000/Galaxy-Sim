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

export function generateCloudBodies(
  count,
  width,
  height,
  gravityStrength = 6,
  blackHoleStrength = 60,
  darkMatterStrength = 2200
) {
  const bodies = [];
  const cx = width * 0.5;
  const cy = height * 0.5;
  const cloudRadius = Math.min(width, height) * 0.38;
  const galaxyRadius = Math.min(width, height) * 0.45;
  const densityScale = Math.min(1, 220 / Math.max(count, 1));
  const minRadius = 0.12 + 0.08 * densityScale;
  const maxRadius = 0.28 + 0.16 * densityScale;
  const armCount = 2;
  const armTightness = 1.8; // Looser than seeded spiral (3.6) so arms evolve naturally

  for (let i = 0; i < count; i++) {
    // Rejection-sample a position inside an oblate sphere (slightly flattened along z)
    let px, py, pz;
    do {
      px = (Math.random() * 2 - 1) * cloudRadius;
      py = (Math.random() * 2 - 1) * cloudRadius;
      pz = (Math.random() * 2 - 1) * cloudRadius * 0.65;
    } while (
      (px * px + py * py) / (cloudRadius * cloudRadius) +
        (pz * pz) / (cloudRadius * cloudRadius * 0.65 * 0.65) >
      1
    );

    const planarR = Math.max(5, Math.hypot(px, py));
    const angle = Math.atan2(py, px);

    // Seed subtle spiral structure based on radius — gives N-body interactions
    // something to grow into spiral arms during the collapse.
    const armIndex = Math.floor(Math.random() * armCount);
    const armBaseAngle = (armIndex / armCount) * Math.PI * 2;
    const spiralAngle = armBaseAngle + (planarR / cloudRadius) * armTightness * Math.PI * 2;
    const spiralDeviation = randomNormal() * 0.12; // Loose scatter around spiral

    // Sub-virial rotation (≈58% of circular speed) — enough angular momentum
    // that stars don't fall straight to the center, but still well below virial
    // equilibrium so the cloud collapses and flattens into a disk.
    const vCirc =
      Math.sqrt(
        circularVelocitySquared(
          planarR,
          galaxyRadius,
          gravityStrength,
          blackHoleStrength,
          darkMatterStrength,
          count
        )
      ) * 0.58;

    const temperature = Math.random();

    // Apply small spiral-aligned velocity perturbation to seed structure growth
    // during collapse. This gives density fluctuations that can grow into arms.
    const spiralVelScale = 0.08;
    const spiralVx = -Math.sin(spiralAngle) * spiralVelScale;
    const spiralVy = Math.cos(spiralAngle) * spiralVelScale;

    bodies.push({
      id: i + 1,
      isBulge: false,
      x: cx + px,
      y: cy + py,
      z: pz,
      vx: -Math.sin(angle) * vCirc + spiralVx + randomNormal() * 0.07,
      vy: Math.cos(angle) * vCirc + spiralVy + randomNormal() * 0.07,
      vz: randomNormal() * 0.05,
      radius: randomRange(minRadius, maxRadius),
      mass: randomRange(0.6, 2.4),
      color: `hsl(${Math.floor(temperature < 0.55 ? randomRange(200, 230) : randomRange(35, 60))} 90% ${Math.floor(randomRange(68, 88))}%)`
    });
  }
  return bodies;
}

export function generatePlanets(
  planetCount,
  width,
  height,
  starMass = 1.0,
  gravityStrength = 6
) {
  const bodies = [];
  const cx = width * 0.5;
  const cy = height * 0.5;

  // Central star (immobile for simplicity, acts like the black hole)
  bodies.push({
    id: 0,
    isStar: true,
    x: cx,
    y: cy,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    radius: 8,
    mass: starMass * 100, // Scale up for gravitational effect
    color: `hsl(50 100% 55%)` // Sun-like yellow
  });

  // Generate planets around the star
  const maxPlanets = Math.min(Math.max(planetCount, 1), 100);
  for (let i = 0; i < maxPlanets; i++) {
    // Orbital radius from 60 to 200 pixels
    const orbitRadius = randomRange(60, 200);
    const angle = Math.random() * Math.PI * 2;

    // Orbital velocity for circular orbit: v = sqrt(G * M_star / r)
    // Scale: G ≈ 1, M_star is the starMass parameter
    const vOrbital = Math.sqrt((gravityStrength * starMass * 100) / Math.max(1, orbitRadius));

    // Randomize planet mass: 0.3 to 10 Earth masses (simplified scale)
    const planetMass = randomRange(0.3, 10);

    // Planet size based on mass: larger mass = larger visual size
    const baseRadius = 2 + Math.pow(planetMass / 10, 0.5) * 3;
    const radius = randomRange(Math.max(1, baseRadius * 0.8), baseRadius * 1.2);

    // Random color for variety (planets)
    const hueBase = Math.random() * 360;
    const saturation = randomRange(60, 90);
    const lightness = randomRange(45, 70);

    bodies.push({
      id: i + 1,
      isStar: false,
      x: cx + Math.cos(angle) * orbitRadius,
      y: cy + Math.sin(angle) * orbitRadius,
      z: randomNormal() * 8, // Slight z variation for depth
      vx: -Math.sin(angle) * vOrbital + randomNormal() * 0.02,
      vy: Math.cos(angle) * vOrbital + randomNormal() * 0.02,
      vz: randomNormal() * 0.01,
      radius,
      mass: planetMass,
      color: `hsl(${Math.floor(hueBase)} ${saturation}% ${lightness}%)`
    });
  }

  return bodies;
}
