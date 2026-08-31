/**
 * The window math for a virtualized list, as one pure function.
 *
 *   computeWindow(scrollTop, rowHeight, viewportHeight, total, overscan)
 *     -> { start, end, topSpacer, bottomSpacer }
 *
 * The page renders ONLY rows [start, end) — usually a dozen or so — with
 * two empty spacer divs standing in for everything above and below:
 *
 *      topSpacer px      <- empty div, as tall as all the skipped rows
 *   +----------------+
 *   |  row start     |   \
 *   |  ...           |    |  the only rows that actually exist in the DOM
 *   |  row end - 1   |   /
 *   +----------------+
 *      bottomSpacer px   <- empty div for the rest
 *
 * The invariant that keeps the scrollbar honest — and the one worth
 * testing hardest:
 *
 *   topSpacer + (end - start) * rowHeight + bottomSpacer === total * rowHeight
 *
 * The page is exactly as tall as if all `total` rows were there, so the
 * scrollbar is the right size and lands in the right place. Two empty divs
 * are doing the job of 9,988 real ones.
 *
 * Everything here is arithmetic on numbers, so it's tested in Node with no
 * browser at all. You met this idea in project 73 as one part of a bigger
 * capstone; here it IS the project, and this version clamps `scrollTop`
 * itself so over-scrolling (rubber-band on a trackpad, or a bad
 * `scrollTo`) can't push the window past the end of the list.
 */
export function computeWindow(scrollTop, rowHeight, viewportHeight, total, overscan = 2) {
  if (total <= 0) return { start: 0, end: 0, topSpacer: 0, bottomSpacer: 0 };

  // Scroll positions outside the real range are normal, not exotic:
  // trackpads over-scroll, and restoring a saved position can overshoot.
  const maxScrollTop = Math.max(0, total * rowHeight - viewportHeight);
  const clamped = Math.min(Math.max(scrollTop, 0), maxScrollTop);

  const firstVisible = Math.floor(clamped / rowHeight);
  // +1 because the viewport almost always shows a sliver of one more row.
  const rowsOnScreen = Math.ceil(viewportHeight / rowHeight) + 1;

  // `overscan` rows beyond each edge are rendered but off-screen, so a fast
  // scroll shows content instead of blank space for one frame.
  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(total, firstVisible + rowsOnScreen + overscan);

  return {
    start,
    end,
    topSpacer: start * rowHeight,
    bottomSpacer: (total - end) * rowHeight,
  };
}
