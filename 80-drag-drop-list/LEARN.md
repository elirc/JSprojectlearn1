# 📘 Learning Guide: Drag-and-Drop Reorder

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A list you can reorder by dragging — six items, drag one above another, drop, done. Every to-do app, playlist, and kanban board has this.

Both versions look identical while you drag. The difference shows up when you press the **Print state** button, which prints two lines:

```
items array: Wake up → Coffee → Code → Lunch → Code more → Sleep
on screen:   Coffee → Wake up → Code → Lunch → Code more → Sleep
THE STATE AND THE SCREEN DISAGREE.
```

In the original, those two lines drift apart the moment you drag anything, and every feature built on the array — saving, undo, syncing — inherits the wrong answer. In the refactor they *cannot* disagree, because the second line is drawn from the first.

## 2. Concepts you need first

### HTML5 drag and drop, in five events

You mark an element `draggable="true"` and the browser fires:

- **`dragstart`** on the element you picked up — this is where you record *what* is being dragged.
- **`dragover`** on whatever you're currently over, many times per second. It has one weird job: **calling `event.preventDefault()` here is what makes the element a legal drop target.** Skip it and `drop` never fires at all. (This is the line everybody copies from the internet without knowing why; now you know why.)
- **`drop`** when the user lets go over a legal target — this is where the actual change belongs.
- **`dragend`** on the original element when the gesture finishes, however it ended. Good place to clear visual leftovers.
- (`dragenter`/`dragleave` also exist; we don't need them here.)

### `dataTransfer`: the drag's little suitcase

`event.dataTransfer.setData('text/plain', '3')` in `dragstart` and `getData('text/plain')` in `drop` is how a drag carries a payload. The important part is that it carries **data** — a string — not an object reference. That's a feature: a string still means something after the page re-renders, while a saved DOM node might by then be an element that no longer exists.

(Browsers deliberately block reading `getData` during `dragover` — you can only read it on `drop`. So any decision needing the payload has to wait for the drop, which is exactly where it belonged anyway.)

### Gestures vs state changes

A **gesture** is what the user's hand did: pointer down at row 4, moved to row 1, released. A **state change** is what your data should become: `moveItem(items, 3, 0)`.

The browser gives you gestures. Only you can define the state change — and it's a much smaller, cleaner thing: two integers. Every drag-and-drop library ever written boils down to the same funnel:

```
messy pointer events  →  (from, to)  →  pure state change  →  re-render
```

Getting those numbers out early is the whole design.

### Why "just move the node" is a trap

`list.insertBefore(dragged, over)` moves an existing element to a new position. One line, instant, visually perfect. The trap is that **the move exists only as a picture.** The array that describes your list never changed, so:

- saving saves the old order,
- the counter/undo/export features read the old order,
- and the only way to recover the real order is to *read it back off the screen* — at which point the DOM has become your database (project 14's disease, react#15's version of the same argument).

### Pure functions, immutability, and clamping

`moveItem(list, from, to)` is **pure**: same inputs, same output, no side effects, no DOM. It's **immutable**: it returns a *new* array and leaves the old one alone, which is what makes undo one variable (`const before = items`) instead of a feature.

**Clamping** means squeezing an index into the legal range. Dropping below the last row hands you an index of 9 in a 6-item list; clamping turns that into "the end" instead of a crash or a hole in the array.

### Two contracts for `to` (pick one, out loud)

There are two reasonable meanings for "move item 0 to position 2":

- **"ends up at index 2"** — remove first, then insert. `['a','b','c','d']` → `['b','c','a','d']`.
- **"insert before whatever is at index 2"** — which, when moving *downwards*, needs a `-1` correction, because removing the item first shifted everything up. This is the contract project 64's kanban board used, and that correction is exactly the bug it existed to demonstrate.

Neither is wrong. Not writing down which one you meant is what's wrong: it turns into drops that land one slot off, but only sometimes, and only when moving one direction.

## 3. Walking through the original code

It starts honestly enough — with data:

```js
var items = ["Wake up", "Coffee", "Code", "Lunch", "Code more", "Sleep"];
```

...which is then poured into the DOM and never mentioned again:

```js
for (var i = 0; i < items.length; i++) {
  var li = document.createElement("li");
  li.textContent = items[i];
  li.draggable = true;
  list.appendChild(li);
}
```

The drag records a DOM node in a global:

```js
var dragged = null;
list.addEventListener("dragstart", function (event) { dragged = event.target; ... });
```

And here is the whole bug, in one line, in the wrong event:

```js
list.addEventListener("dragover", function (event) {
  event.preventDefault();
  var over = event.target.closest("li");
  if (!over || over === dragged) return;
  list.insertBefore(dragged, over);   // <- the "state change"
});
```

Two separate problems are sitting on that line. First, it's a DOM mutation standing in for a data change, so `items` is now stale forever. Second, it's in `dragover`, which fires continuously *during* the gesture — so the list reshuffles under the moving pointer, which changes what the pointer is over, which fires it again. That feedback loop is the flicker you can see.

Then the consequence, made visible:

```js
document.getElementById("save").onclick = function () {
  localStorage.setItem("day-order", JSON.stringify(items)); // the STALE array
};
```

Save, reload, and your careful reordering is gone.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: two sources of truth, and they disagree within one second of use.** The array says one order, the screen shows another. There's no error, no warning — just an app that starts lying quietly. Bugs like this get reported months later as "sometimes the order is wrong after saving", and by then nobody can reproduce it because reproducing it requires *dragging*.

**Flaw 2: the fix that isn't.** "I'll just read the order off the DOM when saving." Now every feature begins by scraping your own user interface, item identity is "the text inside a `<li>`" (two items with the same text are indistinguishable), and your data model is a rendering artifact.

**Flaw 3: mutating during `dragover` fights the pointer.** The event fires dozens of times a second, and each mutation changes what the *next* one sees.

**Flaw 4: the logic is trapped in an event handler.** The interesting part — where does the item land? — sits inside a callback that needs a mouse, a browser, and a human hand to run. It cannot be tested, so it isn't.

**Flaw 5: a second way to reorder is a second implementation.** Want ↑/↓ buttons for keyboard users (and for accessibility, which drag-and-drop alone fails badly)? In this design that's a whole new pile of `insertBefore` calls with their own edge cases.

## 5. Try it yourself first!

1. **Vague hint:** after a drag, which of the two — the array or the screen — *should* be believed? Make that one the boss.
2. **Warmer:** if the array is the boss, what should the drop handler do instead of moving the node? (And who draws the list afterwards?)
3. **Warmer still:** the drop handler needs two numbers. Where does it get "from"? Where does it get "to"?
4. **Almost the answer:** write `moveItem(list, from, to)` on paper first, with no DOM anywhere. Copy the array, `splice` the item out, `splice` it back in at the target. Now `drop` is three lines: read the two numbers, call it, re-render.
5. **Decide the contract:** does `moveItem(['a','b','c','d'], 0, 2)` give `['b','c','a','d']` or `['b','a','c','d']`? Write your answer as a test before you write the function.
6. **Edge cases to name before you meet them:** dropping an item onto itself; dropping below the last row; a list with one item; a `from` that isn't a number because `getData` returned `''`.

## 6. Understanding the refactored solution

**The whole state change, in five lines that never touch a browser:**

```js
const next = [...list];
if (fromIndex === toIndex) return next;
const [moved] = next.splice(fromIndex, 1);
next.splice(toIndex, 0, moved);
return next;
```

Twelve tests cover this, including two loops that check *every* `(from, to)` pair in a 5-item list: the moved item really lands at `to`, the set of items is unchanged, and moving it back always restores the original array. That last one is a **round-trip property** — the same idea as project 19's encode/decode test — and it's worth more than a dozen hand-written examples.

**The clamp and the throw are different on purpose:**

```js
if (!Number.isInteger(from) || !Number.isInteger(to)) {
  throw new TypeError(`moveItem needs whole-number indexes, got (${from}, ${to})`);
}
```

An index of `99` has an obvious intended meaning ("the end"), so it's clamped. `'3'` or `NaN` has none — it means the caller's pointer math broke — so it throws where the mistake is, instead of politely reordering something random. Forgive what you can define; refuse what you can't.

**The drag handlers shrank into glue:**

```js
list.addEventListener('drop', (event) => {
  event.preventDefault();
  const over = event.target.closest('li');
  const from = Number(event.dataTransfer.getData('text/plain'));
  const to = over ? Number(over.dataset.index) : items.length - 1;
  move(from, to);
});
```

Read two numbers, call the action, and the action re-renders. There is no `insertBefore` anywhere in the file. Notice also that the payload is an index, not a node — data that survives a re-render.

**Decoration vs state — the honest bit.** `dragover` does add a CSS class to draw the blue line, which looks like the very thing we just banned. The difference, stated in a comment in the file: nothing ever *reads that class back*, and the next `render()` wipes it. Here's the test to apply anywhere: **if I deleted the entire DOM and re-rendered from the state, would anything be lost?** A hover highlight, no. A user's reordering, yes — so one is decoration and the other is state.

**Two gestures, one action.** The ↑/↓ buttons call `move(index, index - 1)` and `move(index, index + 1)`. That's the whole keyboard implementation, and it works because clamping already defined what "up from the top" means. When state changes are functions, adding input methods is nearly free — which is also how you make a drag-and-drop feature usable by people who can't drag.

**Persistence for free**, at the end of `render()`, because `items` is plain data — and `load()` treats stored data as untrusted input (project 63), falling back to the defaults if it's junk.

## 7. Words you learned (glossary)

- **Gesture** — what the pointer did; raw input, not meaning.
- **State change** — what the data becomes; here, `(from, to)`.
- **`draggable`** — the HTML attribute that makes an element pick-up-able.
- **`dragstart` / `dragover` / `drop` / `dragend`** — the drag lifecycle events.
- **`preventDefault` in `dragover`** — the opt-in that makes dropping possible.
- **`dataTransfer`** — the drag's payload; carry data, not DOM nodes.
- **`dataset` / `data-` attribute** — custom values on an element, written by render.
- **Source of truth** — the one place a fact really lives.
- **Pure function** — same input, same output, no side effects.
- **Immutable update** — returning a new value instead of editing the old one.
- **Clamping** — forcing a number into the legal range.
- **No-op** — an operation that deliberately changes nothing.
- **Round-trip property** — do it, undo it, get the original back.
- **Decoration vs state** — pixels you can throw away vs facts you can't.
- **Event delegation** — one listener on the container instead of one per child.

## 8. Experiments to try on the plane (no internet needed)

1. **Watch the fork happen.** In `original.html`: click Print state (they agree), drag one item, click Print state again. Expected: the two lines differ, and the app has been wrong ever since your first drag.
2. **Lose your work.** In `original.html`: reorder, click Save order, click Reload page. Expected: the original order is back. Now do exactly the same in the refactor. Expected: your order survives.
3. **Delete the DOM, on purpose.** Open the refactor's console and run `document.getElementById('list').innerHTML = ''`, then `render()`. Expected: the list comes back exactly as it was — proof that nothing important was living in the page.
4. **Break the contract.** In the refactor's inline `moveItem`, change `next.splice(toIndex, 0, moved)` to `next.splice(toIndex + 1, 0, moved)`. Expected: drops land one slot off when moving down but look fine going up — the classic drag-and-drop bug, and the one project 64 met from the other direction. Then run `node --test 80-drag-drop-list/refactored/move.test.js` and watch which tests catch it.
5. **Remove the `preventDefault`.** Delete it from the refactor's `dragover` handler. Expected: dragging still *looks* like it works, but nothing ever drops — because without it, your list isn't a drop target at all.
6. **Add "move to top" in one line.** Give each row a ⤒ button calling `move(index, 0)`. Expected: it just works, including from the top row (clamping made it a no-op), and no test needed changing — that's what a small, well-defined action buys you.
