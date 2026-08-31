import { test } from 'node:test';
import assert from 'node:assert/strict';
import { append, appendAll, applyEvent, emptyState, replay, validate } from './ledger.js';

const OPEN = { type: 'open', owner: 'Ada', at: '2024-03-01T08:00:00Z' };
const PAY = { type: 'deposit', amountCents: 50000, at: '2024-03-01T09:00:00Z' };
const COFFEE = { type: 'withdraw', amountCents: 1250, at: '2024-03-02T08:15:00Z' };

/** Build a log, refusing to continue if the fixture itself is invalid. */
function log(...commands) {
  const { events, rejected } = appendAll([], commands);
  assert.deepEqual(rejected, [], 'fixture commands must all be valid');
  return events;
}

test('replay is deterministic: the same log always gives the same state', () => {
  const events = log(OPEN, PAY, COFFEE);
  assert.deepEqual(replay(events), replay(events));
  assert.deepEqual(replay(events), {
    open: true,
    owner: 'Ada',
    balanceCents: 48750,
    eventCount: 3,
    openedAt: '2024-03-01T08:00:00Z',
    lastEventAt: '2024-03-02T08:15:00Z',
  });
});

test('replay never mutates the log (the facts are frozen)', () => {
  const events = log(OPEN, PAY, COFFEE).map((event) => Object.freeze(event));
  Object.freeze(events);
  const before = structuredClone(events);
  replay(events);
  replay(events); // twice, to catch "the second run sees the first run's damage"
  assert.deepEqual(events, before);
});

test('order is part of the meaning: the same events, shuffled, differ', () => {
  const events = log(OPEN, PAY, COFFEE);
  const shuffled = [events[0], events[2], events[1]];
  assert.equal(replay(events).lastEventAt, '2024-03-02T08:15:00Z');
  assert.equal(replay(shuffled).lastEventAt, '2024-03-01T09:00:00Z');
  assert.equal(replay(events).balanceCents, replay(shuffled).balanceCents); // sums agree...
  assert.notDeepEqual(replay(events), replay(shuffled)); // ...but the state does not
});

test('events are plain JSON — a log survives a round trip to disk', () => {
  const events = log(OPEN, PAY, COFFEE);
  assert.deepEqual(replay(JSON.parse(JSON.stringify(events))), replay(events));
});

test('append returns a NEW log and leaves the old one alone', () => {
  const before = log(OPEN, PAY);
  const result = append(before, COFFEE);
  assert.equal(result.ok, true);
  assert.equal(before.length, 2, 'the previous log is untouched');
  assert.equal(result.events.length, 3);
  assert.notEqual(result.events, before);
});

test('a rejected command does NOT append — the log stays clean', () => {
  const before = log(OPEN, PAY);
  const bad = [
    [{ type: 'deposit', amountCents: -5000, at: '2024-03-02T00:00:00Z' }, 'INVALID_AMOUNT'],
    [{ type: 'deposit', amountCents: 0, at: '2024-03-02T00:00:00Z' }, 'INVALID_AMOUNT'],
    [{ type: 'deposit', amountCents: 12.5, at: '2024-03-02T00:00:00Z' }, 'INVALID_AMOUNT'],
    [{ type: 'withdraw', amountCents: 99999, at: '2024-03-02T00:00:00Z' }, 'INSUFFICIENT_FUNDS'],
    [{ type: 'open', owner: 'Bob', at: '2024-03-02T00:00:00Z' }, 'ALREADY_OPEN'],
    [{ type: 'deposit', amountCents: 100, at: '2020-01-01T00:00:00Z' }, 'OUT_OF_ORDER'],
    [{ type: 'deposit', amountCents: 100, at: 'last tuesday' }, 'INVALID_TIMESTAMP'],
    [{ type: 'teleport', amountCents: 100, at: '2024-03-02T00:00:00Z' }, 'UNKNOWN_COMMAND'],
    [undefined, 'UNKNOWN_COMMAND'],
  ];
  for (const [command, code] of bad) {
    const result = append(before, command);
    assert.equal(result.ok, false, `${code} should have been rejected`);
    assert.equal(result.error.code, code);
    assert.ok(result.error.message.length > 0);
    assert.equal(result.events, undefined, 'a rejection carries no log');
  }
  assert.equal(before.length, 2, 'nine rejections, zero events appended');
  assert.equal(replay(before).balanceCents, 50000);
});

test('THE original bug: the overdraft rule covers fees, not just withdrawals', () => {
  const events = log(OPEN, { type: 'deposit', amountCents: 1000, at: '2024-03-01T09:00:00Z' });
  // In original.js, chargeFee and payBill each forgot to copy the check.
  const fee = append(events, { type: 'charge-fee', amountCents: 5000, at: '2024-03-02T00:00:00Z' });
  assert.equal(fee.ok, false);
  assert.equal(fee.error.code, 'INSUFFICIENT_FUNDS');
  assert.match(fee.error.message, /1000/);
});

test('nothing can happen to an account that was never opened', () => {
  const result = append([], { type: 'deposit', amountCents: 100, at: '2024-03-01T00:00:00Z' });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'NOT_OPEN');
  assert.equal(append([], { type: 'open', owner: '  ', at: '2024-03-01T00:00:00Z' }).error.code,
    'INVALID_OWNER');
});

test('validate answers without changing anything', () => {
  const state = replay(log(OPEN, PAY));
  const snapshot = structuredClone(state);
  assert.equal(validate(state, COFFEE).ok, true);
  assert.equal(validate(state, { ...COFFEE, amountCents: 999999 }).ok, false);
  assert.deepEqual(state, snapshot);
});

test('an unknown event type in the log is a crash, not a shrug', () => {
  assert.throws(
    () => replay([{ type: 'vanished', amountCents: 1, at: '2024-03-01T00:00:00Z' }]),
    /Unknown event type/,
  );
});

test('applyEvent builds a new state instead of editing the old one', () => {
  const start = emptyState();
  const opened = applyEvent(start, { type: 'opened', owner: 'Ada', at: '2024-03-01T08:00:00Z' });
  assert.equal(start.open, false, 'the earlier state is still the earlier state');
  assert.equal(opened.open, true);
  assert.notEqual(opened, start);
});

test('appendAll keeps the good events and hands back the refusals', () => {
  const { events, rejected } = appendAll([], [
    OPEN,
    PAY,
    { type: 'withdraw', amountCents: 99999, at: '2024-03-02T00:00:00Z' },
    COFFEE,
  ]);
  assert.equal(events.length, 3);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].error.code, 'INSUFFICIENT_FUNDS');
  assert.equal(replay(events).balanceCents, 48750);
});
