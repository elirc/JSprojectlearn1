import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solveHanoi } from './hanoi.js';

test('zero discs means zero moves', () => {
  assert.deepEqual(solveHanoi(0), []);
});

test('one disc is one move, straight to the target', () => {
  assert.deepEqual(solveHanoi(1), [{ disc: 1, from: 'A', to: 'C' }]);
});

test('n discs always take exactly 2^n - 1 moves', () => {
  for (let n = 1; n <= 10; n++) {
    assert.equal(solveHanoi(n).length, 2 ** n - 1);
  }
});

test('every move is legal and the puzzle ends solved', () => {
  // Because the solver returns DATA, we can replay it and check the rules.
  const discs = 5;
  const pegs = { A: [], B: [], C: [] };
  for (let d = discs; d >= 1; d--) pegs.A.push(d);

  for (const { disc, from, to } of solveHanoi(discs)) {
    assert.equal(pegs[from].at(-1), disc, 'moves the top disc');
    const destTop = pegs[to].at(-1);
    assert.ok(destTop === undefined || destTop > disc, 'never big on small');
    pegs[to].push(pegs[from].pop());
  }

  assert.deepEqual(pegs.C, [5, 4, 3, 2, 1]);
});

test('bad input throws', () => {
  assert.throws(() => solveHanoi(-1), RangeError);
  assert.throws(() => solveHanoi(2.5), RangeError);
});
