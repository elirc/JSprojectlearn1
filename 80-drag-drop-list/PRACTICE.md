# 🏋️ Practice: Drag-and-Drop Reorder

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Most of these are pure functions you can run with `node --test 80-drag-drop-list/`; exercise 4 is checked in the browser.

## Exercises

### ⭐ 1. Announce the move (warm-up)
A drag is invisible to a screen reader — and to anyone who looked away. Write the pure `describeMove(list, from, to)` returning the sentence you'd put in an `aria-live` region, using **1-based positions** because that's how humans count: `'Moved Code from position 3 to 1 of 3.'`. Handle the no-op (`from === to`) with `'Wake up is already at position 1 of 3.'`, clamp like `moveItem` does so `to: 99` says "to 3 of 3", and return `'Nothing to move.'` for an empty list. Items may be strings or `{id, text}` objects.
What it practices: deriving user-facing text from state with a pure function — testable, translatable, and reusable by both the drag and the buttons.
Hint: clamp `from` and `to` exactly the way `moveItem` does, or your sentence will describe a move that didn't happen. `+ 1` on both indexes at the very end, once.

### ⭐⭐ 2. Undo, in six lines (core)
Add an Undo button. Keep `const history = []`; every action pushes the **current array** before replacing it, and `undo()` pops the last one back and re-renders. Undo with an empty history must do nothing. Check in node: from `['a','b','c','d','e']`, `move(0,2)` then `move(4,0)` gives `['e','b','c','a','d']`; one undo gives `['b','c','a','d','e']`; a second gives the original; a third does nothing.
What it practices: cashing in on immutability — because `moveItem` never edits the old array, a snapshot is just a reference you kept.
Hint: `history.push(items)` — no `JSON.parse(JSON.stringify(...))` needed here, unlike project 14's undo. Ask yourself why the deep copy was necessary there and isn't here; the answer is the whole reason to return new arrays.

### ⭐⭐ 3. Move by id, not by index (core)
`dataset.index` is a *position*, and positions go stale the moment the list changes — the item you grabbed as index 3 may be index 2 by the time you drop, if something was removed in between (or by another user, in a shared app). Write `moveItemById(list, id, to)` that finds the current index by id and delegates to `moveItem`, returning an unchanged copy when the id isn't in the list. Then swap the page over: put `item.id` in `dataTransfer` instead of the index. Check in node with `[{id:11},{id:22},{id:33},{id:44}]`: moving id 33 to 0 gives ids `[33,11,22,44]`, moving id 999 changes nothing, and moving an id after its item was removed doesn't throw.
What it practices: identity vs position — the distinction behind React's `key` prop, database primary keys, and project 64's card ids.
Hint: `list.findIndex((item) => item.id === id)` returns `-1` for "not here", which is exactly the case `moveItem` would happily clamp to 0 and get wrong. Catch it before you delegate.

### ⭐⭐ 4. Keyboard reorder that keeps its place (core)
Make each row focusable (`tabIndex = 0`) and reorder with Alt+↑ / Alt+↓ when a row has focus. The bug you'll hit immediately: `render()` replaces every `<li>`, so the element that had focus no longer exists and focus falls back to the page — press Alt+↓ three times and only the first one works. Fix it by refocusing after render: remember which index the item moved to and call `.focus()` on that row. Check in the browser: focus "Coffee" with Tab, hold Alt and press ↓ three times — it walks down three places and stays focused the whole way.
What it practices: the cost of wipe-and-redraw, and its standard cure — restore what the DOM was holding (focus, scroll, selection) from state you kept.
Hint: `event.altKey && event.key === 'ArrowDown'`, and `event.preventDefault()` so the page doesn't scroll. After `move(index, index + 1)`, the item is at the clamped target index — the same number `describeMove` prints — so `list.children[target]?.focus()`.

