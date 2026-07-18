import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOVES, decideWinner, randomMove } from './game.js';

test('same move is a draw', () => {
  for (const move of MOVES) {
    assert.equal(decideWinner(move, move), 'draw');
  }
});

test('each move beats exactly one other move', () => {
  assert.equal(decideWinner('rock', 'scissors'), 'player');
  assert.equal(decideWinner('paper', 'rock'), 'player');
  assert.equal(decideWinner('scissors', 'paper'), 'player');
});

test('the rules are symmetric', () => {
  // If a beats b from the player's side, b vs a loses.
  for (const a of MOVES) {
    for (const b of MOVES) {
      if (a === b) continue;
      const oneWay = decideWinner(a, b);
      const otherWay = decideWinner(b, a);
      assert.notEqual(oneWay, otherWay);
    }
  }
});

test('invalid moves throw instead of silently doing nothing', () => {
  assert.throws(() => decideWinner('rok', 'rock'));
});

test('randomMove is testable because the rng is injectable', () => {
  assert.equal(randomMove(() => 0), 'rock');
  assert.equal(randomMove(() => 0.5), 'paper');
  assert.equal(randomMove(() => 0.99), 'scissors');
});
