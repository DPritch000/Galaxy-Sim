export const SIM_CONFIG = {
  width: 960,
  height: 540,
  forceScale: {
    stellar: 0.01,
    halo: 0.0026
  },
  structure: {
    coreRadius: 150,
    haloCoreRadius: 170,
    localSoftening: 24,
    blackHoleSoftening: 18,
    blackHoleMassScale: 2.4
  },
  defaults: {
    particleCount: 5000,
    gravityStrength: 8,
    blackHoleStrength: 45,
    darkMatterStrength: 1500,
    armTightness: 2.4,
    timeScale: 0.09,
    barnesHutTheta: 0.85
  }
};
