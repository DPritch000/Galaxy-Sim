import { clamp } from "../sim-utils.js";

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

assertEqual(clamp(5, 0, 10), 5, "in-range");
assertEqual(clamp(-2, 0, 10), 0, "below-range");
assertEqual(clamp(20, 0, 10), 10, "above-range");

console.log("sample.test.js passed");
