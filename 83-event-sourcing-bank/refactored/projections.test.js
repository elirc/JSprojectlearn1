import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendAll } from './ledger.js';
import {
  balanceAt, balanceCents, dailyNet, duplicateSuspects,
  firstBalanceBelow, largestDay, statement,
} from './projections.js';

function log(...commands) {
  const { events, rejected } = appendAll([], commands);
  assert.deepEqual(rejected, [], 'fixture commands must all be valid');
  return events;
}

const MARCH = log(
  { type: 'open', owner: 'Ada', at: '2024-03-01T08:00:00Z' },
  { type: 'deposit', amountCents: 50000, at: '2024-03-01T09:00:00Z', note: 'paycheck' },
  { type: 'withdraw', amountCents: 1250, at: '2024-03-02T08:15:00Z', note: 'coffee' },
  { type: 'withdraw', amountCents: 32000, at: '2024-03-03T10:00:00Z', note: 'rent' },
  { type: 'charge-fee', amountCents: 3500, at: '2024-03-04T00:00:00Z' },
  { type: 'charge-fee', amountCents: 3500, at: '2024-03-04T00:00:02Z' },
  { type: 'deposit', amountCents: 2000, at: '2024-03-05T12:00:00Z', note: 'refund' },
);

// A log exported from the old system, where fees and bills skipped the
// overdraft check. `append` would refuse the last one; the events are
// pasted in raw, exactly as the buggy code wrote them.
const LEGACY = [
  ...MARCH,
  { type: 'withdrew', amountCents: 18000, at: '2024-03-06T09:00:00Z', note: 'car' },
];

test('balance is derived, and the arithmetic is boring on purpose', () => {
  assert.equal(balanceCents(MARCH), 11750);
  assert.equal(balanceCents([]), 0);
  assert.equal(balanceCents(LEGACY), -6250); // matches original.js exactly
});

test('the statement carries a running balance after every event', () => {
  const rows = statement(MARCH);
  assert.equal(rows.length, 7);
  assert.deepEqual(
    rows.map((r) => r.balanceCents),
    [0, 50000, 48750, 16750, 13250, 9750, 11750],
  );
  assert.deepEqual(rows[1], {
    index: 1,
    at: '2024-03-01T09:00:00Z',
    type: 'deposited',
    deltaCents: 50000,
    balanceCents: 50000,
    note: 'paycheck',
  });
  assert.equal(rows[0].deltaCents, 0, 'opening an account moves no money');
  assert.equal(rows[4].note, null, 'a missing note is null, not undefined');
  assert.equal(rows.at(-1).balanceCents, balanceCents(MARCH), 'the two agree by construction');
});

test('TIME TRAVEL: the balance at any past moment', () => {
  assert.equal(balanceAt(MARCH, '2024-02-01T00:00:00Z'), 0);      // before it all
  assert.equal(balanceAt(MARCH, '2024-03-01T09:00:00Z'), 50000);  // inclusive of that instant
  assert.equal(balanceAt(MARCH, '2024-03-02T23:59:59Z'), 48750);
  assert.equal(balanceAt(MARCH, '2024-03-04T00:00:01Z'), 13250);  // between the two fees
  assert.equal(balanceAt(MARCH, '2025-01-01T00:00:00Z'), balanceCents(MARCH));
  assert.throws(() => balanceAt(MARCH, 'yesterday'), TypeError);
});

test('daily net and the busiest day', () => {
  assert.deepEqual(dailyNet(MARCH), [
    { day: '2024-03-01', netCents: 50000, eventCount: 2 },
    { day: '2024-03-02', netCents: -1250, eventCount: 1 },
    { day: '2024-03-03', netCents: -32000, eventCount: 1 },
    { day: '2024-03-04', netCents: -7000, eventCount: 2 },
    { day: '2024-03-05', netCents: 2000, eventCount: 1 },
  ]);
  assert.deepEqual(largestDay(MARCH), { day: '2024-03-01', netCents: 50000, eventCount: 2 });
  assert.equal(largestDay([]), null);
});

test('largestDay measures size in either direction, earliest day wins ties', () => {
  const swings = log(
    { type: 'open', owner: 'Ada', at: '2024-03-01T08:00:00Z' },
    { type: 'deposit', amountCents: 900, at: '2024-03-01T09:00:00Z' },
    { type: 'deposit', amountCents: 900, at: '2024-03-02T09:00:00Z' },
    { type: 'withdraw', amountCents: 1700, at: '2024-03-03T09:00:00Z' },
  );
  assert.equal(largestDay(swings).day, '2024-03-03'); // -1700 beats +900
  assert.equal(largestDay(swings).netCents, -1700);
  const tie = log(
    { type: 'open', owner: 'Ada', at: '2024-03-01T08:00:00Z' },
    { type: 'deposit', amountCents: 500, at: '2024-03-01T09:00:00Z' },
    { type: 'deposit', amountCents: 500, at: '2024-03-02T09:00:00Z' },
  );
  assert.equal(largestDay(tie).day, '2024-03-01');
});

test('THE support ticket: when did the balance go negative, and why?', () => {
  assert.equal(firstBalanceBelow(MARCH, 0), null, 'the rules held: never below zero');

  const drop = firstBalanceBelow(LEGACY, 0);
  assert.equal(drop.index, 7);
  assert.equal(drop.type, 'withdrew');
  assert.equal(drop.at, '2024-03-06T09:00:00Z');
  assert.equal(drop.note, 'car');
  assert.equal(drop.deltaCents, -18000);
  assert.equal(drop.balanceCents, -6250);
  // ...and the balance one second earlier, for the support reply:
  assert.equal(balanceAt(LEGACY, '2024-03-06T08:59:59Z'), 11750);
});

test('a fresh account really is below any positive threshold', () => {
  // Honest, not clever: the opening event leaves a balance of 0, so
  // "first below 1 cent" is the account opening. Pinning the surprising
  // answer beats quietly special-casing it.
  assert.equal(firstBalanceBelow(MARCH, 1).index, 0);
  assert.equal(firstBalanceBelow(MARCH, 1).type, 'opened');
});

test('duplicate suspects: same type, same amount, same day', () => {
  const suspects = duplicateSuspects(LEGACY);
  assert.equal(suspects.length, 1);
  assert.equal(suspects[0].firstIndex, 4);
  assert.equal(suspects[0].repeatIndex, 5);
  assert.equal(suspects[0].event.type, 'fee-charged');
  assert.equal(balanceCents(LEGACY.filter((_, i) => i !== 5)), -2750); // refunding it
});

test('duplicate suspects ignore openings and different days', () => {
  const spread = log(
    { type: 'open', owner: 'Ada', at: '2024-03-01T08:00:00Z' },
    { type: 'deposit', amountCents: 5000, at: '2024-03-01T09:00:00Z' },
    { type: 'withdraw', amountCents: 1250, at: '2024-03-01T10:00:00Z' },
    { type: 'withdraw', amountCents: 1250, at: '2024-03-02T10:00:00Z' },
  );
  assert.deepEqual(duplicateSuspects(spread), []);
  assert.deepEqual(duplicateSuspects([]), []);
});

test('every projection survives an empty log without a NaN', () => {
  assert.equal(balanceCents([]), 0);
  assert.deepEqual(statement([]), []);
  assert.deepEqual(dailyNet([]), []);
  assert.equal(largestDay([]), null);
  assert.equal(firstBalanceBelow([], 0), null);
  assert.equal(balanceAt([], '2024-03-01T00:00:00Z'), 0);
});
