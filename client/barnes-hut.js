class QuadNode {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.body = null;
    this.children = null;
    this.mass = 0;
    this.comX = 0;
    this.comY = 0;
    this.comZ = 0;
  }
}

function contains(node, body) {
  return (
    body.x >= node.x &&
    body.x < node.x + node.size &&
    body.y >= node.y &&
    body.y < node.y + node.size
  );
}

function subdivide(node) {
  const half = node.size / 2;
  node.children = [
    new QuadNode(node.x, node.y, half),
    new QuadNode(node.x + half, node.y, half),
    new QuadNode(node.x, node.y + half, half),
    new QuadNode(node.x + half, node.y + half, half)
  ];
}

function insertBody(node, body) {
  if (!contains(node, body)) {
    return false;
  }

  if (!node.children && !node.body) {
    node.body = body;
    return true;
  }

  if (!node.children) {
    subdivide(node);
    const existing = node.body;
    node.body = null;
    if (existing) {
      for (const child of node.children) {
        if (insertBody(child, existing)) {
          break;
        }
      }
    }
  }

  for (const child of node.children) {
    if (insertBody(child, body)) {
      return true;
    }
  }

  return false;
}

function computeMassDistribution(node) {
  if (!node.children) {
    if (!node.body) {
      node.mass = 0;
      node.comX = 0;
      node.comY = 0;
      node.comZ = 0;
      return;
    }

    node.mass = node.body.mass;
    node.comX = node.body.x;
    node.comY = node.body.y;
    node.comZ = node.body.z || 0;
    return;
  }

  let mass = 0;
  let weightedX = 0;
  let weightedY = 0;
  let weightedZ = 0;

  for (const child of node.children) {
    computeMassDistribution(child);
    if (child.mass > 0) {
      mass += child.mass;
      weightedX += child.comX * child.mass;
      weightedY += child.comY * child.mass;
      weightedZ += child.comZ * child.mass;
    }
  }

  node.mass = mass;
  if (mass > 0) {
    node.comX = weightedX / mass;
    node.comY = weightedY / mass;
    node.comZ = weightedZ / mass;
  } else {
    node.comX = 0;
    node.comY = 0;
    node.comZ = 0;
  }
}

export function buildBarnesHutTree(bodies, width, height) {
  if (bodies.length === 0) {
    return new QuadNode(0, 0, Math.max(width, height));
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const body of bodies) {
    if (body.x < minX) minX = body.x;
    if (body.x > maxX) maxX = body.x;
    if (body.y < minY) minY = body.y;
    if (body.y > maxY) maxY = body.y;
  }

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const size = Math.max(spanX, spanY, Math.max(width, height) * 0.5) * 1.2;
  const centerX = (minX + maxX) * 0.5;
  const centerY = (minY + maxY) * 0.5;
  const root = new QuadNode(centerX - size * 0.5, centerY - size * 0.5, size);

  for (const body of bodies) {
    insertBody(root, body);
  }

  computeMassDistribution(root);
  return root;
}

export function computeAccelerationBarnesHut(root, body, theta, gravityStrength) {
  let ax = 0;
  let ay = 0;
  let az = 0;
  const stack = [root];
  // Softening length ε = 6px prevents force divergence when stars get close.
  // At galaxy scale (hundreds of pixels) this is imperceptible on normal orbits
  // but stops runaway clumps during cloud collapse.
  const epsilonSq = 36;

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || node.mass === 0) {
      continue;
    }

    if (!node.children && node.body === body) {
      continue;
    }

    const dx = node.comX - body.x;
    const dy = node.comY - body.y;
    const dz = node.comZ - (body.z || 0);
    const distSq = dx * dx + dy * dy + dz * dz + epsilonSq;
    const dist = Math.sqrt(distSq);

    if (!node.children || node.size / dist < theta) {
      const invDist3 = 1 / (distSq * dist);
      const scale = gravityStrength * node.mass * invDist3;
      ax += dx * scale;
      ay += dy * scale;
      az += dz * scale;
      continue;
    }

    for (const child of node.children) {
      stack.push(child);
    }
  }

  return { ax, ay, az };
}
