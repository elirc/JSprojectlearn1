import { test } from 'node:test';
import assert from 'node:assert/strict';
import { score, CATEGORIES } from './scoring.js';

// Table-driven tests: each row is [dice, category, expected score].
// Adding a rule example = adding a row. This IS the rulebook, executable.
const CASES = [
  [[1, 1, 3, 4, 1], 'ones', 3],
  [[2, 3, 4, 5, 6], 'ones', 0],
  [[6, 6, 1, 2, 6], 'sixes', 18],

  [[3, 3, 3, 2, 5], 'threeOfAKind', 16], // sum of ALL dice
  [[3, 3, 2, 2, 5], 'threeOfAKind', 0],
  [[4, 4, 4, 4, 2], 'fourOfAKind', 18],
  [[4, 4, 4, 4, 4], 'fourOfAKind', 20],  // five of a kind counts as four

  [[3, 3, 3, 2, 2], 'fullHouse', 25],
  [[3, 3, 3, 3, 2], 'fullHouse', 0],     // 4+1 is not a full house
  [[5, 5, 5, 5, 5], 'fullHouse', 0],     // 5+0 is not a full house

  [[1, 2, 3, 4, 6], 'smallStraight', 30],
  [[2, 3, 4, 5, 5], 'smallStraight', 30],
  [[3, 4, 5, 6, 6], 'smallStraight', 30],
  [[1, 2, 3, 5, 6], 'smallStraight', 0],

  [[1, 2, 3, 4, 5], 'largeStraight', 40],
  [[2, 3, 4, 5, 6], 'largeStraight', 40],
  [[1, 2, 3, 4, 6], 'largeStraight', 0],
  [[1, 2, 3, 4, 5], 'smallStraight', 30], // a large straight contains a small one

  [[5, 5, 5, 5, 5], 'yahtzee', 50],
  [[5, 5, 5, 5, 4], 'yahtzee', 0],

  [[1, 2, 3, 4, 5], 'chance', 15],
];

for (const [dice, category, expected] of CASES) {
  test(`${category} of [${dice}] scores ${expected}`, () => {
    assert.equal(score(dice, category), expected);
  });
}

test('every category returns 0 or more for any roll (never NaN/undefined)', () => {
  for (const name of Object.keys(CATEGORIES)) {
    for (let i = 0; i < 20; i++) {
      const dice = Array.from({ length: 5 }, () => 1 + Math.floor(Math.random() * 6));
      const result = score(dice, name);
      assert.ok(Number.isInteger(result) && result >= 0, `${name} of ${dice} gave ${result}`);
    }
  }
});

test('a typo in the category name throws instead of scoring 0', () => {
  assert.throws(() => score([1, 2, 3, 4, 5], 'fullHous'), /Unknown category/);
});

test('invalid dice throw', () => {
  assert.throws(() => score([1, 2, 3, 4], 'chance'), RangeError);      // 4 dice
  assert.throws(() => score([1, 2, 3, 4, 7], 'chance'), RangeError);   // face 7
});
