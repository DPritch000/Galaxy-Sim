import { generateBodies } from "../galaxy-generator.js";

const start = performance.now();
for (let i = 0; i < 500; i += 1) {
  generateBodies(100, 1000, 700);
}
const duration = performance.now() - start;
console.log(`Generated 50,000 bodies in ${duration.toFixed(2)} ms`);
