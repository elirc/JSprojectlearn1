# 🏋️ Practice: Towers of Hanoi

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Test the untested function (warm-up)
`describeMove` has no test at all — check `hanoi.test.js` if you don't believe it. Add one asserting `describeMove({ disc: 2, from: 'A', to: 'B' })` returns exactly `'Move disc 2 from A to B'`.
What it practices: noticing coverage gaps; even a one-line formatter deserves one pin.
Hint: import `describeMove` next to `solveHanoi` at the top of the test file.

### ⭐⭐ 2. Count without solving
Write `countMoves(discs)` that returns how many moves `discs` discs need — **without** calling `solveHanoi` — using the `2^n − 1` formula. Give it the same `RangeError` guard as the solver. Test that it agrees with `solveHanoi(n).length` for n = 0 through 10, and that `countMoves(-1)` throws.
What it practices: deriving an answer versus generating it, and keeping two paths to the same fact honest with an agreement test.
Hint: `2 ** discs - 1`. Note `countMoves(0)` must be 0 — does the formula handle it, or do you need a special case? (Try it.)

### ⭐⭐ 3. How busy is each disc?
Write `moveTally(moves)` that takes a move array and returns how many times each disc moved, as an object. Expected: `moveTally(solveHanoi(4))` gives `{ 1: 8, 2: 4, 3: 2, 4: 1 }` — the smallest disc does half of ALL the work, and each bigger disc does half as much again.
What it practices: deriving statistics from returned data — impossible with the printing original; the accumulator-object pattern.
Hint: destructure `{ disc }` in the loop; `tally[disc] = (tally[disc] ?? 0) + 1` handles the first time a disc appears.