### ⭐⭐⭐ 5. Drop above or below, like a real list (challenge)
Right now, dropping anywhere on row `j` means "become row `j`". Real reorder UIs split each row in half: the top half means *before* this row, the bottom half means *after* it. Write `dropIndexFor(list, from, hoverIndex, isBelowMiddle)` returning the `to` for `moveItem`, then compute `isBelowMiddle` in the drop handler from the pointer position. With `['a','b','c','d']`: dragging `'a'` onto the top half of `'c'` gives `['b','a','c','d']`, the bottom half gives `['b','c','a','d']`; dragging `'d'` onto the top half of `'b'` gives `['a','d','b','c']`, the bottom half gives `['a','b','d','c']`; either half of the row you're already on changes nothing.
What it practices: the off-by-one at the heart of every drag-and-drop implementation — met head-on, in a pure function, with a loop over all 32 combinations to prove it.
Hint: think in two steps. First the *slot between rows* you're pointing at: `hoverIndex + (isBelowMiddle ? 1 : 0)`. Then correct for the fact that `moveItem` removes the dragged item first, which shifts every slot after it down by one: subtract 1 when `from < slot`. In the handler, `const box = over.getBoundingClientRect(); const isBelowMiddle = event.clientY > box.top + box.height / 2;`.

### ⭐⭐⭐ 6. Move a whole selection (challenge)
Let the user select several rows (a `Set` of ids, click to toggle) and drag them as a block. Write `moveMany(list, indexes, to)`: the selected items land contiguously starting at `to` in the result, **in their original relative order**, whatever order the indexes arrive in. Junk indexes (duplicates, negatives, past the end) are ignored; an empty selection returns a copy. Check with `['a','b','c','d','e']`: `moveMany(list, [0,2], 3)` → `['b','d','e','a','c']`; `moveMany(list, [3,1], 0)` → `['b','d','a','c','e']`; `moveMany(list, [1], 3)` must equal `moveItem(list, 1, 3)`; and the input array is never touched.
What it practices: generalizing an operation without breaking the special case — plus the trick that makes multi-move easy instead of horrible.
Hint: don't try to splice repeatedly, and don't move them one at a time (each move invalidates the other indexes — the exact stale-position problem from exercise 3). Split the list into `moving` and `rest` in one pass each, then rebuild: `[...rest.slice(0, at), ...moving, ...rest.slice(at)]`. Note `to` is now an index into `rest`, so it may legally equal `rest.length` — "at the very end".

## Solutions

### 1. Announce the move
```js
export function describeMove(list, from, to) {
  if (list.length === 0) return 'Nothing to move.';
  const last = list.length - 1;
  const fromIndex = Math.min(Math.max(from, 0), last);
  const toIndex = Math.min(Math.max(to, 0), last);
  const item = list[fromIndex];
  const name = typeof item === 'string' ? item : item.text;
  if (fromIndex === toIndex) return `${name} is already at position ${toIndex + 1} of ${list.length}.`;
  return `Moved ${name} from position ${fromIndex + 1} to ${toIndex + 1} of ${list.length}.`;
}
```
WHY: the clamping is duplicated from `moveItem` on purpose here — and that duplication is a smell worth noticing. If it bothers you, the fix is to export a tiny shared `clampIndex(index, length)` and have both call it; then the sentence can never describe a move the function didn't make. Positions are `+ 1` because "the first item" is position 1 to a human and index 0 to an array, and mixing the two up is how UIs end up announcing "moved to position 0". Verified by running: all five expectations, including the empty list and the clamped `to: 99`.

### 2. Undo, in six lines
```js
const history = [];

function move(from, to) {
  history.push(items);              // the OLD array, untouched, still valid
  items = moveItem(items, from, to);
  render();
}

function undo() {
  if (history.length === 0) return; // mashing undo is not an error
  items = history.pop();
  render();
}
```
WHY: compare this with project 14's undo, which needed `JSON.stringify` snapshots. There, `toggleTodo` **mutated** an object inside the array, so a kept reference would silently change under you — the snapshot had to be a deep copy. Here nothing is ever mutated: `moveItem` returns a new array and leaves the old one exactly as it was, so "remember the previous state" costs one pointer and zero bytes of copying. That's the practical payoff of immutability, and it's why project 39's history and project 59's store both insist on it. Verified by running: two moves, two undos back to the original, and a third undo that safely does nothing.

