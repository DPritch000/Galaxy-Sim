import { SIM_CONFIG } from "./sim-config.js";
import { Camera } from "./camera.js";
import { bindControls } from "./sim-controls.js";
import { renderFrame } from "./sim-renderer.js";
import { circularVelocitySquared, generateCloudBodies, generatePlanets } from "./galaxy-generator.js";
import { getSystemEnergy } from "./analysis-tools.js";
import { setPanelValues, setupPanels } from "./panels.js";
import { updateGraph } from "./graph.js";
import { buildBarnesHutTree, computeAccelerationBarnesHut } from "./barnes-hut.js";

const canvas = document.getElementById("sim-canvas");
const graphPanel = document.getElementById("graph-panel");
const ctx = canvas.getContext("2d");

canvas.width = SIM_CONFIG.width;
canvas.height = SIM_CONFIG.height;

const camera = new Camera(SIM_CONFIG.width, SIM_CONFIG.height);

const state = {
  paused: false,
  collapseMode: true,
  collapseStep: 0,
  planetMode: false,
  settings: {
    ...SIM_CONFIG.defaults,
    starMass: 1.0,
    planetCount: 8
  },
  bodies: generateCloudBodies(
    SIM_CONFIG.defaults.particleCount,
    SIM_CONFIG.width,
    SIM_CONFIG.height,
    SIM_CONFIG.defaults.gravityStrength,
    SIM_CONFIG.defaults.blackHoleStrength,
    SIM_CONFIG.defaults.darkMatterStrength
  )
};

function regenerateBodies() {
  startCloudCollapse();
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
    name === "gravityStrength"
  ) {
    regenerateBodies();
  }
}

setupPanels(state.settings, updateSetting, startCloudCollapse, startPlanetSimulation);
bindControls(state, camera, canvas);

function stepSimulation() {
  const { gravityStrength, timeScale, barnesHutTheta, darkMatterStrength } = state.settings;
  const dt = timeScale;
  const bodies = state.bodies;

  // Planet simulation mode: full N-body via Barnes-Hut so planets affect each other
  if (state.planetMode) {
    // epsilonSq = 36 softening is applied inside computeAccelerationBarnesHut
    const tree = buildBarnesHutTree(bodies, SIM_CONFIG.width, SIM_CONFIG.height);

    for (const body of bodies) {
      // Star is anchored — skip integrating its velocity so it stays centred
      if (body.isStar) continue;

      const { ax, ay, az } = computeAccelerationBarnesHut(
        tree,
        body,
        barnesHutTheta,
        gravityStrength
      );

      body.vx += ax * dt;
      body.vy += ay * dt;
      body.vz += az * dt;
    }

    // Update positions (planets only; star stays fixed)
    for (const body of bodies) {
      if (body.isStar) continue;
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
    // Exit collapse mode after a fixed number of frames (not sim-time).
    // 1600 frames at 60fps ≈ 27 seconds of wall time — enough for the disk to
    // flatten and stars to spread across orbital radii at any timescale.
    if (state.collapseStep >= 1600) {
      state.collapseMode = false;
    }
  }
  const { coreRadius, haloCoreRadius } = SIM_CONFIG.structure;
  const cx = SIM_CONFIG.width * 0.5;
  const cy = SIM_CONFIG.height * 0.5;
  const cz = 0;
  const galaxyRadius = Math.min(SIM_CONFIG.width, SIM_CONFIG.height) * 0.45;
  const tree = buildBarnesHutTree(bodies, SIM_CONFIG.width, SIM_CONFIG.height);
  const blackHoleStrength = state.settings.blackHoleStrength;
  const coreRadiusSq = coreRadius * coreRadius;
  const haloCoreRadiusSq = haloCoreRadius * haloCoreRadius;
  // maxSpeed scales with dt so the cap fires at the same rate regardless of
  // timescale — without this, the cap drains energy 8× faster at dt=1 vs dt=0.12
  // and everything collapses to the centre.
  const maxSpeed = 4.5 * Math.max(1, dt / 0.12);

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
      );
      const tangentialDelta = targetTangential - tangentialVelocity;

      // During cloud collapse, skip the orbital-support and radial-damping passes.
      // Applying them circularises every orbit at its current radius, causing all
      // stars to pile up at their momentary pericenter and form a ring.
      // Only apply support after the cloud has fully flattened (collapseProgress = 1).
      if (!state.collapseMode) {
        // Scale corrections by dt so they apply at the same rate per unit
        // simulation-time regardless of the timescale slider value.
        const dtScale = dt / 0.12;
        body.vx += tangentX * tangentialDelta * supportRelaxation * dtScale;
        body.vy += tangentY * tangentialDelta * supportRelaxation * dtScale;

        // Only damp radial velocity when the body is moving radially much faster
        // than the local circular speed — removes genuine overshoot without
        // damping legitimate gravitational infall.
        const radialVelocity = body.vx * (radialX / radius) + body.vy * (radialY / radius);
        const excessRadial = Math.abs(radialVelocity) - targetTangential * 0.5;
        if (excessRadial > 0) {
          const dampFrac = Math.min(1, excessRadial / Math.max(0.01, Math.abs(radialVelocity)));
          body.vx -= (radialX / radius) * radialVelocity * dampFrac * radialDamping * dtScale;
          body.vy -= (radialY / radius) * radialVelocity * dampFrac * radialDamping * dtScale;
        }
      }
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
    state.planetMode ? 0 : state.settings.blackHoleStrength,
    state.planetMode
  );
  if (graphPanel) {
    updateGraph(graphPanel, getSystemEnergy(state.bodies));
  }

  requestAnimationFrame(tick);
}

tick();
