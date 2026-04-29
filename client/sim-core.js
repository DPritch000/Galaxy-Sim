import { SIM_CONFIG } from "./sim-config.js";
import { Camera } from "./camera.js";
import { bindControls } from "./sim-controls.js";
import { renderFrame } from "./sim-renderer.js";
import { circularVelocitySquared, generateBodies, generateCloudBodies, generatePlanets } from "./galaxy-generator.js";
import { getSystemEnergy } from "./analysis-tools.js";
import { setPanelValues, setupPanels } from "./panels.js";
import { updateGraph } from "./graph.js";
import { buildBarnesHutTree, computeAccelerationBarnesHut } from "./barnes-hut.js";

const STABLE_GALAXY_SETTINGS = {
  particleCount: 5000,
  gravityStrength: 6,
  blackHoleStrength: 60,
  darkMatterStrength: 2300,
  armTightness: 3.8,
  timeScale: 0.12,
  barnesHutTheta: 0.85
};

const canvas = document.getElementById("sim-canvas");
const graphPanel = document.getElementById("graph-panel");
const ctx = canvas.getContext("2d");

canvas.width = SIM_CONFIG.width;
canvas.height = SIM_CONFIG.height;

const camera = new Camera(SIM_CONFIG.width, SIM_CONFIG.height);

const state = {
  paused: false,
  collapseMode: false,
  collapseStep: 0,
  planetMode: false,
  settings: {
    ...SIM_CONFIG.defaults,
    starMass: 1.0,
    planetCount: 8
  },
  bodies: generateBodies(
    SIM_CONFIG.defaults.particleCount,
    SIM_CONFIG.width,
    SIM_CONFIG.height,
    SIM_CONFIG.defaults.gravityStrength,
    SIM_CONFIG.defaults.blackHoleStrength,
    SIM_CONFIG.defaults.darkMatterStrength,
    SIM_CONFIG.defaults.armTightness
  )
};

function regenerateBodies() {
  state.collapseMode = false;
  state.collapseStep = 0;
  state.bodies = generateBodies(
    state.settings.particleCount,
    SIM_CONFIG.width,
    SIM_CONFIG.height,
    state.settings.gravityStrength,
    state.settings.blackHoleStrength,
    state.settings.darkMatterStrength,
    state.settings.armTightness
  );
}

function startCloudCollapse() {
  state.collapseMode = true;
  state.collapseStep = 0;
  state.planetMode = false;
  state.bodies = generateCloudBodies(
    state.settings.particleCount,
    SIM_CONFIG.width,
    SIM_CONFIG.height,
    state.settings.gravityStrength,
    state.settings.blackHoleStrength,
    state.settings.darkMatterStrength
  );
}

function startPlanetSimulation() {
  state.collapseMode = false;
  state.planetMode = true;
  state.bodies = generatePlanets(
    state.settings.planetCount,
    SIM_CONFIG.width,
    SIM_CONFIG.height,
    state.settings.starMass,
    state.settings.gravityStrength
  );
}

function updateSetting(name, value) {
  state.settings[name] = value;
  if (
    name === "particleCount" ||
    name === "blackHoleStrength" ||
    name === "darkMatterStrength" ||
    name === "gravityStrength" ||
    name === "armTightness"
  ) {
    regenerateBodies();
  }
}

function applyStableGalaxySettings() {
  state.settings = {
    ...state.settings,
    ...STABLE_GALAXY_SETTINGS
  };
  setPanelValues(state.settings);
  regenerateBodies();
}

setupPanels(state.settings, updateSetting, regenerateBodies, applyStableGalaxySettings, startCloudCollapse, startPlanetSimulation);
bindControls(state, camera, canvas);

