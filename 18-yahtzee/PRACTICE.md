# 🏋️ Practice: Yahtzee Scoring

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

**Setup:** exercise 1 adds rows to `refactored/scoring.test.js`. For the rest, create two new files in `refactored/`: `sheet.js` (your new functions, importing from `./scoring.js`) and `sheet.test.js` (their tests). `node --test 18-yahtzee/` runs everything.

## Exercises

### ⭐ 1. Three facts the rulebook forgot (warm-up)
The `CASES` table is good but not complete. Add three rows for facts it never checks: a yahtzee roll `[2,2,2,2,2]` scored as `threeOfAKind` (it has five-of-a-kind, so it qualifies — but what's the score?), `[1,3,4,5,6]` as `smallStraight` (there's a gap at 2 — does a straight hide elsewhere?), and `[6,6,6,6,6]` as `chance`. Work out each expected value by hand first, then run the tests. To see the safety net work, temporarily change one expected value to something wrong and watch the failure name the exact dice.
What it practices: reading rules carefully and extending a table-driven test suite — one fact, one row.
Hint: `threeOfAKind` scores the sum of ALL dice; `[1,3,4,5,6]` contains the run 3-4-5-6.

### ⭐⭐ 2. The upper-section bonus (core)
Real Yahtzee gives a 35-point bonus when your six upper-section scores (ones through sixes) total 63 or more. Write `upperBonus(upperScores)` in `sheet.js`: it takes an object like `{ ones: 3, twos: 6, ... }` and returns 35 or 0. Tests: `{ones:3, twos:6, threes:9, fours:12, fives:15, sixes:18}` totals exactly 63 → 35, and the same object with `ones: 2` → 0.
What it practices: `Object.values` + `reduce`, and encoding a boundary rule ("63 or more") with a test sitting exactly on the boundary.
Hint: `Object.values(upperScores).reduce((sum, n) => sum + n, 0)`.

### ⭐⭐ 3. Which category should I pick? (core)
Write `bestCategory(dice)` returning `{ name, points }` for the highest-scoring category, walking the whole `CATEGORIES` table (ties go to whichever comes first in the table). Tests: `[1,2,3,4,5]` → `largeStraight` 40; `[5,5,5,5,5]` → `yahtzee` 50 (beating fourOfAKind's 25); `[3,3,3,2,2]` → `fullHouse` 25; `[1,1,2,3,5]` → `chance` 12.
What it practices: iterating a registry of rules with `Object.keys`/`Object.entries` — the payoff of rules living in a table instead of a switch.
Hint: loop over `Object.keys(CATEGORIES)` and call `score(dice, name)` for each; keep the best with a strict `>` so earlier entries win ties.

### ⭐⭐ 4. A property the rules must obey (core)
Here's a fact that holds for *every possible roll*: if `fourOfAKind` scores more than 0, then `threeOfAKind` scores exactly the same (four of a kind is automatically three of a kind, and both sum all dice) — and `chance` is always ≥ either of them. Write one test that rolls 200 random hands and asserts both facts. It should pass as-is; then prove it has teeth by temporarily changing `ofAKind`'s `count >= n` to `count === n` and watching it fail (a roll like `[4,4,4,4,2]` then scores 18 as fourOfAKind but 0 as threeOfAKind).
What it practices: property testing — asserting relationships between rules instead of single examples, like the suite's random-rolls test.
Hint: `Array.from({ length: 5 }, () => 1 + Math.floor(Math.random() * 6))` makes a roll. Put the dice in the assert message so failures name the roll.

### ⭐⭐⭐ 5. Score a whole game sheet (challenge)
Write `scoreSheet(sheet)`: it takes an object mapping *all 13* category names to dice rolls and returns `{ upper, bonus, lower, total }`, where `bonus` uses exercise 2's rule. A sheet missing any category must throw an error listing the missing names (a typo'd category name already throws — you inherit that from `score`). Test with a full sheet you compute by hand; for the one in the hint the answer is `{ upper: 63, bonus: 35, lower: 195, total: 293 }`.
What it practices: composing tested pieces (`score`, the bonus rule) into a bigger feature, plus loud validation at the boundary — project 18's own medicine, one level up.
Hint: sheet to hand-check — ones `[1,1,1,2,3]`, twos `[2,2,2,1,3]`, threes `[3,3,3,1,2]`, fours `[4,4,4,1,2]`, fives `[5,5,5,1,2]`, sixes `[6,6,6,1,2]` (upper = 3+6+9+12+15+18 = 63), threeOfAKind `[2,2,2,3,4]` = 13, fourOfAKind `[3,3,3,3,1]` = 13, fullHouse `[2,2,3,3,3]` = 25, smallStraight `[1,2,3,4,6]` = 30, largeStraight `[2,3,4,5,6]` = 40, yahtzee `[6,6,6,6,6]` = 50, chance `[6,6,5,4,3]` = 24.

## Solutions

### 1. Three facts the rulebook forgot
```js
// added to CASES in scoring.test.js:
  [[2, 2, 2, 2, 2], 'threeOfAKind', 10], // five of a kind IS three of a kind; sum of all dice
  [[1, 3, 4, 5, 6], 'smallStraight', 30], // gap at 2, but 3-4-5-6 is a run
  [[6, 6, 6, 6, 6], 'chance', 30],
```
**Why:** table-driven testing means each new fact costs one line, and each line documents a rule a human scorer might argue about. The `[2,2,2,2,2]` row pins the same "at least, not exactly" reading of the rule that exercise 4 turns into a property.

