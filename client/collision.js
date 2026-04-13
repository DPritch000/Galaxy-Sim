import { distance } from "./sim-utils.js";

export function areBodiesColliding(a, b) {
  return distance(a, b) <= a.radius + b.radius;
}
