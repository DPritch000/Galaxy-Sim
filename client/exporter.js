export function exportState(bodies) {
  return JSON.stringify({ timestamp: Date.now(), bodies }, null, 2);
}
