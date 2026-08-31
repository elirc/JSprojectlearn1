# 🏋️ Practice: Ulam Spiral

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Everything here is pure logic — paste your code into the browser console (F12) on the refactored page (where `spiralPositions` and `isPrime` already exist), or copy those two functions into a scratch `.mjs` file and run it with `node`.

## Exercises

### ⭐ 1. A reusable `take` helper (warm-up)

Consuming a generator with a hand-written `.next()` loop gets old fast. Write `take(generator, k)` that pulls the first `k` values from any generator and returns them as an array. Use a `for...of` loop over the generator and `break` when you have enough — never let it run to the (infinite!) end.

What it practices: generators are iterable; a generic consumer works on *any* stream, not just the spiral.

Hint: `for (const value of generator)` pulls values one at a time; `break` stops pulling, and laziness means nothing beyond that is ever computed.

Check: `take(spiralPositions(), 12)` must have length 12, its 9th entry must be `{x:1, y:1}` and its 12th `{x:2, y:-1}`.

### ⭐⭐ 2. The inverse question: which number lives at (x, y)? (core)

The generator answers "where does number n sit?". Write `numberAt(x, y, limit = 100000)` answering the reverse: walk the spiral counting n upward until the yielded position matches, return that n, and throw an error if `limit` steps pass without a match (an infinite stream needs an escape hatch).

What it practices: a consumer that searches a lazy stream — plus defensive limits when the stream never ends.

Hint: pair a `for (let n = 1; ...)` counter with one `positions.next().value` per iteration, like `drawSpiral` does.

Check: `numberAt(0, 0)` → 1, `numberAt(1, 1)` → 9, `numberAt(2, 1)` → 10 — and the famous one: `numberAt(k, k)` must give the odd squares 9, 25, 49 for k = 1, 2, 3.

### ⭐⭐ 3. A second walk: the zigzag generator (core)

The README says generators fit any "walk a pattern" problem. Prove it: write `function* zigzagPositions(width)` that scans a grid of the given width like a typewriter that never lifts — row 0 left-to-right, row 1 right-to-left, row 2 left-to-right, forever. Yield `{x, y}` objects.

What it practices: writing your own generator from scratch — `function*`, `yield`, an infinite `while (true)`, and turning a movement rule into loop structure.

Hint: inside `while (true)`, one `for` loop per row; whether the row is reversed depends on `y % 2`.

Check: `take(zigzagPositions(3), 8)` must be (0,0), (1,0), (2,0), (2,1), (1,1), (0,1), (0,2), (1,2).

### ⭐⭐ 4. Rings, and a spiral invariant (core)

A spiral position's **ring** is how many layers out from the center it sits: `Math.max(Math.abs(x), Math.abs(y))`. Write `ringOf(position)`, then `primesInRing(r)` — how many prime numbers land in ring r. Walk the spiral with a counter n and stop as soon as `ringOf` exceeds r (the spiral never comes back inward, so it's safe to stop).

What it practices: combining the position stream with `isPrime` — two independent parts answering a question neither could alone.

Hint: ring r is entered right after number (2r−1)² and ends exactly at (2r+1)² — you can use that as a bonus sanity check.

Check: `primesInRing(1)` through `primesInRing(5)` must be 4, 5, 6, 7, 8. (Ring 1 holds numbers 2–9, whose primes are 2, 3, 5, 7 — count them yourself.)

### ⭐⭐⭐ 5. A generator that filters a generator (challenge)

Write `function* primePositions()` that consumes `spiralPositions()` internally and yields only the primes, as `{n, position}` objects. The consumer should be able to say `take(primePositions(), 100)` and get the first 100 primes with their spiral homes — no `isPrime` call in sight.

What it practices: stream composition — stacking a lazy filter on a lazy source, the pattern behind every data-pipeline library.

Hint: `for (const position of spiralPositions())` inside your generator, with your own n counter alongside; `yield` only when `isPrime(n)`.

Check: the first four yields must be `2@(1,0)`, `3@(1,-1)`, `5@(-1,-1)`, `7@(-1,1)`, and the 25th must be `{n: 97, position: {x:-1, y:-5}}`.

