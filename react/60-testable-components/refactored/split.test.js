// The capstone's point, in one file: these are the questions the
// original component could not be asked. Not "does it render" — does it
// LOSE A CENT. Nothing here needs a browser, a click, or a person.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCents,
  formatCents,
  splitEvenly,
  computeBalances,
  settle,
} from './split.js';

const sum = (numbers) => numbers.reduce((total, n) => total + n, 0);

// ---- money in, money out ------------------------------------------------

test('money is parsed into whole cents', () => {
  assert.equal(parseCents('10'), 1000);
  assert.equal(parseCents('10.5'), 1050);
  assert.equal(parseCents('10.55'), 1055);
  assert.equal(parseCents('$1,234.05'), 123405);
  assert.equal(parseCents('.5'), 50);
  assert.equal(parseCents('-4.20'), -420);
});

test('anything that is not money is rejected, loudly and early', () => {
  assert.equal(parseCents(''), null);
  assert.equal(parseCents('  '), null);
  assert.equal(parseCents('abc'), null);
  assert.equal(parseCents('10.555'), null, 'a third decimal is not money');
  assert.equal(parseCents('1.2.3'), null);
  assert.equal(parseCents('-'), null);
});

test('formatting is printing, never arithmetic', () => {
  assert.equal(formatCents(1050), '$10.50');
  assert.equal(formatCents(5), '$0.05');
  assert.equal(formatCents(0), '$0.00');
  assert.equal(formatCents(-333), '-$3.33');
  assert.equal(formatCents(123405), '$1234.05');
});

test('parse and format round-trip', () => {
  for (const text of ['0', '0.01', '7.77', '99.99', '1234.05']) {
    assert.equal(formatCents(parseCents(text)), `$${Number(text).toFixed(2)}`);
  }
});

// ---- THE BUG ------------------------------------------------------------

test('an uneven split still adds up to the whole bill', () => {
  // $10.00 between three people. The float version gives everyone 3.33
  // and quietly bins the last cent. This one does not.
  const shares = splitEvenly(1000, 3);
  assert.deepEqual(shares, [334, 333, 333]);
  assert.equal(sum(shares), 1000);
});

test('an even split is even', () => {
  assert.deepEqual(splitEvenly(1000, 4), [250, 250, 250, 250]);
  assert.deepEqual(splitEvenly(0, 3), [0, 0, 0]);
});

test('the remainder is handed out from the front, one cent at a time', () => {
  assert.deepEqual(splitEvenly(1, 5), [1, 0, 0, 0, 0]);
  assert.deepEqual(splitEvenly(7, 2), [4, 3]);
  assert.deepEqual(splitEvenly(1004, 3), [335, 335, 334]);
});

test('a refund splits exactly too', () => {
  const shares = splitEvenly(-1000, 3);
  assert.deepEqual(shares, [-334, -333, -333]);
  assert.equal(sum(shares), -1000);
});

test('no group size and no bill can lose a cent — 5000 cases', () => {
  for (let n = 1; n <= 50; n += 1) {
    for (let total = 0; total < 100; total += 1) {
      const shares = splitEvenly(total, n);
      assert.equal(shares.length, n);
      assert.equal(sum(shares), total, `${total} split ${n} ways`);
    }
  }
});

test('splitting between nobody is empty, not a crash', () => {
  assert.deepEqual(splitEvenly(1000, 0), []);
  assert.deepEqual(splitEvenly(1000, -2), []);
});

// ---- balances -----------------------------------------------------------

const people = [
  { id: 'ana', name: 'Ana' },
  { id: 'ben', name: 'Ben' },
  { id: 'cass', name: 'Cass' },
];
const dinner = {
  id: 'e1', description: 'Dinner', paidBy: 'ana',
  amountCents: 1000, participants: ['ana', 'ben', 'cass'],
};

test('the payer is credited in full and everyone is charged a share', () => {
  const balances = computeBalances(people, [dinner]);
  assert.deepEqual(balances, { ana: 666, ben: -333, cass: -333 });
});

test('balances always sum to zero — the invariant that hides a lost cent', () => {
  const expenses = [
    dinner,
    { id: 'e2', description: 'Taxi', paidBy: 'ben', amountCents: 1750, participants: ['ana', 'ben'] },
    { id: 'e3', description: 'Coffee', paidBy: 'cass', amountCents: 7, participants: ['ana', 'ben', 'cass'] },
  ];
  const balances = computeBalances(people, expenses);
  assert.equal(sum(Object.values(balances)), 0);
});

test('an expense one person paid for someone else', () => {
  const balances = computeBalances(people, [
    { id: 'e1', description: 'Gift', paidBy: 'ana', amountCents: 500, participants: ['ben'] },
  ]);
  assert.deepEqual(balances, { ana: 500, ben: -500, cass: 0 });
});

