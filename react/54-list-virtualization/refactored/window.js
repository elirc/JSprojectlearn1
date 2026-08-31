/**
 * The windowing math, as one pure function:
 *
 *   window = computeWindow(scrollTop, rowHeight, viewportHeight, total, overscan)
 *
 * No React and no DOM in this file — which is exactly the point. "Which
 * rows are on screen right now?" is arithmetic over five numbers, so
 * window.test.js pins down every edge (empty lists, short lists, bounce
 * scrolling, both ends of the overscan clamp) in Node without a browser,
 * a scrollbar, or a single rendered pixel. The component's job shrinks to
 * reading `scrollTop` and slicing.
 *
 * Returns:
 *   startIndex   first row to render, INCLUSIVE
 *   endIndex     last row to render,  INCLUSIVE   (slice with endIndex + 1)
 *   visibleCount how many rows that is: endIndex - startIndex + 1
 *   offsetY      pixels of empty space above the first rendered row
 *   totalHeight  pixels the full list would occupy (keeps the scrollbar honest)
 *
 * The inclusive/inclusive choice is deliberate: `endIndex` is a real row
 * you can point at on screen, which makes the tests readable ("ends at
 * 4999, the last row"). The one place it costs you is the slice call,
 * which must say `slice(startIndex, endIndex + 1)`.
 *
 * The empty list is represented as `{ startIndex: 0, endIndex: -1 }` —
 * the standard "empty range" shape, where endIndex < startIndex means
 * "nothing", and `slice(0, 0)` politely returns [].
 */
export function computeWindow(scrollTop, rowHeight, viewportHeight, total, overscan = 3) {
  // Nonsense inputs get the empty window rather than a division by zero.
  // A rowHeight of 0 would make `floor(scrollTop / 0)` = Infinity, and an
  // Infinity index poisons every number downstream; refusing early is
  // cheaper than explaining NaN in a stack trace (js#30's boundary check).
  if (total <= 0 || rowHeight <= 0) {
    return { startIndex: 0, endIndex: -1, visibleCount: 0, offsetY: 0, totalHeight: 0 };
  }

  const totalHeight = total * rowHeight;

  // Bounce scrolling (and some touchpads) report a negative scrollTop.
  // Treat "above the top" as "at the top".
  const safeScrollTop = Math.max(0, scrollTop);

  // The first row whose bottom edge is below the top of the viewport.
  // Clamped to the last row, because `scrollTop` can outrun the list: type
  // in the filter box while scrolled to row 4000 and the list is suddenly
  // 12 rows long, but the browser hasn't reset the scroll position yet.
  // Without this clamp that render asks for rows 3997..4012 of a 12-row
  // array and gets an inverted, empty range instead of the last few rows.
  const firstVisible = Math.min(
    Math.floor(safeScrollTop / rowHeight),
    total - 1,
  );

  // How many rows the viewport can show. The +1 covers the partial row
  // at the bottom: a 400px viewport over 40px rows shows 10 whole rows
  // plus a sliver of an 11th whenever scrollTop isn't a clean multiple.
  const visibleRows = Math.ceil(viewportHeight / rowHeight) + 1;

  // Overscan: render a few rows beyond each edge so a fast scroll paints
  // real rows instead of white space. Clamped at both ends of the array.
  const startIndex = Math.max(0, firstVisible - overscan);
  const endIndex = Math.min(total - 1, firstVisible + visibleRows - 1 + overscan);

  return {
    startIndex,
    endIndex,
    visibleCount: endIndex - startIndex + 1,
    offsetY: startIndex * rowHeight,
    totalHeight,
  };
}
