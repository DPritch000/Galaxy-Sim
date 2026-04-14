import { SIM_CONFIG } from "./sim-config.js";
import { Camera } from "./camera.js";
import { bindControls } from "./sim-controls.js";
import { renderFrame } from "./sim-renderer.js";
import { circularVelocitySquared, generateBodies } from "./galaxy-generator.js";
import { getSystemEnergy } from "./analysis-tools.js";
import { setPanelValues, setupPanels } from "./panels.js";
import { updateGraph } from "./graph.js";
import { buildBarnesHutTree, computeAccelerationBarnesHut } from "./barnes-hut.js";

const STABLE_GALAXY_SETTINGS = {
  particleCount: 5000,
  gravityStrength: 5,
  blackHoleStrength: 45,
  darkMatterStrength: 1800,
  armTightness: 2.8,
  timeScale: 0.09,
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
  simTime: 0,
  settings: {
    ...SIM_CONFIG.defaults
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
  state.bodies = generateBodies(
    state.settings.particleCount,
    SIM_CONFIG.width,
    SIM_CONFIG.height,
    state.settings.gravityStrength,
    state.settings.blackHoleStrength,
    state.settings.darkMatterStrength,
    state.settings.armTightness
  );
  state.simTime = 0;
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

setupPanels(state.settings, updateSetting, regenerateBodies, applyStableGalaxySettings);
bindControls(state, camera, canvas);

function stepSimulation() {
  const { gravityStrength, timeScale, barnesHutTheta, darkMatterStrength } = state.settings;
  const dt = timeScale;
  const bodies = state.bodies;
  const {
    stellar,
    halo,
    coreVertical,
    supportRelaxation,
    radialDamping,
    radialCooling,
    verticalCooling,
    supportRampTime
  } = SIM_CONFIG.forceScale;
  const { coreRadius, haloCoreRadius, localSoftening } = SIM_CONFIG.structure;
  const cx = SIM_CONFIG.width * 0.5;
  const cy = SIM_CONFIG.height * 0.5;
  const cz = 0;
  const galaxyRadius = Math.min(SIM_CONFIG.width, SIM_CONFIG.height) * 0.45;
  const tree = buildBarnesHutTree(bodies, SIM_CONFIG.width, SIM_CONFIG.height);
  const formationBlend = Math.max(0, Math.min(1, state.simTime / Math.max(1, supportRampTime)));
  const blackHoleStrength = state.settings.blackHoleStrength;
  const coreRadiusSq = coreRadius * coreRadius;
  const haloCoreRadiusSq = haloCoreRadius * haloCoreRadius;
  const maxSpeed = 4.5;

  for (const body of bodies) {
    const { ax, ay, az } = computeAccelerationBarnesHut(
      tree,
      body,
      barnesHutTheta,
      gravityStrength * stellar,
      localSoftening
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
      ) * 0.96 * (body.orbitBias || 1);
      const tangentialDelta = targetTangential - tangentialVelocity;
      const inner = galaxyRadius * 0.28;
      const outer = galaxyRadius * 0.98;
      const band = Math.max(0, Math.min(1, (radius - inner) / Math.max(1, outer - inner)));
      const supportWeight = band * (1 - 0.35 * band);

      body.vx += tangentX * tangentialDelta * supportRelaxation * supportWeight * formationBlend;
      body.vy += tangentY * tangentialDelta * supportRelaxation * supportWeight * formationBlend;

      const radialVelocity = body.vx * (radialX / radius) + body.vy * (radialY / radius);
      const cooling = radialDamping * supportWeight + radialCooling * (1 - formationBlend) * 0.6;
      body.vx -= (radialX / radius) * radialVelocity * cooling;
      body.vy -= (radialY / radius) * radialVelocity * cooling;
    }

    body.vz *= 1 - verticalCooling * (1 - formationBlend) * dt;

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

  state.simTime += dt;
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