## Solutions

### 1. `take`

```js
function take(generator, k) {
  const values = [];
  for (const value of generator) {
    values.push(value);
    if (values.length === k) break;
  }
  return values;
}
take(spiralPositions(), 12); // 12 positions; [8] is {x:1,y:1}, [11] is {x:2,y:-1}
```

WHY: generators are iterable, so `for...of` drives `.next()` for you. The `break` is the whole point of laziness — the spiral is infinite, but only 12 positions ever get computed. This helper now works on *any* generator you'll ever write (including exercises 3 and 5), which is what "the consumer decides what the stream means" buys you.

### 2. `numberAt`

```js
function numberAt(targetX, targetY, limit = 100000) {
  const positions = spiralPositions();
  for (let n = 1; n <= limit; n++) {
    const { x, y } = positions.next().value;
    if (x === targetX && y === targetY) return n;
  }
  throw new Error(`(${targetX}, ${targetY}) not reached within ${limit} steps`);
}
[numberAt(0, 0), numberAt(1, 1), numberAt(2, 1)]; // [1, 9, 10]
[1, 2, 3].map((k) => numberAt(k, k));             // [9, 25, 49] — odd squares!
```

WHY: same consumer shape as `drawSpiral` — one position per n — but asking a different question, with zero changes to the generator. The `limit` throw matters: searching an infinite stream for a position it might never revisit needs a loud escape, not a frozen tab. The odd squares landing on the diagonal is the spiral's geometry made checkable.

### 3. `zigzagPositions`

```js
function* zigzagPositions(width) {
  let y = 0;
  while (true) {
    const leftToRight = y % 2 === 0;
    for (let i = 0; i < width; i++) {
      const x = leftToRight ? i : width - 1 - i;
      yield { x, y };
    }
    y++;
  }
}
take(zigzagPositions(3), 8);
// (0,0) (1,0) (2,0) (2,1) (1,1) (0,1) (0,2) (1,2)
```

WHY: the movement rule ("alternate direction each row") became visible loop structure, just like the spiral's `for (const _ of [0, 1])` made two-legs-per-length visible. Swap this into `drawSpiral` in place of `spiralPositions()` and primes render in reading order — the renderer never knew which walk it was pairing dots with. That interchangeability is the payoff of separating "where things go" from "what to draw".

### 4. `ringOf` and `primesInRing`

```js
const ringOf = ({ x, y }) => Math.max(Math.abs(x), Math.abs(y));

function primesInRing(ring) {
  const positions = spiralPositions();
  let count = 0;
  for (let n = 1; ; n++) {
    const r = ringOf(positions.next().value);
    if (r > ring) return count;             // spiral only moves outward
    if (r === ring && isPrime(n)) count++;
  }
}
[1, 2, 3, 4, 5].map(primesInRing); // [4, 5, 6, 7, 8]
```

WHY: the spiral stream and `isPrime` were written knowing nothing about each other, yet a five-line consumer combines them into a statistics tool. The early `return` leans on a *property* of the stream (rings never decrease) — reasoning you can only do because the walk is one honest function, not seven tangled counters.

### 5. `primePositions`

```js
function* primePositions() {
  let n = 0;
  for (const position of spiralPositions()) {
    n++;
    if (isPrime(n)) yield { n, position };
  }
}
take(primePositions(), 4).map((e) => `${e.n}@(${e.position.x},${e.position.y})`);
// ['2@(1,0)', '3@(1,-1)', '5@(-1,-1)', '7@(-1,1)']
take(primePositions(), 25)[24]; // { n: 97, position: { x: -1, y: -5 } }
```

WHY: a generator consuming a generator — the filter is itself lazy, so `take(primePositions(), 4)` walks only the first 7 spiral cells and tests only 7 numbers. This is stream composition: source → filter → consumer, each piece pure and swappable, the same architecture the README promises ("pair the same stream with letters, colors, or game tiles") now with the pairing itself packaged as a reusable stream.
