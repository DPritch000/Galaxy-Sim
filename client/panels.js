function formatValue(id, value) {
  if (id === "particleCount") {
    return Number(value).toLocaleString();
  }
  if (id === "barnesHutTheta") {
    return Number(value).toFixed(2);
  }
  if (id === "armTightness") {
    return Number(value).toFixed(1);
  }
  if (id === "timeScale") {
    return `${Number(value).toFixed(2)}x`;
  }
  if (id === "starMass") {
    return `${Number(value).toFixed(1)} M☉`;
  }
  if (id === "planetCount") {
    return String(Math.round(value));
  }
  return String(value);
}

function syncControlDisplay(input) {
  const valueNode = document.querySelector(`[data-value-for="${input.id}"]`);
  if (valueNode) {
    valueNode.textContent = formatValue(input.id, input.value);
  }
}

export function setupPanels(settings, onSettingsChange, onApplyCloudCollapse, onStartPlanets) {
  const left = document.getElementById("left-panel");
  const right = document.getElementById("right-panel");

  if (left) {
    left.innerHTML = `
      <h3 class="panel-title">Simulation Notes</h3>
      <p class="panel-copy">Press space to pause or resume.</p>
      <p class="panel-copy">Use the sliders on the right to tune the system.</p>
      <p class="panel-copy">Drag left mouse to orbit. Drag right mouse to pan. Use wheel to zoom.</p>
    `;
  }

  if (!right) {
    return;
  }

  right.innerHTML = `
    <div class="panel-tabs" role="tablist" aria-label="Right panel tabs">
      <button class="panel-tab is-active" id="tab-controls" type="button" role="tab" aria-controls="tab-pane-controls" aria-selected="true" data-tab-target="controls">Controls</button>
      <button class="panel-tab" id="tab-formation" type="button" role="tab" aria-controls="tab-pane-formation" aria-selected="false" data-tab-target="formation">Galaxy Formation</button>
      <button class="panel-tab" id="tab-planets" type="button" role="tab" aria-controls="tab-pane-planets" aria-selected="false" data-tab-target="planets">Planets</button>
    </div>

    <section class="tab-pane is-active" id="tab-pane-controls" role="tabpanel" aria-labelledby="tab-controls" data-tab-pane="controls">
      <details class="edu-controls" open>
        <summary>Simulation Parameters</summary>
        <label class="field-row">
          <span>Particles</span>
          <input id="particleCount" type="range" min="500" max="100000" step="500" value="${settings.particleCount}" />
          <strong data-value-for="particleCount">${formatValue("particleCount", settings.particleCount)}</strong>
        </label>
        <label class="field-row">
          <span>Gravity Strength</span>
          <input id="gravityStrength" type="range" min="1" max="80" step="1" value="${settings.gravityStrength}" />
          <strong data-value-for="gravityStrength">${settings.gravityStrength}</strong>
        </label>
        <label class="field-row">
          <span>Black Hole Strength</span>
          <input id="blackHoleStrength" type="range" min="0" max="2500" step="25" value="${settings.blackHoleStrength}" />
          <strong data-value-for="blackHoleStrength">${Math.round(settings.blackHoleStrength)}</strong>
        </label>
        <label class="field-row">
          <span>Dark Matter Halo</span>
          <input id="darkMatterStrength" type="range" min="0" max="4000" step="50" value="${settings.darkMatterStrength}" />
          <strong data-value-for="darkMatterStrength">${Math.round(settings.darkMatterStrength)}</strong>
        </label>
        <label class="field-row">
          <span>Time Scale</span>
          <input id="timeScale" type="range" min="0.25" max="2" step="0.05" value="${settings.timeScale}" />
          <strong data-value-for="timeScale">${formatValue("timeScale", settings.timeScale)}</strong>
        </label>
        <label class="field-row">
          <span>Approximation (theta)</span>
          <input id="barnesHutTheta" type="range" min="0.35" max="1.2" step="0.05" value="${settings.barnesHutTheta}" />
          <strong data-value-for="barnesHutTheta">${formatValue("barnesHutTheta", settings.barnesHutTheta)}</strong>
        </label>
      </details>
    </section>

    <section class="tab-pane" id="tab-pane-formation" role="tabpanel" aria-labelledby="tab-formation" data-tab-pane="formation">
      <h4 class="panel-title">Galaxy Formation From Rotating Cloud</h4>
      <p class="panel-copy">Stars begin as a random rotating sphere and collapse under gravity into a disk.</p>
      <p class="panel-copy">Tip: Lower <strong>Time Scale</strong> and <strong>Theta</strong> for a smoother view of arm emergence.</p>
      <button id="formation-start" class="panel-button" type="button">Start Formation Run</button>
      <button id="formation-reset" class="panel-button" type="button">Restart Formation</button>
    </section>

    <section class="tab-pane" id="tab-pane-planets" role="tabpanel" aria-labelledby="tab-planets" data-tab-pane="planets">
      <h4 class="panel-title">Planetary Orbits</h4>
      <p class="panel-copy">Simulate planets orbiting a central star. Adjust parameters and start the simulation.</p>
      <label class="field-row">
        <span>Star Mass</span>
        <input id="starMass" type="range" min="0.1" max="5" step="0.1" value="${settings.starMass || 1.0}" />
        <strong data-value-for="starMass">${(settings.starMass || 1.0).toFixed(1)} M☉</strong>
      </label>
      <label class="field-row">
        <span>Number of Planets</span>
        <input id="planetCount" type="range" min="1" max="100" step="1" value="${settings.planetCount || 8}" />
        <strong data-value-for="planetCount">${settings.planetCount || 8}</strong>
      </label>
      <button id="planets-start" class="panel-button" type="button">Start Planet Simulation</button>
    </section>
  `;

  const sliders = Array.from(right.querySelectorAll("input[type='range']"));
  const tabButtons = Array.from(right.querySelectorAll("[data-tab-target]"));
  const tabPanes = Array.from(right.querySelectorAll("[data-tab-pane]"));
  const formationStartButton = right.querySelector("#formation-start");
  const formationResetButton = right.querySelector("#formation-reset");
  const planetsButton = right.querySelector("#planets-start");

  function activateTab(target) {
    for (const button of tabButtons) {
      const isActive = button.dataset.tabTarget === target;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    }
    for (const pane of tabPanes) {
      const isActive = pane.dataset.tabPane === target;
      pane.classList.toggle("is-active", isActive);
    }
  }

  for (const tabButton of tabButtons) {
    tabButton.addEventListener("click", () => {
      activateTab(tabButton.dataset.tabTarget);
    });
  }

  for (const slider of sliders) {
    slider.addEventListener("input", () => {
      syncControlDisplay(slider);
      onSettingsChange(slider.id, Number(slider.value));
    });
  }

  if (formationStartButton) {
    formationStartButton.addEventListener("click", () => {
      onApplyCloudCollapse();
      activateTab("formation");
    });
  }

  if (formationResetButton) {
    formationResetButton.addEventListener("click", () => {
      onApplyCloudCollapse();
      activateTab("formation");
    });
  }

  if (planetsButton) {
    planetsButton.addEventListener("click", () => {
      onStartPlanets();
      activateTab("planets");
    });
  }
}

export function setPanelValues(nextSettings) {
  for (const [id, value] of Object.entries(nextSettings)) {
    const input = document.getElementById(id);
    if (input) {
      input.value = String(value);
      syncControlDisplay(input);
    }
  }
}