function stepSimulation() {
  const { gravityStrength, timeScale, barnesHutTheta, darkMatterStrength } = state.settings;
  const dt = timeScale;
  const bodies = state.bodies;

  // Planet simulation mode: simple N-body gravity from the star
  if (state.planetMode) {
    const star = bodies[0]; // First body is the star
    const softening = 2; // Softening length to prevent singularities

    for (let i = 1; i < bodies.length; i++) {
      const planet = bodies[i];
      const dx = star.x - planet.x;
      const dy = star.y - planet.y;
      const dz = star.z - planet.z;
      const distSq = dx * dx + dy * dy + dz * dz + softening * softening;
      const dist = Math.sqrt(distSq);
      const invDist3 = 1 / (distSq * dist);
      const force = gravityStrength * star.mass * invDist3;

      planet.vx += dx * force * dt;
      planet.vy += dy * force * dt;
      planet.vz += dz * force * dt;
    }

    // Update positions
    for (const body of bodies) {
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.z += body.vz * dt;
    }
    return;
  }

  // Galaxy simulation mode (existing code)
  const { stellar, halo, coreVertical, supportRelaxation, radialDamping } = SIM_CONFIG.forceScale;

  if (state.collapseMode) {
    state.collapseStep += 1;
  }
  // collapseProgress ramps from 0.08→1 over the first 1200 collapse steps.
  // Starting at 0.08 (never fully zero) ensures a minimal orbital support floor
  // is always active, preventing stars from losing all angular momentum and
  // forming stagnant clumps. Outside collapse mode it stays at 1.
  const collapseProgress = state.collapseMode
    ? Math.min(1, 0.08 + (state.collapseStep / 1200) * 0.92)
    : 1;
  const { coreRadius, haloCoreRadius } = SIM_CONFIG.structure;
  const cx = SIM_CONFIG.width * 0.5;
  const cy = SIM_CONFIG.height * 0.5;
  const cz = 0;
  const galaxyRadius = Math.min(SIM_CONFIG.width, SIM_CONFIG.height) * 0.45;
  const tree = buildBarnesHutTree(bodies, SIM_CONFIG.width, SIM_CONFIG.height);
  const blackHoleStrength = state.settings.blackHoleStrength;
  const coreRadiusSq = coreRadius * coreRadius;
  const haloCoreRadiusSq = haloCoreRadius * haloCoreRadius;
  const maxSpeed = 4.5;

  for (const body of bodies) {
    const { ax, ay, az } = computeAccelerationBarnesHut(
      tree,
      body,
      barnesHutTheta,
      gravityStrength * stellar
    );

    const dx = cx - body.x;
    const dy = cy - body.y;
    const dz = cz - body.z;
    const radialX = -dx;
    const radialY = -dy;
    const radius = Math.max(1, Math.hypot(radialX, radialY));
    const distSq = dx * dx + dy * dy + dz * dz + coreRadiusSq;
    const invDist = 1 / Math.sqrt(distSq);
    const coreScale = blackHoleStrength * invDist * invDist * invDist;

    const planarRadiusSq = dx * dx + dy * dy;
    const haloScale = (darkMatterStrength * halo) / (planarRadiusSq + haloCoreRadiusSq);

    body.vx += (ax + dx * (coreScale + haloScale)) * dt;
    body.vy += (ay + dy * (coreScale + haloScale)) * dt;
    body.vz += (az + dz * coreScale * coreVertical) * dt;

    // During cloud collapse, damp z-velocity so the sphere flattens to a disk.
    if (state.collapseMode) {
      body.vz *= 1 - 0.006 * dt;
      body.vz -= body.z * 0.00018 * dt;
    }

    if (!body.isBulge && radius > 12) {
      const tangentX = -radialY / radius;
      const tangentY = radialX / radius;
      const tangentialVelocity = body.vx * tangentX + body.vy * tangentY;
      const targetTangential = Math.sqrt(
        circularVelocitySquared(
          radius,
          galaxyRadius,
          state.settings.gravityStrength,
          state.settings.blackHoleStrength,
          state.settings.darkMatterStrength,
          state.settings.particleCount
        )
      ) * 0.96;
      const tangentialDelta = targetTangential - tangentialVelocity;

      // Ramp up orbital support as the disk collapses — zero at first so the
      // cloud evolves under pure gravity, then gradually guides it onto stable orbits.
      body.vx += tangentX * tangentialDelta * supportRelaxation * collapseProgress;
      body.vy += tangentY * tangentialDelta * supportRelaxation * collapseProgress;

      const radialVelocity = body.vx * (radialX / radius) + body.vy * (radialY / radius);
      body.vx -= (radialX / radius) * radialVelocity * radialDamping * collapseProgress;
      body.vy -= (radialY / radius) * radialVelocity * radialDamping * collapseProgress;
    }

    const speed = Math.hypot(body.vx, body.vy, body.vz);
    if (speed > maxSpeed) {
      const factor = maxSpeed / speed;
      body.vx *= factor;
      body.vy *= factor;
      body.vz *= factor;
    }

    body.x += body.vx * dt;
    body.y += body.vy * dt;
    body.z += body.vz * dt;
  }
}

function tick() {
  if (!state.paused) {
    stepSimulation();
  }

  renderFrame(
    ctx,
    state.bodies,
    SIM_CONFIG.width,
    SIM_CONFIG.height,
    camera,
    state.settings.blackHoleStrength
  );
  if (graphPanel) {
    updateGraph(graphPanel, getSystemEnergy(state.bodies));
  }

  requestAnimationFrame(tick);
}

tick();
