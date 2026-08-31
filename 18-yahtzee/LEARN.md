# 📘 Learning Guide: Yahtzee Scoring

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A **scoring calculator** for the dice game Yahtzee. Not the whole game — no rolling, no turns — just the one question at its heart: *given five dice, what does a category score?*

Quick rules refresher (all you need): you roll five six-sided dice, then pick a category to score them in. Categories include:

- **ones** through **sixes**: add up only the dice showing that face. `[1,1,3,4,1]` scored as "ones" = 3.
- **three/four of a kind**: if some face appears at least 3 (or 4) times, score the sum of ALL five dice; otherwise 0.
- **full house** (three of one face + two of another): flat 25 points.
- **small straight** (four consecutive faces, like 2-3-4-5): 30. **large straight** (five consecutive): 40.
- **yahtzee** (all five the same): 50.
- **chance**: sum of all dice, always.

Run it in a terminal with Node:

```
node 18-yahtzee/original.js
```

prints `25`, `30`, `50`, and then a suspicious `0` — that last one is the bug this project is about. The refactored version is a library (`scoring.js`) plus a test file you run with `node --test 18-yahtzee/`.

## 2. Concepts you need first

### Running JavaScript with Node
**Node.js** runs `.js` files in your terminal: `node file.js`. `console.log(x)` prints x. No browser involved anywhere in this project.

### Arrays and loops
The five dice arrive as an array: `[3, 3, 3, 2, 2]`. The old-style loop visits each item by index; the modern `for...of` visits items directly:

```js
const dice = [3, 3, 5];
for (const die of dice) console.log(die); // 3, 3, 5
```

### Counting with a tally array
"How many of each face?" is *the* central question of Yahtzee. The standard trick: an array where index i holds the count of face i.

```js
const dice = [3, 3, 5, 1, 3];
const tally = [0, 0, 0, 0, 0, 0, 0]; // index 0 unused; indexes 1-6 = faces
for (const die of dice) tally[die]++;
console.log(tally[3]); // 3 — three threes
console.log(tally[5]); // 1
```

Once you have the tally, most rules become one question about it.

### `reduce`: boil an array down to one value
```js
const total = [1, 2, 3].reduce((acc, n) => acc + n, 0);
console.log(total); // 6 — start at 0, add each item
```

`acc` (the accumulator) carries the running result. `reduce(..., 0)` starting at 0 with `+` is just "sum".

### `some`, `every`, `includes`
```js
[0, 2, 5].some((n) => n >= 4);  // true — at least one is >= 4
[1, 2, 3].every((n) => n > 0);  // true — all pass
[0, 3, 2].includes(3);          // true — the value 3 is in there
```

### `Set`: a bag of unique values
A **Set** keeps each value once and answers "is this in here?" fast:

```js
const faces = new Set([2, 3, 3, 4, 5]);
console.log(faces.has(3)); // true
console.log(faces.has(6)); // false
```

Perfect for straights, where duplicates don't matter — only *which* faces appeared.

### Functions that return functions (function factories)
A function can build and return another function. The returned function remembers the arguments it was built with (this remembering is called a **closure**):

```js
const multiplyBy = (n) => (x) => x * n;
const double = multiplyBy(2);
console.log(double(10)); // 20
console.log(multiplyBy(3)(10)); // 30
```

Read `(n) => (x) => x * n` as: "give me n, and I'll give you back a function of x." Why care? Because "three of a kind" and "four of a kind" are the *same rule* with a different n — one factory, two products.

### Objects as lookup tables
An object can map names to functions:

```js
const rules = { double: (x) => x * 2, negate: (x) => -x };
console.log(rules["double"](5)); // 10
console.log(Object.keys(rules)); // ["double", "negate"]
```

Looking up a missing name gives `undefined` — which you can detect and turn into a proper error.

### Throwing errors
`throw new Error("message")` makes the program stop loudly instead of continuing with a wrong value. `RangeError` is a flavor of Error meaning "a value was out of its allowed range." Loud failure beats quiet wrongness — that's the moral of this whole project.

### Pure functions
A **pure function** returns a result computed only from its inputs — no globals, no printing, no changing anything. `score([1,1,1,2,2], "fullHouse")` always returns 25, forever. Pure functions are trivially testable: call, compare, done.

