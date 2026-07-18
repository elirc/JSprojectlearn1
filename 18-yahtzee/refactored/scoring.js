/**
 * Yahtzee scoring. Every category is a small pure function in a
 * table; two shared helpers do the counting the original repeated
 * five times.
 *
 * This file was written test-first (see scoring.test.js): each rule
 * from the rulebook became a failing test, then a category function.
 */

/** [count of each face 1-6]. counts(  [3,3,5,1,3]  )[3] === 3 */
function counts(dice) {
  const result = [0, 0, 0, 0, 0, 0, 0]; // index 0 unused, faces 1-6
  for (const die of dice) result[die]++;
  return result;
}

const sum = (dice) => dice.reduce((total, die) => total + die, 0);

/** Sum of all dice if any face appears >= n times, else 0. */
const ofAKind = (n) => (dice) =>
  counts(dice).some((count) => count >= n) ? sum(dice) : 0;

/** Fixed score if the dice contain `run` consecutive faces, else 0. */
const straight = (run, score) => (dice) => {
  const faces = new Set(dice);
  for (let start = 1; start + run - 1 <= 6; start++) {
    const found = Array.from({ length: run }, (_, i) => start + i)
      .every((face) => faces.has(face));
    if (found) return score;
  }
  return 0;
};

/** Total of dice showing `face`. upperSection(3)([3,3,5]) === 6 */
const upperSection = (face) => (dice) =>
  counts(dice)[face] * face;

export const CATEGORIES = {
  ones: upperSection(1),
  twos: upperSection(2),
  threes: upperSection(3),
  fours: upperSection(4),
  fives: upperSection(5),
  sixes: upperSection(6),

  threeOfAKind: ofAKind(3),
  fourOfAKind: ofAKind(4),
  yahtzee: (dice) => (counts(dice).includes(5) ? 50 : 0),

  fullHouse: (dice) => {
    const perFace = counts(dice);
    return perFace.includes(3) && perFace.includes(2) ? 25 : 0;
  },

  smallStraight: straight(4, 30),
  largeStraight: straight(5, 40),

  chance: sum,
};

export function score(dice, category) {
  if (!Array.isArray(dice) || dice.length !== 5 || dice.some((d) => !Number.isInteger(d) || d < 1 || d > 6)) {
    throw new RangeError(`dice must be five integers 1-6, got ${JSON.stringify(dice)}`);
  }
  const scorer = CATEGORIES[category];
  if (!scorer) {
    throw new Error(`Unknown category "${category}". Known: ${Object.keys(CATEGORIES).join(', ')}`);
  }
  return scorer(dice);
}
