export class Camera {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.panX = 0;
    this.panY = 0;
    this.yaw = 0.35;
    this.pitch = 0.6;
    this.distance = 720;
    this.zoom = 1;
    this.focalLength = 820;
    this.focusX = width * 0.5;
    this.focusY = height * 0.5;
    this.focusZ = 0;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  orbit(deltaYaw, deltaPitch) {
    this.yaw += deltaYaw;
    this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch + deltaPitch));
  }

  pan(deltaX, deltaY) {
    this.panX += deltaX;
    this.panY += deltaY;
  }

  zoomBy(delta) {
    this.distance = Math.max(220, Math.min(2200, this.distance + delta));
  }

  setFocus(x, y, z = 0) {
    this.focusX = x;
    this.focusY = y;
    this.focusZ = z;
  }

  project(body) {
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;

    const x0 = body.x - this.focusX;
    const y0 = body.y - this.focusY;
    const z0 = (body.z || 0) - this.focusZ;

    const cosY = Math.cos(this.yaw);
    const sinY = Math.sin(this.yaw);
    const x1 = x0 * cosY - z0 * sinY;
    const z1 = x0 * sinY + z0 * cosY;

    const cosP = Math.cos(this.pitch);
    const sinP = Math.sin(this.pitch);
    const y2 = y0 * cosP - z1 * sinP;
    const z2 = y0 * sinP + z1 * cosP;

    const depth = this.distance + z2;
    if (depth <= 1) {
      return null;
    }

    const perspective = (this.focalLength / depth) * this.zoom;

    return {
      x: cx + this.panX + x1 * perspective,
      y: cy + this.panY + y2 * perspective,
      scale: perspective,
      depth
    };
  }
}
