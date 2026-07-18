# 22 — Ulam spiral

**Lesson: generators separate "where things go" from "what to draw" — coordinate math
as a standalone, reusable stream.**

## Run it

Open `original.html` and `refactored/index.html` in a browser. Same eerie diagonal
streaks of primes (mathematicians still don't fully know why — enjoy that).

## What's wrong with the original?

1. **Seven mutable variables tangled in one loop.** `x, y, px, py, dir, steps,
   stepsDone, legs` — grid position and pixel position tracked *in parallel* (four
   update sites that must never disagree), plus three counters of spiral bookkeeping.
   Miss one `px += 4` and the picture silently drifts off-grid.
2. **Three unrelated jobs interleaved**: walking a spiral, testing primality, and
   painting pixels — all in the same loop body. You can't check the spiral logic
   without also running the prime logic and reading pixels off a canvas. "Look at the
   picture and squint" is the only test.
3. **The prime check is `for (i = 2; i < n; i++)`** — the exact slow loop project 08
   replaced. At n=10000 that's ~50M operations; bump the count and the tab freezes.
4. **Why do spiral legs come in pairs?** The code encodes it (`legs % 2 == 0`) but
   nothing explains it. Structure that can't explain itself needs to be reshaped until
   it can.

## What changed in the refactor

- **`spiralPositions()` is a generator** — `function*` with `yield`. It produces the
  infinite stream of grid positions and *does nothing else*: no pixels, no primes.
  Generators are lazy — positions are computed one `next()` at a time, so "infinite"
  is fine. This is the tool for any "walk a pattern" problem: spirals, zigzags, board
  traversals. The consumer decides what each position *means*.
- **The two-legs-per-length rule became visible structure**: `for (const _ of [0, 1])`
  wrapping the leg walk, with a comment giving the sequence (`1, 1, 2, 2, 3, 3...`).
  Compare the original's three-counter dance encoding the same fact invisibly.
- **Grid→pixel conversion happens in exactly one place** (`center + x * cellSize`,
  inside `drawSpiral`), killing the parallel-tracking hazard entirely. The spiral
  yields *grid* coordinates; only the renderer knows pixels exist.
- **`isPrime` uses the sqrt bound** from project 08 — lessons compound.
- `CONFIG` up top: cell size, dot size, count — the tunable surface, labeled.

## Key takeaway

"Generate positions" and "decide what appears at each position" are separate concerns
in every grid/spiral/path program. Give the position stream its own function — a
generator, if the stream has interesting shape — and both halves become simple, and
the position math becomes reusable for the next visualization.