### 2. The upper-section bonus
```js
// sheet.js
import { score, CATEGORIES } from './scoring.js';

export function upperBonus(upperScores) {
  const total = Object.values(upperScores).reduce((sum, n) => sum + n, 0);
  return total >= 63 ? 35 : 0;
}
```
```js
// sheet.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upperBonus, bestCategory, scoreSheet } from './sheet.js';

test('upper bonus: 63 exactly earns it, 62 does not', () => {
  assert.equal(upperBonus({ ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 }), 35);
  assert.equal(upperBonus({ ones: 2, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 }), 0);
});
```
**Why:** the rule is one pure function — input object, output number — so the test is two lines, one of them sitting exactly on the 63 boundary where off-by-one bugs (`> 63`) live. That's the project's rules-as-pure-functions habit applied to a brand-new rule.

### 3. Which category should I pick?
```js
// sheet.js
export function bestCategory(dice) {
  let best = null;
  for (const name of Object.keys(CATEGORIES)) {
    const points = score(dice, name);
    if (!best || points > best.points) best = { name, points };
  }
  return best;
}
```
```js
test('bestCategory picks the highest-scoring rule', () => {
  assert.deepEqual(bestCategory([1, 2, 3, 4, 5]), { name: 'largeStraight', points: 40 });
  assert.deepEqual(bestCategory([5, 5, 5, 5, 5]), { name: 'yahtzee', points: 50 });
  assert.deepEqual(bestCategory([3, 3, 3, 2, 2]), { name: 'fullHouse', points: 25 });
  assert.deepEqual(bestCategory([1, 1, 2, 3, 5]), { name: 'chance', points: 12 });
});
```
**Why:** because every rule is an entry in one table, "try them all" is a four-line loop — with the original's 90-line if-ladder this feature would mean calling the whole switch 13 times and hoping. Going through `score` (not `CATEGORIES[name](dice)` directly) keeps the dice validation in the path. Strict `>` makes earlier table entries win ties, which the deepEqual rows lock in.

### 4. A property the rules must obey
```js
test('four of a kind implies three of a kind, and chance tops both', () => {
  for (let i = 0; i < 200; i++) {
    const dice = Array.from({ length: 5 }, () => 1 + Math.floor(Math.random() * 6));
    const four = score(dice, 'fourOfAKind');
    const three = score(dice, 'threeOfAKind');
    const chance = score(dice, 'chance');
    if (four > 0) assert.equal(three, four, `dice ${dice}`);
    assert.ok(chance >= four && chance >= three, `dice ${dice}`);
  }
});
```
**Why:** example rows check single answers; this checks a *relationship* across the whole input space, 200 rolls at a time. It fails the moment someone misreads "at least n" as "exactly n" — a realistic bug the example rows might miss if no row happens to hit it. Printing the dice in the message is what makes a random-input failure debuggable.

### 5. Score a whole game sheet
```js
// sheet.js
const UPPER = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];

export function scoreSheet(sheet) {
  const missing = Object.keys(CATEGORIES).filter((name) => !(name in sheet));
  if (missing.length > 0) {
    throw new Error(`Sheet incomplete. Missing: ${missing.join(', ')}`);
  }
  let upper = 0;
  let lower = 0;
  for (const [name, dice] of Object.entries(sheet)) {
    const points = score(dice, name); // unknown names and bad dice throw here
    if (UPPER.includes(name)) upper += points;
    else lower += points;
  }
  const bonus = upper >= 63 ? 35 : 0;
  return { upper, bonus, lower, total: upper + bonus + lower };
}
```
```js
test('a full sheet totals correctly, bonus included', () => {
  const sheet = {
    ones: [1, 1, 1, 2, 3], twos: [2, 2, 2, 1, 3], threes: [3, 3, 3, 1, 2],
    fours: [4, 4, 4, 1, 2], fives: [5, 5, 5, 1, 2], sixes: [6, 6, 6, 1, 2],
    threeOfAKind: [2, 2, 2, 3, 4], fourOfAKind: [3, 3, 3, 3, 1],
    fullHouse: [2, 2, 3, 3, 3], smallStraight: [1, 2, 3, 4, 6],
    largeStraight: [2, 3, 4, 5, 6], yahtzee: [6, 6, 6, 6, 6],
    chance: [6, 6, 5, 4, 3],
  };
  assert.deepEqual(scoreSheet(sheet), { upper: 63, bonus: 35, lower: 195, total: 293 });
  const { chance, ...incomplete } = sheet;
  assert.throws(() => scoreSheet(incomplete), /Missing: chance/);
});
```
**Why:** zero scoring logic is re-implemented — `score` does the categories, exercise 2's rule does the bonus, and this function only orchestrates. The missing-category guard mirrors `score`'s own unknown-category error: validate loudly at the entrance, listing exactly what's wrong, so a half-filled sheet can never produce a plausible-but-wrong total (the original's silent-zero sin, one level up).
