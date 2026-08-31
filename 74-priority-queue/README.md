# 74 — Priority queue

**Lesson: don't re-derive the whole answer to insert one item — a heap keeps a
weaker promise than "sorted", and that weakness is exactly what makes it fast.**

## Run it

```
node 74-priority-queue/original.js
node 74-priority-queue/refactored/cli.js
node --test 74-priority-queue/refactored/heap.test.js
```

## What's wrong with the original?

A scheduler that always runs the most urgent task next. It works — and it has all
three of this repo's recurring diseases at once:

1. **A naive algorithm with a bill attached.** Every `addTask` re-sorts the entire
   array. Sorting is O(n log n), and doing it n times costs O(n² log n): adding
   3,000 tasks takes **over three seconds** on this machine. Nothing was ever
   out of order except the one item you just pushed.
2. **The ordering rule is written twice, and the copies already disagree.**
   `addTask` breaks priority ties by arrival order; `showNextTask` breaks them
   newest-first. Run it: the preview promises `send-otp`, the queue runs
   `charge-card`. Neither comparator is labelled as the intended one, so there is
   no way to tell which is the bug.
3. **Logic welded to I/O.** Adding a task prints. Running a task prints. You cannot
   ask "what runs next?" without producing terminal output, which means you cannot
   test the scheduling rules, reuse them in a UI, or write them to a log instead.

## What changed in the refactor

- **`BinaryHeap` — one flat array pretending to be a tree.** The parent of index
  `i` is `(i - 1) >> 1`, its children are `2i + 1` and `2i + 2`; no node objects,
  no pointers. Its only promise is "every parent beats its children" — much weaker
  than sorted, and cheap to restore: a push climbs one path to the root, a pop
  sinks one path down, both **O(log n)**. The full sort *re-derived every
  position*; the heap fixes the one path that could possibly be wrong.
- **The comparator is injected**, so `heap.js` knows nothing about tasks or
  priorities. Passing `(a, b) => b - a` turns the same class into a max-heap
  without a line of new code — the same "decisions are data" move as project 70's
  precedence table.
- **`byUrgency` is one exported function.** The tie-break rule exists in exactly
  one place, so `peek()` and `next()` *cannot* disagree — the original's headline
  bug is now unrepresentable rather than merely fixed.
- **The scheduler returns values; `cli.js` does the printing.** `drain()` hands
  back the run order as an array, so a test can assert on it and a dashboard can
  render it.

## Key takeaway

When you find yourself sorting inside a loop, ask what you actually need. "Give me
the smallest one" is a far weaker request than "put everything in order" — and
weaker requests have cheaper answers. Choosing the smallest structure that still
answers your question is most of what algorithm design is.