### 3. Move by id, not by index
```js
export function moveItemById(list, id, to) {
  const from = list.findIndex((item) => item.id === id);
  if (from === -1) return [...list]; // the item is gone: nothing to do
  return moveItem(list, from, to);
}

// in the page:
event.dataTransfer.setData('text/plain', String(item.id));   // dragstart
const id = Number(event.dataTransfer.getData('text/plain')); // drop
items = moveItemById(items, id, to);
```
WHY: an index is a fact about *the list as it was a moment ago*; an id is a fact about the item. Between `dragstart` and `drop`, seconds pass — plenty of time for a filter to change, a timer to remove a row, or (in a collaborative app) someone else to insert one. With indexes, all of those quietly move the wrong item, and `moveItem`'s clamp makes the wrong answer look plausible instead of throwing. The `-1` guard is the important line: without it, "the item isn't here any more" becomes "move index -1", which clamps to 0 and reorders something innocent. Verified by running: id 33 to the front, an unknown id as a no-op, and a removed item handled without a crash.

### 4. Keyboard reorder that keeps its place
```js
// in render(), make rows focusable:
li.tabIndex = 0;

// one delegated listener:
list.addEventListener('keydown', (event) => {
  if (!event.altKey) return;
  const li = event.target.closest('li');
  if (!li) return;
  const index = Number(li.dataset.index);
  const target = event.key === 'ArrowUp' ? index - 1
               : event.key === 'ArrowDown' ? index + 1
               : null;
  if (target === null) return;
  event.preventDefault();               // don't scroll the page
  move(index, target);
  const landed = Math.min(Math.max(target, 0), items.length - 1);
  list.children[landed]?.focus();       // the old <li> no longer exists
});
```
WHY: wipe-and-redraw is a wonderful default and this is its bill. The DOM holds a few things your state doesn't — focus, text selection, scroll position, an open `<details>` — and replacing elements throws them away. The cure is not to stop re-rendering; it's to restore the one or two things that matter, from state you already have. (React solves this by *reusing* elements it can match by `key` — which is the same fix seen from the other end: give the framework a way to know that this new row is that old row.) The clamp on `landed` is what makes Alt+↑ on the first row a harmless no-op that keeps focus where it is. Checked in the browser: focus survives three consecutive Alt+↓ presses.

### 5. Drop above or below, like a real list
```js
export function dropIndexFor(list, from, hoverIndex, isBelowMiddle) {
  const slot = hoverIndex + (isBelowMiddle ? 1 : 0);  // the gap you're pointing at
  const to = from < slot ? slot - 1 : slot;           // removal shifts later slots up by one
  return Math.min(Math.max(to, 0), list.length - 1);
}

// in the drop handler:
const box = over.getBoundingClientRect();
const isBelowMiddle = event.clientY > box.top + box.height / 2;
move(from, dropIndexFor(items, from, Number(over.dataset.index), isBelowMiddle));
```
WHY: two coordinate systems meet in this function, and naming them separately is what makes it tractable. `slot` counts the **gaps between rows** (0 is above row 0, 4 is below row 3) — the natural way to describe where a drop lands. `to` counts **positions in the array after the item has been removed**, which is what `moveItem` wants. The `-1` is the whole conversion: everything after `from` slides up one when `from` leaves. Try to reason about it in one step and you get the classic "off by one, but only when dragging downwards" bug that ships in half the drag-and-drop code on the internet. The loop over all 32 combinations is the proof: the dragged item always ends up directly above or below the row you hovered, or nothing changes if it was already there. Verified by running.

### 6. Move a whole selection
```js
export function moveMany(list, indexes, to) {
  const picked = [...new Set(indexes)]
    .filter((index) => Number.isInteger(index) && index >= 0 && index < list.length)
    .sort((a, b) => a - b);                       // original order, not click order
  if (picked.length === 0) return [...list];

  const moving = picked.map((index) => list[index]);
  const rest = list.filter((_, index) => !picked.includes(index));
  const insertAt = Math.min(Math.max(to, 0), rest.length);
  return [...rest.slice(0, insertAt), ...moving, ...rest.slice(insertAt)];
}
```
WHY: the insight is refusing to do it incrementally. "Move each selected item in turn" fails because the first move renumbers everything the later moves were counting on — the same stale-position trap as exercise 3, now self-inflicted. Splitting into `moving` + `rest` sidesteps it: after the split there are no stale indexes left, because there's only one insertion point in a list nobody has touched since. The `sort` is what preserves relative order regardless of the order the user clicked, and dropping junk indexes rather than throwing matches `moveItem`'s "clamp what has a meaning" spirit — though you could defend throwing instead, as long as you write it down. Verified by running: 8 direct expectations plus every (selection, destination) pair, each keeping all five items with the block intact.
