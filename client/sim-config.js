export const SIM_CONFIG = {
  width: 960,
  height: 540,
  forceScale: {
    stellar: 0.0058,
    halo: 0.0036
  },
  structure: {
    coreRadius: 180,
    haloCoreRadius: 260,
    localSoftening: 40,
    blackHoleSoftening: 16,
    blackHoleMassScale: 1.6
  },
  formation: {
    collapseSteps: 320,
    settleSteps: 950,
    earlyDtScale: 0.7,
    earlySofteningBoost: 2.1,
    coolingStrength: 0.0035,
    coolingRadius: 250,
    planeDamping: 0.22,
    planeRestore: 0.004,
    rotationalSupport: 0.35,
    radialDamping: 0.2,
    verticalDamping: 0.35,
    blackHoleCentering: 0.0006,
    blackHoleDampingEarly: 0.975,
    blackHoleDampingLate: 0.992
  },
  defaults: {
    particleCount: 5000,
    gravityStrength: 8,
    blackHoleStrength: 62,
    darkMatterStrength: 1650,
    armTightness: 1.7,
    rotationStrength: 1.12,
    timeScale: 0.08,
    barnesHutTheta: 0.85
  }
};
