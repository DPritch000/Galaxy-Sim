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
  gravityStrength: 8,
  blackHoleStrength: 62,
  darkMatterStrength: 1650,
  armTightness: 1.7,
  rotationStrength: 1.12,
  timeScale: 0.08,
  barnesHutTheta: 0.85
};

const canvas = document.getElementById("sim-canvas");
const graphPanel = document.getElementById("graph-panel");
const ctx = canvas.getContext("2d");

canvas.width = SIM_CONFIG.width;
canvas.height = SIM_CONFIG.height;

const camera = new Camera(SIM_CONFIG.width, SIM_CONFIG.height);

function normalizeVector(v, fallback = { x: 0, y: 0, z: 1 }) {
  const len = Math.hypot(v.x, v.y, v.z);
  if (len < 1e-8) {
    return fallback;
  }
  return {
    x: v.x / len,
    y: v.y / len,
    z: v.z / len
  };
}

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
  stepCount: 0,
  angularAxis: { x: 0, y: 0, z: 1 },
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
    SIM_CONFIG.defaults.armTightness,
    SIM_CONFIG.defaults.rotationStrength
  ),
  blackHole: createBlackHole(SIM_CONFIG.defaults)
};

function regenerateBodies() {
  state.stepCount = 0;
  state.angularAxis = { x: 0, y: 0, z: 1 };
  state.bodies = generateBodies(
    state.settings.particleCount,
    SIM_CONFIG.width,
    SIM_CONFIG.height,
    state.settings.gravityStrength,
    state.settings.blackHoleStrength,
    state.settings.darkMatterStrength,
    state.settings.armTightness,
    state.settings.rotationStrength
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
    name === "armTightness" ||
    name === "rotationStrength"
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
  const formation = SIM_CONFIG.formation;
  const collapseT = Math.min(1, state.stepCount / Math.max(1, formation.collapseSteps));
  const settleT = Math.min(
    1,
    Math.max(0, (state.stepCount - formation.collapseSteps) / Math.max(1, formation.settleSteps))
  );
  const flattenT = Math.min(
    1,
    state.stepCount / Math.max(1, formation.collapseSteps + formation.settleSteps * 0.45)
  );
  const dtScale = formation.earlyDtScale + (1 - formation.earlyDtScale) * collapseT;
  const dt = timeScale * dtScale;
  const bodies = state.bodies;
  const { stellar, halo } = SIM_CONFIG.forceScale;
  const { coreRadius, haloCoreRadius, localSoftening, blackHoleSoftening } = SIM_CONFIG.structure;
  const softeningScale = formation.earlySofteningBoost + (1 - formation.earlySofteningBoost) * collapseT;
  const localSofteningNow = localSoftening * softeningScale;
  const blackHoleSofteningNow = blackHoleSoftening * softeningScale;
  const blackHole = state.blackHole;
  blackHole.mass = Math.max(0, state.settings.blackHoleStrength * SIM_CONFIG.structure.blackHoleMassScale);
  blackHole.x = SIM_CONFIG.width * 0.5;
  blackHole.y = SIM_CONFIG.height * 0.5;
  blackHole.z = 0;
  blackHole.vx = 0;
  blackHole.vy = 0;
  blackHole.vz = 0;

  let sumMass = 0;
  let comX = 0;
  let comY = 0;
  let comZ = 0;
  let lx = 0;
  let ly = 0;
  let lz = 0;

  for (const body of bodies) {
    sumMass += body.mass;
    comX += body.x * body.mass;
    comY += body.y * body.mass;
    comZ += body.z * body.mass;

    const rx = body.x - blackHole.x;
    const ry = body.y - blackHole.y;
    const rz = body.z - blackHole.z;
    lx += body.mass * (ry * body.vz - rz * body.vy);
    ly += body.mass * (rz * body.vx - rx * body.vz);
    lz += body.mass * (rx * body.vy - ry * body.vx);
  }

  if (sumMass > 0) {
    comX /= sumMass;
    comY /= sumMass;
    comZ /= sumMass;
  } else {
    comX = SIM_CONFIG.width * 0.5;
    comY = SIM_CONFIG.height * 0.5;
    comZ = 0;
  }

  state.angularAxis = normalizeVector({ x: lx, y: ly, z: lz }, state.angularAxis);

  const allBodies = blackHole.mass > 0 ? [...bodies, blackHole] : bodies;
  const starTree = buildBarnesHutTree(bodies, SIM_CONFIG.width, SIM_CONFIG.height);
  const allTree = buildBarnesHutTree(allBodies, SIM_CONFIG.width, SIM_CONFIG.height);

  const coreRadiusSq = coreRadius * coreRadius;
  const haloCoreRadiusSq = haloCoreRadius * haloCoreRadius;
  const maxSpeed = 36;

  for (const body of bodies) {
    const { ax, ay, az } = computeAccelerationBarnesHut(
      allTree,
      body,
      barnesHutTheta,
      gravityStrength * stellar,
      localSofteningNow
    );

    const dx = blackHole.x - body.x;
    const dy = blackHole.y - body.y;
    const dz = blackHole.z - body.z;
    const planarRadiusSq = dx * dx + dy * dy;
    const haloScale = (darkMatterStrength * halo) / (planarRadiusSq + haloCoreRadiusSq);

    const distSq = dx * dx + dy * dy + dz * dz + coreRadiusSq;
    const dist = Math.sqrt(distSq);
    const haloAx = dx * haloScale;
    const haloAy = dy * haloScale;
    const haloAz = dz * haloScale * 0.25;

    const relX = body.x - blackHole.x;
    const relY = body.y - blackHole.y;
    const relZ = body.z - blackHole.z;
    const relRadius = Math.hypot(relX, relY, relZ);
    const densityProxy = 1 / (1 + (relRadius * relRadius) / (formation.coolingRadius * formation.coolingRadius));
    const cooling = formation.coolingStrength * settleT * densityProxy;
    const planarRadius = Math.max(4, Math.hypot(relX, relY));
    const radialPlanar = {
      x: relX / planarRadius,
      y: relY / planarRadius,
      z: 0
    };
    const tangentialPlanar = {
      x: -relY / planarRadius,
      y: relX / planarRadius,
      z: 0
    };
    const vRad = body.vx * radialPlanar.x + body.vy * radialPlanar.y;
    const vTan = body.vx * tangentialPlanar.x + body.vy * tangentialPlanar.y;
    const targetVCirc = Math.sqrt(
      circularVelocitySquared(
        planarRadius,
        Math.min(SIM_CONFIG.width, SIM_CONFIG.height) * 0.48,
        gravityStrength,
        state.settings.blackHoleStrength,
        darkMatterStrength,
        bodies.length
      )
    );

    const axis = state.angularAxis;
    const vParallel = body.vx * axis.x + body.vy * axis.y + body.vz * axis.z;
    const height = relX * axis.x + relY * axis.y + relZ * axis.z;
    const planeDamp = formation.planeDamping * flattenT;
    const planeRestore = formation.planeRestore * flattenT;
    const settleAx = -axis.x * (vParallel * planeDamp + height * planeRestore);
    const settleAy = -axis.y * (vParallel * planeDamp + height * planeRestore);
    const settleAz = -axis.z * (vParallel * planeDamp + height * planeRestore);

    body.vx += (ax + haloAx + settleAx) * dt;
    body.vy += (ay + haloAy + settleAy) * dt;
    body.vz += (az + haloAz + settleAz) * dt;

    const orbitSupport = formation.rotationalSupport * settleT;
    const radialDamping = formation.radialDamping * settleT;
    const verticalDamping = formation.verticalDamping * flattenT;
    const dvTan = (targetVCirc - vTan) * orbitSupport;
    body.vx += tangentialPlanar.x * dvTan * dt;
    body.vy += tangentialPlanar.y * dvTan * dt;
    body.vx += radialPlanar.x * (-vRad * radialDamping) * dt;
    body.vy += radialPlanar.y * (-vRad * radialDamping) * dt;
    body.vz += -body.vz * verticalDamping * dt;

    const innerCoreRadius = coreRadius * 0.9;
    if (dist < innerCoreRadius) {
      const inwardSpeed = (body.vx * dx + body.vy * dy + body.vz * dz) / Math.max(1, dist);
      if (inwardSpeed > 0) {
        const brakeStrength = (1 - dist / innerCoreRadius) * 0.55;
        body.vx -= (dx / dist) * inwardSpeed * brakeStrength * dt;
        body.vy -= (dy / dist) * inwardSpeed * brakeStrength * dt;
        body.vz -= (dz / dist) * inwardSpeed * brakeStrength * dt;
      }
    }

    body.vx -= radialPlanar.x * vRad * cooling * dt;
    body.vy -= radialPlanar.y * vRad * cooling * dt;
    body.vz *= Math.max(0.9, 1 - cooling * dt * 1.4);

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
    // Keep the BH fixed so all orbital motion is centered on it.
    blackHole.x = SIM_CONFIG.width * 0.5;
    blackHole.y = SIM_CONFIG.height * 0.5;
    blackHole.z = 0;
    blackHole.vx = 0;
    blackHole.vy = 0;
    blackHole.vz = 0;
  }

  state.stepCount += 1;
}

function tick() {
  if (!state.paused) {
    stepSimulation();
  }

  if (state.blackHole) {
    camera.followFocus(state.blackHole.x, state.blackHole.y, state.blackHole.z, 0.14, 0.45);
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
