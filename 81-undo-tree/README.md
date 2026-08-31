# 81 — Undo tree

**Lesson: undo isn't a line, it's a tree. When the "correct" fix to a data
structure is "delete the user's work", the structure was the wrong shape.**

## Run it

```
node 81-undo-tree/original.js
node 81-undo-tree/refactored/demo.js
node --test 81-undo-tree/
```

## What's wrong with the original?

Nothing — that's the point of this project. It's project 39's design *after* the
fix: `past` / `present` / `future`, with the invariant enforced in one unmissable
line, `future = []`. Textbook, and what most editors ship.

Then run it and read what that line costs:

1. You write two versions of a tagline, undo back to the first, and write a third.
   **The version you undid past is now gone** — not undone, gone. It isn't in
   `past`, it isn't in `future`, and no sequence of undo and redo will ever produce
   it again. No warning, no confirmation.
2. **The model assumes backing up means "that was a mistake".** But nobody undoes
   because they're certain — they undo to *try something else*, which makes the
   abandoned attempt the most valuable thing to keep.
3. **Two variables can only ever describe one line at a time.** "I tried A, went
   back and tried B" doesn't fit, so one of them has to be destroyed to keep the
   shape valid. That's not a bug in the code; it's the code being honest about a
   shape that doesn't match reality.

## What changed in the refactor

- **Every version is a node with a parent and a list of children.** Undo walks up,
  redo walks down, and `commit` adds a child wherever you are. Committing after an
  undo creates a **second child** — a branch — instead of deleting anything. The
  line `future = []` has no equivalent, because there is nothing to throw away.
- **`jumpTo(id)` is what the shape unlocks**: any version, at any time, in one
  move. In the original, "go back to what I wrote ten minutes ago" is not a hard
  feature — it's an impossible one, because the data isn't there any more.
- **`redo()` follows the branch you were most recently on** (so redo always undoes
  an undo), and **`redo(childId)` picks a branch deliberately.** That's an API
  design decision, documented and tested, exactly like project 41's `has` choosing
  not to refresh recency.
- **Boundary moves are safe no-ops** (project 39's rule kept): undo at the root and
  redo at a leaf return the present rather than throwing. Users mash Ctrl+Z.
- **Errors where a choice is genuinely wrong**: `jumpTo` an unknown id, or
  `redo(id)` where `id` isn't a child, throw a `RangeError`.
- **The class holds pure data and pure moves** — no printing, no files — so
  `demo.js` is a separate file that only draws the tree (recursively, project 37),
  and fourteen tests cover branching, jumping, redo-after-branch, and a 50-deep
  chain.

## Key takeaway

When a data structure forces you to delete something the user cares about, don't
argue with the user — change the structure. "Past and future" is a line, and a line
can't hold "and also, I tried it the other way". Git worked this out long ago:
commits have parents, branches are free, and nothing is lost when you change your
mind. Vim (`:undolist`) and Emacs `undo-tree` bring the same idea to editing. Your
undo stack can have it too, for about a hundred lines.
