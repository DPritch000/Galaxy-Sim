import { SIM_CONFIG } from "./sim-config.js";
import { Camera } from "./camera.js";
import { bindControls } from "./sim-controls.js";
import { renderFrame } from "./sim-renderer.js";
import { generateBodies } from "./galaxy-generator.js";
import { getSystemEnergy } from "./analysis-tools.js";
import { setPanelValues, setupPanels } from "./panels.js";
import { updateGraph } from "./graph.js";
import { buildBarnesHutTree, computeAccelerationBarnesHut } from "./barnes-hut.js";

const STABLE_GALAXY_SETTINGS = {
  particleCount: 5000,
  gravityStrength: 8,
  blackHoleStrength: 45,
  darkMatterStrength: 1500,
  armTightness: 2.4,
  timeScale: 0.09,
  barnesHutTheta: 0.85
};

const canvas = document.getElementById("sim-canvas");
const graphPanel = document.getElementById("graph-panel");
const ctx = canvas.getContext("2d");

canvas.width = SIM_CONFIG.width;
canvas.height = SIM_CONFIG.height;

const camera = new Camera(SIM_CONFIG.width, SIM_CONFIG.height);

function createBlackHole(settings) {
  const { blackHoleMassScale } = SIM_CONFIG.structure;
  const mass = Math.max(0, settings.blackHoleStrength * blackHoleMassScale);
  return {
    id: -1,
    isBlackHole: true,
    x: SIM_CONFIG.width * 0.5,
    y: SIM_CONFIG.height * 0.5,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    mass,
    radius: 1,
    color: "#000"
  };
}

const state = {
  paused: false,
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
  ),
  blackHole: createBlackHole(SIM_CONFIG.defaults)
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
  state.blackHole = createBlackHole(state.settings);
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
  const { stellar, halo } = SIM_CONFIG.forceScale;
  const { coreRadius, haloCoreRadius, localSoftening, blackHoleSoftening } = SIM_CONFIG.structure;
  const blackHole = state.blackHole;
  blackHole.mass = Math.max(0, state.settings.blackHoleStrength * SIM_CONFIG.structure.blackHoleMassScale);

  const allBodies = blackHole.mass > 0 ? [...bodies, blackHole] : bodies;
  const starTree = buildBarnesHutTree(bodies, SIM_CONFIG.width, SIM_CONFIG.height);
  const allTree = buildBarnesHutTree(allBodies, SIM_CONFIG.width, SIM_CONFIG.height);

  const coreRadiusSq = coreRadius * coreRadius;
  const haloCoreRadiusSq = haloCoreRadius * haloCoreRadius;
  const maxSpeed = 4.5;

  for (const body of bodies) {
    const { ax, ay, az } = computeAccelerationBarnesHut(allTree, body, barnesHutTheta, gravityStrength * stellar, localSoftening);

    const dx = blackHole.x - body.x;
    const dy = blackHole.y - body.y;
    const dz = blackHole.z - body.z;
    const planarRadiusSq = dx * dx + dy * dy;
    const haloScale = (darkMatterStrength * halo) / (planarRadiusSq + haloCoreRadiusSq);

    const distSq = dx * dx + dy * dy + dz * dz + coreRadiusSq;
    const invDist = 1 / Math.sqrt(distSq);
    const haloAx = dx * haloScale;
    const haloAy = dy * haloScale;
    const haloAz = dz * haloScale * 0.25;

    body.vx += (ax + haloAx) * dt;
    body.vy += (ay + haloAy) * dt;
    body.vz += (az + haloAz) * dt;

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

  if (blackHole.mass > 0) {
    const { ax, ay, az } = computeAccelerationBarnesHut(
      starTree,
      blackHole,
      barnesHutTheta,
      gravityStrength * stellar,
      blackHoleSoftening
    );
    blackHole.vx += ax * dt;
    blackHole.vy += ay * dt;
    blackHole.vz += az * dt;

    blackHole.vx *= 0.995;
    blackHole.vy *= 0.995;
    blackHole.vz *= 0.995;

    blackHole.x += blackHole.vx * dt;
    blackHole.y += blackHole.vy * dt;
    blackHole.z += blackHole.vz * dt;
  }
}

function tick() {
  if (!state.paused) {
    stepSimulation();
  }

  if (state.blackHole) {
    camera.setFocus(state.blackHole.x, state.blackHole.y, state.blackHole.z);
  }

  renderFrame(
    ctx,
    state.bodies,
    SIM_CONFIG.width,
    SIM_CONFIG.height,
    camera,
    state.settings.blackHoleStrength,
    state.blackHole
  );
  if (graphPanel) {
    updateGraph(graphPanel, getSystemEnergy(state.bodies));
  }

  requestAnimationFrame(tick);
}

tick();
