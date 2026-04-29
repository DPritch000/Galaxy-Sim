export const SIM_CONFIG = {
  width: 960,
  height: 540,
  forceScale: {
    stellar: 0.0058,
    halo: 0.0036
  },
  structure: {
    coreRadius: 220,
    haloCoreRadius: 220,
    localSoftening: 40,
    blackHoleSoftening: 18,
    blackHoleMassScale: 1.45
  },
  formation: {
    collapseSteps: 320,
    settleSteps: 950,
    earlyDtScale: 0.7,
    earlySofteningBoost: 2.1,
    coolingStrength: 0.006,
    coolingRadius: 250,
    planeDamping: 0.22,
    planeRestore: 0.004,
    blackHoleCentering: 0.00045,
    blackHoleDampingEarly: 0.975,
    blackHoleDampingLate: 0.992
  },
  defaults: {
    particleCount: 5000,
    gravityStrength: 8,
    blackHoleStrength: 45,
    darkMatterStrength: 1500,
    armTightness: 1.7,
    rotationStrength: 1.2,
    timeScale: 0.09,
    barnesHutTheta: 0.85
  }
};
