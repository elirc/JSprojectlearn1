/**
 * The math of a virtualized list, as a pure function. Given where
 * the user has scrolled, which slice of items should exist in the
 * DOM — and how much empty space stands in for everything else?
 *
 *   visibleRange({scrollTop, viewportHeight, itemHeight,
 *                 totalItems, overscan})
 *     -> { start, end, topPadding, bottomPadding }
 *
 * The DOM renders items [start, end) between two spacer paddings,
 * so the scrollbar behaves as if all totalItems were there.
 * `overscan` rows are rendered beyond each edge so fast scrolling
 * shows content, not blank.
 *
 * Every virtualized list library (react-window, TanStack Virtual)
 * is this function plus bookkeeping. It's pure, so it's tested in
 * Node — the browser only supplies scrollTop and draws the answer.
 */
export function visibleRange({ scrollTop, viewportHeight, itemHeight, totalItems, overscan = 3 }) {
  const first = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(viewportHeight / itemHeight) + 1; // +1: partial rows at both edges

  const start = Math.max(0, first - overscan);
  const end = Math.min(totalItems, first + visibleCount + overscan);

  return {
    start,
    end,
    topPadding: start * itemHeight,
    bottomPadding: (totalItems - end) * itemHeight,
  };
}