### ⭐⭐ 4. A reusable legality checker
The replay test contains gold: logic that verifies a move list is legal. Extract it into an exported function `isLegalSolution(moves, discs)` that returns `true`/`false` (no asserts inside). Tests: `isLegalSolution(solveHanoi(4), 4)` is `true`; the same list *reversed* is `false`; the first 5 moves alone are `false` (legal so far, but the puzzle isn't finished).
What it practices: promoting test-only logic into a real, reusable verifier — and the difference between "throws on failure" and "returns a verdict".
Hint: everywhere the test says `assert.…`, you say `return false`. At the end, what single check says "solved"?

### ⭐⭐⭐ 5. Freeze-frame the puzzle
Write `pegStatesAfter(discs, k)`: solve for `discs`, replay only the first `k` moves, and return the pegs object. Expected: `pegStatesAfter(3, 4)` gives `{ A: [], B: [2, 1], C: [3] }` — after move 4 the big disc just landed on C while discs 1 and 2 wait on B. Also: `k = 0` gives the starting position, `k = 7` gives `{ A: [], B: [], C: [3, 2, 1] }`.
What it practices: the moves-as-data payoff the README promises — this function is one `slice` away from an animation frame renderer.
Hint: `solveHanoi(discs).slice(0, k)` is the partial move list; replay it exactly like the test does with `push`/`pop`.

### ⭐⭐⭐ 6. Run the film backwards
Write `invertMoves(moves)`: reverse the list AND swap each move's `from`/`to`. Physically, that's undoing the solution step by step — which is itself a perfect solution from C back to A! Test the beautiful consequence: `invertMoves(solveHanoi(n))` deep-equals `solveHanoi(n, 'C', 'A', 'B')` for n = 1 through 6.
What it practices: transforming move data wholesale, non-destructive array handling, and testing a symmetry property instead of examples.
Hint: `[...moves].reverse()` (copy first — `.reverse()` mutates!), then `.map()` a new object per move. If the deep-equal fails, check whether you swapped `from`/`to` *and* reversed, not just one of the two.

## Solutions

### 1. describeMove test
```js
import { solveHanoi, describeMove } from './hanoi.js';

test('describeMove formats one move as a sentence', () => {
  assert.equal(describeMove({ disc: 2, from: 'A', to: 'B' }), 'Move disc 2 from A to B');
});
```
WHY: `describeMove` was split out of the solver precisely because wording is a separate job — but a function nobody tests is a function nobody notices breaking. One assert pins the exact format, so a future "helpful" rewording fails loudly instead of silently changing the CLI output.

### 2. countMoves
```js
export function countMoves(discs) {
  if (!Number.isInteger(discs) || discs < 0) {
    throw new RangeError(`discs must be a non-negative integer, got ${discs}`);
  }
  return 2 ** discs - 1;
}

test('countMoves agrees with the real solver', () => {
  for (let n = 0; n <= 10; n++) {
    assert.equal(countMoves(n), solveHanoi(n).length);
  }
  assert.throws(() => countMoves(-1), RangeError);
});
```
WHY: `2 ** 0 - 1` is 0, so the empty base case falls out of the formula just like it fell out of the recursion — no special case, same lesson as "the base case is 0, not 1". The agreement loop is the key move: whenever two independent paths compute one fact, test them against each other and neither can drift alone. Copying the solver's guard keeps the two functions interchangeable at the boundary too.

### 3. moveTally
```js
export function moveTally(moves) {
  const tally = {};
  for (const { disc } of moves) {
    tally[disc] = (tally[disc] ?? 0) + 1;
  }
  return tally;
}
// moveTally(solveHanoi(4)) → { 1: 8, 2: 4, 3: 2, 4: 1 }
```
WHY: disc `k` of `n` moves exactly `2^(n−k)` times — a fact you can only *compute* because the solver returns data instead of spraying text at a console. The `?? 0` idiom replaces an `if (first time) set to 0` branch, and the whole function is pure: feed it any move list, get a report, no globals anywhere — the exact opposite of `moveCount`.

### 4. isLegalSolution
```js
export function isLegalSolution(moves, discs) {
  const pegs = { A: [], B: [], C: [] };
  for (let d = discs; d >= 1; d--) pegs.A.push(d);

  for (const { disc, from, to } of moves) {
    if (pegs[from].at(-1) !== disc) return false;        // must move a top disc
    const destTop = pegs[to].at(-1);
    if (destTop !== undefined && destTop < disc) return false; // never big on small
    pegs[to].push(pegs[from].pop());
  }
  return pegs.C.length === discs; // all discs home = solved
}

test('isLegalSolution accepts real solutions and rejects fakes', () => {
  assert.equal(isLegalSolution(solveHanoi(4), 4), true);
  assert.equal(isLegalSolution([...solveHanoi(4)].reverse(), 4), false);
  assert.equal(isLegalSolution(solveHanoi(4).slice(0, 5), 4), false);
});
```
WHY: the replay test verified one solution; this verifier can vet *any* move list — a student's hand-written attempt, an animation input, exercise 6's inverted list. Returning a verdict instead of asserting makes it a library function rather than test furniture. The final `pegs.C.length === discs` matters: the truncated-list case is legal at every step yet still not a solution — "no rule broken" and "puzzle solved" are different claims.

### 5. pegStatesAfter
```js
export function pegStatesAfter(discs, k) {
  const pegs = { A: [], B: [], C: [] };
  for (let d = discs; d >= 1; d--) pegs.A.push(d);

  for (const { from, to } of solveHanoi(discs).slice(0, k)) {
    pegs[to].push(pegs[from].pop());
  }
  return pegs;
}
// pegStatesAfter(3, 4) → { A: [], B: [2, 1], C: [3] }
// pegStatesAfter(3, 0) → { A: [3, 2, 1], B: [], C: [] }
// pegStatesAfter(3, 7) → { A: [], B: [], C: [3, 2, 1] }
```
WHY: this is the README's "want to animate the solution?" made real — frame `k` of an animation is exactly this function's return value. It exists only because `solveHanoi` returns data; the printing original spent the answer as ink and could never be paused mid-solve. Note it trusts the solver's moves (no legality checks) — verification is exercise 4's job, one job per function.

### 6. invertMoves
```js
export function invertMoves(moves) {
  return [...moves]
    .reverse()
    .map(({ disc, from, to }) => ({ disc, from: to, to: from }));
}

test('the reversed solution solves the puzzle backwards', () => {
  for (let n = 1; n <= 6; n++) {
    assert.deepEqual(invertMoves(solveHanoi(n)), solveHanoi(n, 'C', 'A', 'B'));
  }
});
```
WHY: undoing "move disc d from X to Y" is "move disc d from Y to X", and undoing a whole sequence means undoing the last move first — hence reverse-and-swap. The test asserts a deep symmetry: the optimal solution is unique, so the un-done A→C solution must be *identical* to the freshly computed C→A one — and it can only be stated because pegs are ordinary parameters (`'C', 'A', 'B'`), the "solver never cared what pegs are called" design. `[...moves]` guards against `.reverse()` mutating the caller's array: pure functions don't scribble on their inputs.