### Tests with `node:test`
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
test('full house scores 25', () => {
  assert.equal(score([3,3,3,2,2], 'fullHouse'), 25);
});
```

`node --test 18-yahtzee/` runs every `*.test.js` file and reports pass/fail. `assert.throws(fn, pattern)` passes only if fn throws an error matching the pattern. **TDD** (test-driven development) is the workflow of writing the failing test *first*, then the code that makes it pass.

## 3. Walking through the original code

One function, `score(dice, category)`, with nine `else if` arms.

**The upper section (ones..sixes).**

```js
if (category == "ones") target = 1;
if (category == "twos") target = 2;
...
var total = 0;
for (var i = 0; i < dice.length; i++) {
  if (dice[i] == target) total += dice[i];
}
```

First an if-ladder translates the category *name* into a target *number* (pure duplication — six lines saying "the word means the number"). Then it sums the dice matching the target.

**Three of a kind.**

```js
for (var v = 1; v <= 6; v++) {
  var count = 0;
  for (var i = 0; i < dice.length; i++) {
    if (dice[i] == v) count++;
  }
  if (count >= 3) { ...sum all dice, return... }
}
```

For each face 1–6, count how many dice show it; if any count reaches 3, return the sum of all five dice. Now look at **fourOfAKind**: the *exact same* counting loop, with `>= 4`. And **fullHouse**: same loop again, collecting `hasThree`/`hasTwo`. And **yahtzee**: same loop, `count == 5`. The comment in the code says it plainly: "this exact counting loop appears 4 more times."

**Straights.**

```js
var has = {};
for (var i = 0; i < dice.length; i++) has[dice[i]] = true;
if ((has[1] && has[2] && has[3] && has[4]) ||
    (has[2] && has[3] && has[4] && has[5]) ||
    (has[3] && has[4] && has[5] && has[6])) return 30;
```

Build a "which faces exist" object, then check each possible straight *by hand* — every combination typed out. Large straight repeats the pattern with two longer chains.

**The last line.**

```js
return 0; // unknown category? silently zero. (typo = quiet wrong answer)
```

Any category name that matches no arm falls through to 0. The demo at the bottom shows the sting: `score([5,5,5,5,5], "fullHous")` — note the missing `e` — prints `0` with no error.

## 4. What's wrong with it (in beginner terms)

**1. The same counting loop, five times.** Copy-paste feels fast, but each copy is a separate thing to get right and keep right. Story: you decide to support a six-dice house variant. You update the counting loop in threeOfAKind and fourOfAKind... and miss the one inside yahtzee. Now yahtzee silently never triggers with six dice, and nothing tells you. When one *idea* ("count the faces") lives in five *places*, the places drift apart.

**2. Typos score zero, silently.** `"fullHous"` returns 0 — a perfectly legal-looking score. Imagine this inside a real game app: a player rolls a full house, the UI (with the typo in its code) awards 0, and they just... lose 25 points. No crash, no log, no clue. They might file a bug report saying "scoring feels wrong sometimes." You'd search for days. A thrown error at the moment of the typo would have named the problem instantly. Rule of thumb: **an impossible input should be loud, not zero.**

**3. Nothing is testable in isolation.** Want to verify just the full-house rule? You can't call it — it's paragraph five of a 90-line function. Your only interface is the whole `score`, and your only safety net is eyeballing four `console.log` lines.

**4. Hand-enumerated combinations.** The straights spell out `1234`, `2345`, `3456` character by character. It works — but "four consecutive faces starting anywhere" is a *pattern*, and patterns written out by hand grow bugs when the pattern changes (different run length, different dice).

## 5. Try it yourself first!

1. Vague: almost every category asks the same question. What is it? Write *one* helper that answers it.
2. That helper: `counts(dice)` returning `[_, c1, c2, c3, c4, c5, c6]` — the tally array from section 2. Now rewrite fullHouse using only the tally. (It's one line: does the tally contain a 3 and a 2?)
3. Notice threeOfAKind and fourOfAKind differ by a single number. Write a factory: `ofAKind(n)` returns a function of dice. Same for straights: `straight(runLength, points)` — loop over possible starting faces instead of typing out combinations.
4. Put every category function into one object: `CATEGORIES = { ones: ..., fullHouse: ..., ... }`. Then `score(dice, category)` is: look up, and if the lookup finds nothing — **throw**, listing the valid names.
5. Also validate the dice themselves (exactly five, each 1–6) once, at the entrance.
6. Now write the rulebook as data: a list of `[dice, category, expected]` rows, and a tiny loop that turns each row into a test. Include the trick cases: is `[5,5,5,5,5]` a full house? Does a large straight also count as a small one?

## 6. Understanding the refactored solution

**`counts(dice)` — the one true counting function.** The tally-array trick, written once. The docstring shows its contract: `counts([3,3,5,1,3])[3] === 3`. Nearly every category is now a question about this array.

**`sum`** is a one-line reduce.

**Two function factories.**

```js
const ofAKind = (n) => (dice) =>
  counts(dice).some((count) => count >= n) ? sum(dice) : 0;
