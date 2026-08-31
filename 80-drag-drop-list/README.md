# 80 — Drag-and-drop reorder

**Lesson: a gesture is not a state change. The browser reports where the pointer
went; your array decides what the list becomes — and the array is the only thing
allowed to be right.**

## Run it

```
node --test 80-drag-drop-list/
```

Open `original.html`, drag two items around, then click **Print state**. Do the
same in `refactored/index.html`. One of them tells you the truth.

## What's wrong with the original?

It reorders by moving the DOM node — `list.insertBefore(dragged, over)` inside
`dragover`. It looks perfect and it is quietly broken:

1. **The state and the screen fork.** The `items` array that built the list is
   never updated, so after one drag they disagree — and the "Print state" button
   proves it in two lines. Nothing will ever reconcile them, because nothing knows
   they diverged.
2. **Every feature built on the state is now wrong.** Click **Save order**, then
   **Reload page**: your reordering is gone, because what got saved was the array.
   Sending to a server, undo, "reset to default", exporting — all inherit the lie.
3. **The mutation happens during `dragover`**, which fires many times a second
   *while the pointer moves*. The list rearranges under the cursor, which changes
   what the cursor is over, which fires it again: that's the flicker.
4. **The drag payload is a live DOM node in a global**, and items have no ids —
   so "which item is this?" can only be answered by pointing at the screen.
5. **The reordering logic lives inside a pointer event**, where no test can reach
   it. The trickiest part of the feature is the least testable part of the app.

## What changed in the refactor

- **`moveItem(list, from, to)` — pure, immutable, and the entire feature.** It
  states its contract out loud: `to` is *the index the item ends up at*. (Project
  64's board chose the other contract, "insert before this index", which is why it
  needed that off-by-one when moving downwards. Neither is wrong; not saying which
  one you meant is.)
- **Out-of-range indexes are clamped** ("dropped below the last row" means the
  end), `from === to` is a no-op that still returns a fresh array, and non-integer
  indexes **throw** — because those come from broken pointer math, and a silent
  clamp would hide it.
- **The drag handlers decide nothing.** `dragstart` puts an *index* in
  `dataTransfer` (data, not a node), `drop` reads the target index and calls
  `move(from, to)`, and `render()` redraws from `items`. The DOM is never patched.
- **The blue drop line is decoration and says so in a comment** — nothing reads
  it back, and the next render wipes it. The test for "is this state?": if I
  deleted the whole DOM and re-rendered from `items`, would anything be lost?
- **↑ and ↓ buttons do the same job as the drag**, through the same one-line
  action. A second input method costs nothing when the state change is a function —
  and in the original it would have meant a second pile of DOM surgery.
- **Persistence is two lines** at the end of `render()`, because the state was
  already plain data.

## Key takeaway

You met this rule in project 14 and again in react#15; drag-and-drop is where it's
hardest to obey, because the browser will happily move the node for you and it
*looks* like the job is done. It isn't: moving a node is a picture of a change, not
the change. Turn every gesture into `(from, to)` as early as possible, hand those
numbers to a pure function, and re-render — then the hardest interaction in your app
is the one with the best test coverage.
