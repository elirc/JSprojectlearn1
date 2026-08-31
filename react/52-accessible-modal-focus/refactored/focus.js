/**
 * The focus trap's ENTIRE decision-making, as pure functions:
 *
 *   whichElementNext = nextFocusIndex(currentIndex, count, { shift })
 *
 * No React and no DOM in this file — which is exactly the point. A focus
 * trap does two different jobs, and only one of them is hard:
 *
 *   DECIDE: given the elements inside the dialog and where focus is now,
 *           which one should receive focus next?   <- pure, here, tested
 *   DO:     el.focus()                             <- one line, browser's job
 *
 * That's the js track's "separate deciding from doing" split (js#17,
 * js#40), aimed at the keyboard. The decisions are arithmetic over a
 * list, so focus.test.js checks every wrap-around rule in Node with
 * fake elements — no browser, no tabbing, no screen reader.
 *
 * A "fake element" here is any object with the fields the rules read:
 *   { tag, disabled, hidden, tabIndex, type, href, inHiddenSubtree }
 * Real DOM elements have those fields too (`el.tagName.toLowerCase()`
 * aside), so the same predicate serves the browser and the tests.
 */

/**
 * What the browser should even consider. `Modal` runs this through
 * `container.querySelectorAll(...)` to collect candidates in DOM order,
 * then filters them with `getFocusable` below.
 *
 * `[tabindex]` is included because any element with a tabindex can take
 * focus — including a `<div tabindex="0">`; the `:not([tabindex="-1"])`
 * filters out the "focusable by script only" ones. This selector is the
 * boring, well-known one; the interesting rules live in `isFocusable`.
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[tabindex]',
].join(', ');

/**
 * Can this element actually receive keyboard focus?
 *
 * Rules, each one a real way an element drops out of the tab order:
 *  - `disabled`         — a disabled control is skipped entirely.
 *  - `hidden`           — the HTML `hidden` attribute; not rendered, not focusable.
 *  - `inHiddenSubtree`  — an ancestor is `display: none` / `visibility: hidden`.
 *                         The DOM answers this with `el.offsetParent === null`
 *                         (see index.html); the pure rule takes it as a flag,
 *                         because "is my grandparent visible" is a browser
 *                         question, not an arithmetic one.
 *  - `tabIndex < 0`     — `tabindex="-1"` means "focusable by script, not by Tab".
 *  - `type === 'hidden'`— `<input type="hidden">` is data, not a control.
 *  - `a` without `href` — an anchor with no destination is just text.
 */
export function isFocusable(el) {
  if (!el) return false;
  if (el.disabled) return false;
  if (el.hidden) return false;
  if (el.inHiddenSubtree) return false;
  if (typeof el.tabIndex === 'number' && el.tabIndex < 0) return false;
  if (el.type === 'hidden') return false;
  if (el.tag === 'a' && !el.href) return false;
  return true;
}

/**
 * The tab order inside the dialog: the focusable candidates, in the order
 * they were given. That order is DOM order, and for elements at
 * `tabindex="0"` (which is all of them, in a sane dialog) DOM order IS
 * tab order — so no sorting is needed, only filtering.
 */
export function getFocusable(candidates) {
  return Array.from(candidates ?? []).filter(isFocusable);
}

/** The element Tab should land on when focus arrives from outside the trap. */
export function firstFocusable(list) {
  const focusable = getFocusable(list);
  return focusable.length > 0 ? focusable[0] : null;
}

/** Its mirror image, for Shift+Tab arriving from outside. */
export function lastFocusable(list) {
  const focusable = getFocusable(list);
  return focusable.length > 0 ? focusable[focusable.length - 1] : null;
}

/**
 * The wrap-around math — the whole trap, in one expression.
 *
 * `currentIndex` is where focus is now (an index into the focusable list,
 * or -1 when focus is somewhere outside the dialog entirely), `count` is
 * how many focusable elements the dialog has, and `shift` says whether
 * Shift was held.
 *
 * Returns the index to focus next, always in range, or -1 when there is
 * nothing to focus at all (an empty dialog — the caller does nothing).
 *
 * The three cases worth naming:
 *  - past the last element, Tab wraps to the first;
 *  - before the first, Shift+Tab wraps to the last;
 *  - focus outside the trap (-1) is pulled back in — to the first on Tab,
 *    to the last on Shift+Tab, which is what a user reaching the dialog
 *    from either direction expects.
 */
export function nextFocusIndex(currentIndex, count, { shift = false } = {}) {
  if (count <= 0) return -1;
  if (currentIndex < 0 || currentIndex >= count) return shift ? count - 1 : 0;
  const step = shift ? -1 : 1;
  return (currentIndex + step + count) % count;
}
