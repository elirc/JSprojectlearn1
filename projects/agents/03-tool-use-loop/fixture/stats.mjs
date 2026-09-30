/** Tiny stats helpers. `median` is deliberately broken — the agent's job. */

export function mean(values) {
  if (values.length === 0) throw new Error("mean of empty array");
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function median(values) {
  if (values.length === 0) throw new Error("median of empty array");
  // BUG: assumes the input is already sorted, and ignores that even-length
  // arrays have two middle elements.
  return values[Math.floor(values.length / 2)];
}
