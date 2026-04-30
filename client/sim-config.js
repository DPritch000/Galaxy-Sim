export const SIM_CONFIG = {
  width: 960,
  height: 540,
  forceScale: {
    stellar: 0.035,
    halo: 0.0022,
    coreVertical: 0.35,
    supportRelaxation: 0.055,
    radialDamping: 0.008
  },
  structure: {
    coreRadius: 95,
    haloCoreRadius: 170
  },
  defaults: {
    particleCount: 5000,
    gravityStrength: 6,
    blackHoleStrength: 60,
    darkMatterStrength: 2200,
    armTightness: 2.8,
    timeScale: 0.12,
    barnesHutTheta: 0.85
  }
};