```

`ofAKind(3)` *is* the three-of-a-kind rule; `ofAKind(4)` is four-of-a-kind. One implementation, configured twice — the factory turned "which n?" from copy-pasted code into a parameter. Likewise `straight(run, score)` builds the straight-checkers: it puts the faces in a `Set`, then for each possible starting face builds the needed run (`Array.from({length: run}, (_, i) => start + i)` makes `[start, start+1, ...]`) and asks `every(face => faces.has(face))`. The original's hand-typed `1234/2345/3456` became a loop over start positions — the pattern, expressed as a pattern.

`upperSection(face)` kills the name-to-number if-ladder: the tally already knows how many, so the score is `counts(dice)[face] * face`.

**The `CATEGORIES` table.** Every rule is one entry:

```js
threeOfAKind: ofAKind(3),
fourOfAKind: ofAKind(4),
smallStraight: straight(4, 30),
largeStraight: straight(5, 40),
chance: sum,
```

The table *reads like the rulebook*. Full house is now literally `perFace.includes(3) && perFace.includes(2)` — and notice that automatically gets the trap right: five of a kind has a tally of 5, not 3-and-2, so it's correctly *not* a full house.

**`score` — one guarded entrance.** Two checks at the boundary: the dice must be five integers 1–6 (else `RangeError`), and the category must exist in the table (else an Error listing every valid name). Because the entrance validates, every category function inside gets to *trust* its input — no repeated defensive checks. The typo bug is dead: `"fullHous"` now throws `Unknown category "fullHous". Known: ones, twos, ...` — you'd fix it in seconds.

**The test file — an executable rulebook.** The heart is a data table:

```js
const CASES = [
  [[3, 3, 3, 2, 5], 'threeOfAKind', 16], // sum of ALL dice
  [[5, 5, 5, 5, 5], 'fullHouse', 0],     // 5+0 is not a full house
  [[1, 2, 3, 4, 5], 'smallStraight', 30], // a large straight contains a small one
  ...
];
for (const [dice, category, expected] of CASES) {
  test(`${category} of [${dice}] scores ${expected}`, () => {
    assert.equal(score(dice, category), expected);
  });
}
```

This is **table-driven testing**: each rule-fact is a row, and one three-line loop turns rows into tests. Adding a rule example costs one line. The rows deliberately include the traps a human scorer argues about at game night: three-of-a-kind sums *all* dice (16, not 9); `[4,4,4,4,4]` counts as four-of-a-kind; 4+1 is not a full house.

Below the table are three broader tests: a mini **property test** feeding 20 random rolls to every category and asserting the result is always a non-negative integer (never `NaN` or `undefined`); a check that the typo *throws*; and a check that bad dice (four dice, or a face of 7) throw `RangeError`. Tests don't just check right answers — they pin down how the code *fails*.

The README calls this the TDD sweet spot: pure functions + rules-as-list means each rulebook sentence becomes a failing test, then a one-line function, then a green checkmark.

## 7. Words you learned (glossary)

- **Category**: a named Yahtzee scoring rule (ones, fullHouse, chance...).
- **Tally / counts array**: array where index i stores how many times i appeared.
- **`for...of`**: loop over an array's values directly.
- **`reduce`**: collapse an array to one value with an accumulator.
- **Accumulator**: the running result inside a reduce.
- **`some` / `every` / `includes`**: any item passes / all pass / value is present.
- **Set**: a collection of unique values with fast `.has()` lookup.
- **Function factory**: a function that builds and returns another function.
- **Closure**: the returned function's memory of the variables it was built with.
- **Lookup table**: an object mapping names to values (here, category → function).
- **Pure function**: output depends only on inputs; no side effects.
- **Guard / validation at the boundary**: check inputs once at the entrance so inner code can trust them.
- **`throw` / `Error` / `RangeError`**: fail loudly; RangeError = value out of allowed range.
- **Silent failure**: returning a plausible-but-wrong value instead of erroring — the worst kind of bug.
- **Table-driven tests**: tests generated from a data table of cases.
- **Property test**: asserting a rule holds for many random inputs, not one example.
- **TDD**: test-driven development — write the failing test first, then the code.
- **`Object.keys`**: array of an object's property names.
- **`Array.isArray` / `Number.isInteger`**: type checks used in validation.

## 8. Experiments to try on the plane (no internet needed)

1. **Feel the typo protection**: run `node 18-yahtzee/original.js` and note the silent `0`. Then create a tiny file that imports the refactored version and calls `score([5,5,5,5,5], 'fullHous')`, and run it with node. Expected: an error naming the typo *and* listing every valid category.
2. **Add a real Yahtzee rule — "two pairs" (house variant, 15 points)**: in `scoring.js` add `twoPairs: (dice) => counts(dice).filter((c) => c >= 2).length >= 2 ? 15 : 0,` to the table, then add rows to `CASES` like `[[2,2,5,5,1], 'twoPairs', 15]` and `[[2,2,2,5,1], 'twoPairs', 0]`... wait — should `[2,2,2,2,1]` count (one face twice-twice)? Decide, write the row for your ruling, and make the code match. Expected: you just experienced requirements-as-tests.
3. **Break a trap on purpose**: change fullHouse to `perFace.includes(3) && sum(dice) > 0 ? 25 : 0`, run `node --test 18-yahtzee/`. Expected: the `[3,3,3,3,2]` and `[5,5,5,5,5]` rows fail immediately, each naming its dice. Restore the real rule.
4. **One-line rule via factory**: add `pair: ofAKind(2)` to the table (scores sum of all dice if any pair exists). Expected: it works with zero new logic — that's what factories buy. Add a CASES row to prove it.
5. **Trace `straight(4, 30)` by hand** for dice `[2, 3, 4, 5, 5]`: write the Set, then walk start = 1, 2, 3 and decide where it returns 30. Then confirm your trace by adding a temporary `console.log(start)` inside the loop and running the tests.
