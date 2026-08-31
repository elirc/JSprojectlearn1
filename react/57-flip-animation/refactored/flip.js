/**
 * The arithmetic half of a FLIP animation, with no DOM and no React.
 *
 * FLIP = First, Last, Invert, Play:
 *   First   — measure where things are  (the browser does this)
 *   Last    — measure where they end up (the browser does this)
 *   Invert  — work out the offset that would put each one back where it
 *             started                    (THIS FILE — pure arithmetic)
 *   Play    — remove the offset and let CSS interpolate (the browser)
 *
 * Only the Invert step is a decision, so only the Invert step is worth
 * extracting — and once it is, "does my animation compute the right
 * offsets?" becomes a unit test instead of a squint at a moving screen.
 *
 * A "rect" here is anything with numeric `left` and `top` — a real
 * `DOMRect` in the browser, a two-key object in the tests.
 */

/**
 * Given where items WERE (`prevRects`) and where they ARE NOW
 * (`nextRects`), both keyed by item id, return the transform each moved
 * item needs to *appear* not to have moved yet:
 *
 *   { [id]: { dx, dy } }   // translate(dx, dy) puts it back on its old spot
 *
 * Rules, all of them load-bearing:
 * - previous minus current. Something that slid 40px right gets dx -40,
 *   because the offset undoes the move.
 * - ids missing from either side are skipped — an item that just
 *   appeared has no "before" to fly from, and one that left has no
 *   element to animate.
 * - movements smaller than `epsilon` are dropped. Browsers lay out on
 *   fractional pixels, so "didn't move" routinely measures as 0.0001,
 *   and animating a tenth of a pixel costs a composited layer for
 *   nothing.
 */
export function computeInversions(prevRects, nextRects, epsilon = 0.5) {
  const inversions = {};
  for (const id of Object.keys(nextRects)) {
    const prev = prevRects[id];
    if (!prev) continue; // entered this render: nothing to invert from
    const next = nextRects[id];
    const dx = prev.left - next.left;
    const dy = prev.top - next.top;
    if (Math.abs(dx) < epsilon && Math.abs(dy) < epsilon) continue; // stood still
    inversions[id] = { dx, dy };
  }
  return inversions;
}

/**
 * Which ids appeared, vanished, or stayed between two measurements.
 * Not needed for a pure reorder, but it's the same data an enter/exit
 * animation needs, and it costs four lines.
 */
export function diffKeys(prevRects, nextRects) {
  const prevIds = Object.keys(prevRects);
  const nextIds = Object.keys(nextRects);
  return {
    entered: nextIds.filter((id) => !(id in prevRects)),
    exited: prevIds.filter((id) => !(id in nextRects)),
    stayed: nextIds.filter((id) => id in prevRects),
  };
}
