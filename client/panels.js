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
  return String(value);
}

function syncControlDisplay(input) {
  const valueNode = document.querySelector(`[data-value-for="${input.id}"]`);
  if (valueNode) {
    valueNode.textContent = formatValue(input.id, input.value);
  }
}

export function setupPanels(settings, onSettingsChange, onRegenerate, onApplyStableGalaxy) {
  const left = document.getElementById("left-panel");
  const right = document.getElementById("right-panel");

  if (left) {
    left.innerHTML = `
      <h3 class="panel-title">Simulation Notes</h3>
      <p class="panel-copy">Press space to pause or resume.</p>
      <p class="panel-copy">Use the sliders on the right to tune the system.</p>
      <p class="panel-copy">Drag left mouse to orbit. Drag right mouse to pan. Use wheel to zoom.</p>
      <p class="panel-copy">The black hole slider is intentionally softened so it shapes the core instead of swallowing the whole disk.</p>
      <p class="panel-copy">The dark matter halo supports the outer disk so stars do not all fall inward.</p>
      <p class="panel-copy">Star-to-star gravity is softened internally so the disk behaves more like a collisionless galaxy than a sticky star cluster.</p>
      <p class="panel-copy">Initial conditions now start as a star cloud so you can observe galaxy formation over time.</p>
      <p class="panel-copy">Spiral Arm Tightness acts as initial spin/organization and influences how quickly arms emerge.</p>
      <p class="panel-copy">100,000 particles is experimental and can run slowly on CPU.</p>
    `;
  }

  if (!right) {
    return;
  }

  right.innerHTML = `
    <details class="edu-controls" open>
      <summary>Educational Controls</summary>
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
        <span>Spiral Arm Tightness</span>
        <input id="armTightness" type="range" min="1.2" max="6.5" step="0.1" value="${settings.armTightness}" />
        <strong data-value-for="armTightness">${formatValue("armTightness", settings.armTightness)}</strong>
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
      <button id="stable-galaxy" type="button">Stable Galaxy</button>
      <button id="regen-system" type="button">Regenerate System</button>
    </details>
  `;

  const sliders = Array.from(right.querySelectorAll("input[type='range']"));
  const stableButton = right.querySelector("#stable-galaxy");
  const regenButton = right.querySelector("#regen-system");

  for (const slider of sliders) {
    slider.addEventListener("input", () => {
      syncControlDisplay(slider);
      onSettingsChange(slider.id, Number(slider.value));
    });
  }

  if (stableButton) {
    stableButton.addEventListener("click", () => {
      onApplyStableGalaxy();
    });
  }

  if (regenButton) {
    regenButton.addEventListener("click", () => {
      onRegenerate();
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
