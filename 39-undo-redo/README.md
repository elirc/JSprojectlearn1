# 39 — Undo/redo

**Lesson: pick a data shape whose *structure* enforces the invariant, instead of a
clever shape plus rules everyone must remember.**

## Run it

```
node 39-undo-redo/original.js
node --test 39-undo-redo/
```

## What's wrong with the original?

Run it to the end: after undoing and typing something new, **redo resurrects the
abandoned timeline** ("Hello world" comes back from the dead). Every user hits this
sequence within ten seconds of meeting your editor, and undo they can't trust is
worse than no undo.

The array-with-pointer design isn't *wrong* — professional editors use it — but it
comes with an invariant ("everything after `pointer` is redoable future, so a new
action must truncate it") that lives **nowhere in the code**. `type()` just pushes.
The design's correctness depended on a rule the author had to remember, and didn't.

There's also a smaller smell: two module-level variables that every function
mutates, with no boundary around them (project 29's disease).

## What changed in the refactor

- **Three named containers instead of one array + pointer:** `#past`, `#present`,
  `#future`. Same information, but now the invariant is *visible in the shape* —
  and the crucial rule became one unmissable line: `push()` ends with
  `this.#future = []`. You can't forget a line that's already written; the original's
  bug required remembering to write it. **When a design needs a rule, prefer the
  representation where the rule is one obvious line over the one where it's implied.**
- **Encapsulated (project 29):** the stacks are `#private`; the only doors are
  `push`/`undo`/`redo`, plus `canUndo`/`canRedo` getters that exist precisely so a
  UI can enable/disable its buttons without reaching inside.
- **Boundary calls are safe no-ops** — undo at the start returns the present rather
  than throwing, a deliberate, documented choice (users mash Ctrl+Z; that's not an
  exceptional condition).
- **It stores snapshots, which is why immutability mattered all along**: snapshot
  history only works if old states can't be mutated afterwards. Project 17's
  "`step` returns a new state" style means *any* app state can be handed to this
  class as-is — the last test does it with an object.

## Key takeaway

"Past / present / future" beats "array + pointer + discipline". When you catch
yourself writing a comment like "NOTE: callers must remember to...", stop — reshape
the data so the rule enforces itself.
