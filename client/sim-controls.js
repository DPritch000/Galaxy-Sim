export function bindControls(state, camera, canvas) {
  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === " ") {
      state.paused = !state.paused;
    }
  });

  if (!canvas) {
    return;
  }

  let dragMode = null;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  canvas.addEventListener("mousedown", (event) => {
    dragMode = event.button === 2 ? "pan" : "orbit";
    lastX = event.clientX;
    lastY = event.clientY;
  });

  window.addEventListener("mouseup", () => {
    dragMode = null;
  });

  window.addEventListener("mousemove", (event) => {
    if (!dragMode) {
      return;
    }

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;

    if (dragMode === "orbit") {
      camera.orbit(dx * 0.005, -dy * 0.005);
    } else {
      camera.pan(dx, dy);
    }
  });

  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      camera.zoomBy(event.deltaY * 0.6);
    },
    { passive: false }
  );
}