test('people who spent nothing are level, not missing', () => {
  assert.deepEqual(computeBalances(people, []), { ana: 0, ben: 0, cass: 0 });
});

test('unknown ids cannot unbalance the books', () => {
  const ghostPayer = computeBalances(people, [{ ...dinner, paidBy: 'nobody' }]);
  assert.deepEqual(ghostPayer, { ana: 0, ben: 0, cass: 0 }, 'skipped entirely');

  const ghostGuest = computeBalances(people, [{ ...dinner, participants: ['ana', 'ben', 'ghost'] }]);
  assert.equal(sum(Object.values(ghostGuest)), 0);
  assert.deepEqual(ghostGuest, { ana: 500, ben: -500, cass: 0 });

  const nobodyAtAll = computeBalances(people, [{ ...dinner, participants: ['ghost'] }]);
  assert.deepEqual(nobodyAtAll, { ana: 0, ben: 0, cass: 0 });
});

test('computing balances never mutates the inputs', () => {
  const snapshot = JSON.stringify([people, [dinner]]);
  computeBalances(people, [dinner]);
  assert.equal(JSON.stringify([people, [dinner]]), snapshot);
});

// ---- settlement ---------------------------------------------------------

test('nothing owed, nothing to do', () => {
  assert.deepEqual(settle({}), []);
  assert.deepEqual(settle({ ana: 0, ben: 0 }), []);
});

test('two people, one transfer', () => {
  assert.deepEqual(settle({ ana: 500, ben: -500 }),
    [{ from: 'ben', to: 'ana', cents: 500 }]);
});

test('three people are cleared in two transfers, not three', () => {
  const transfers = settle(computeBalances(people, [dinner]));
  assert.deepEqual(transfers, [
    { from: 'ben', to: 'ana', cents: 333 },
    { from: 'cass', to: 'ana', cents: 333 },
  ]);
  assert.ok(transfers.length <= people.length - 1);
});

test('the transfers pay off exactly what is owed — including the odd cent', () => {
  const expenses = [
    dinner,
    { id: 'e2', description: 'Taxi', paidBy: 'ben', amountCents: 1750, participants: ['ana', 'ben'] },
    { id: 'e3', description: 'Coffee', paidBy: 'cass', amountCents: 7, participants: ['ana', 'ben', 'cass'] },
  ];
  const balances = computeBalances(people, expenses);
  const transfers = settle(balances);

  const credit = sum(Object.values(balances).filter((cents) => cents > 0));
  assert.equal(sum(transfers.map((t) => t.cents)), credit);

  // Apply the transfers and everyone must land on exactly zero.
  const after = { ...balances };
  for (const t of transfers) { after[t.from] += t.cents; after[t.to] -= t.cents; }
  assert.deepEqual(after, { ana: 0, ben: 0, cass: 0 });
});

test('a debtor owing several people is split across them, biggest first', () => {
  const transfers = settle({ ana: 700, ben: 300, cass: -1000 });
  assert.deepEqual(transfers, [
    { from: 'cass', to: 'ana', cents: 700 },
    { from: 'cass', to: 'ben', cents: 300 },
  ]);
});

test('equal balances settle in a stable, name-ordered way', () => {
  assert.deepEqual(settle({ zed: -500, ana: -500, mia: 1000 }), [
    { from: 'ana', to: 'mia', cents: 500 },
    { from: 'zed', to: 'mia', cents: 500 },
  ]);
});

test('settling never mutates the balances it was given', () => {
  const balances = { ana: 666, ben: -333, cass: -333 };
  settle(balances);
  assert.deepEqual(balances, { ana: 666, ben: -333, cass: -333 });
});

test('a hundred random groups always settle to exactly zero', () => {
  let seed = 42;
  const random = (max) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % max; };

  for (let run = 0; run < 100; run += 1) {
    const group = Array.from({ length: 2 + random(6) }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
    const expenses = Array.from({ length: 1 + random(8) }, (_, i) => ({
      id: `e${i}`,
      description: 'x',
      paidBy: group[random(group.length)].id,
      amountCents: 1 + random(20000),
      participants: group.filter(() => random(2) === 0).map((p) => p.id),
    }));
    const balances = computeBalances(group, expenses);
    assert.equal(sum(Object.values(balances)), 0, 'balances must sum to zero');

    const after = { ...balances };
    for (const t of settle(balances)) { after[t.from] += t.cents; after[t.to] -= t.cents; }
    assert.ok(Object.values(after).every((cents) => cents === 0), 'everyone must end at zero');
  }
});
