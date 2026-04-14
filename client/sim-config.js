export const SIM_CONFIG = {
  width: 960,
  height: 540,
  forceScale: {
    stellar: 0.02,
    halo: 0.0022,
    coreVertical: 0.35,
    supportRelaxation: 0.012,
    radialDamping: 0.006,
    radialCooling: 0.018,
    verticalCooling: 0.03,
    supportRampTime: 140
  },
  structure: {
    coreRadius: 95,
    haloCoreRadius: 170,
    localSoftening: 14
  },
  defaults: {
    particleCount: 5000,
    gravityStrength: 5,
    blackHoleStrength: 45,
    darkMatterStrength: 1800,
    armTightness: 3,
    timeScale: 0.09,
    barnesHutTheta: 0.85
  }
};
