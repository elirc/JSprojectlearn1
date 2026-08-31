# 🏋️ Practice: Event-Sourcing Bank

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Work in `refactored/ledger.js` and `refactored/projections.js`; add your checks to the matching `.test.js` files and run them with `node --test 83-event-sourcing-bank/refactored/ledger.test.js`.

## Exercises

### ⭐ 1. totals() — a new projection in five lines (warm-up)

Write `totals(events)` returning `{ depositedCents, withdrawnCents, feesCents }`. Then assert the invariant that ties it to everything else: `deposited - withdrawn - fees === balanceCents(events)`.

What it practices: how cheap a new report is once the facts are kept. Notice what you did *not* have to do — no new field to maintain, no migration, no risk to the write side.

Hint: one loop, three `if`s. Start all three sums at `0` so an empty log answers `{0,0,0}` instead of `undefined`.

Check (in node): for the March log, `{ depositedCents: 50000, withdrawnCents: 1250, feesCents: 7000 }`, and the invariant holds exactly.

### ⭐⭐ 2. A new fact: interest-accrued (core)

Add an `accrue-interest` command producing an `interest-accrued` event that increases the balance. Touch `COMMAND_TO_EVENT`, `applyEvent` and `deltaOf` — and nothing else. Confirm that old logs still replay unchanged, that the positive-integer amount rule applies for free, and that `statement` shows the new row correctly.

What it practices: extending a system whose truth is a list of facts. The measure of the design is how *few* places you have to touch.

Hint: `deltaOf` and `applyEvent` are the two places that decide what an event *means*; validation is generic already, because the amount rules don't care which kind of movement it is.

Check (in node): appending `{ type: 'accrue-interest', amountCents: 125, at: '2024-03-31T23:59:00Z' }` yields an `interest-accrued` event, raises the balance by 125, `deltaOf` returns `+125`, and a negative amount is still `INVALID_AMOUNT`.

### ⭐⭐ 3. Snapshots (core)

Replaying a million events to show a balance is silly. Write `takeSnapshot(events)` → `{ eventIndex, at, state }` and `replayFrom(snapshot, events)` which folds only the events *after* the snapshot. The rule that keeps this honest: a snapshot is a **cache**, never a second source of truth — deleting it must lose nothing.

What it practices: making a derived value fast without promoting it to the truth. This is the same bargain as project 27's memoize: cached answers, recomputable at will.

Hint: `events.slice(snapshot.eventIndex).reduce(applyEvent, snapshot.state)`. Test it with a snapshot at 0, in the middle, and at the very end.

Check (in node): `replayFrom(takeSnapshot(events.slice(0, 3)), events)` deep-equals `replay(events)`, and still does after more events are appended.

### ⭐⭐ 4. Undo by appending the opposite (core)

The customer wants the duplicate fee refunded. You cannot delete event #4 — it happened. Add a `reverse` command taking `targetIndex`, appending `{ type: 'reversed', targetIndex, deltaCents }` whose delta is the *opposite* of the target's. Refuse: an index that doesn't exist, an event that moved no money, an event already reversed, and a reversal that would push the balance negative.

What it practices: the append-only mindset. History gets *longer*, never shorter — so the refund itself is auditable, which is precisely what a bank needs.

Hint: this rule needs the log, not just the state (has this event been reversed before?), so validate it in `append`, where the log is in scope, via a helper `validateReversal(events, state, command)`.

Check (in node): reversing the duplicate fee grows the log by one, leaves the first five events byte-identical, raises the balance by 3500, and a second reversal of the same index returns `ALREADY_REVERSED`.

### ⭐⭐⭐ 5. A store around the log (challenge)

Wrap the log the way project 59 wrapped state: `createStore(initialEvents)` with `dispatch(command)` (returns the Result), `getState()`, `getEvents()` and `subscribe(listener)` returning an unsubscribe function. Two requirements: the cached state must be updated **incrementally** (`applyEvent`, not a full `replay`) and must always equal `replay(getEvents())`; and a *rejected* command must notify nobody.

What it practices: joining project 59's one-door-in idea to an event log — which is what Redux's devtools, with their time-travel slider, actually are.

Hint: `getEvents()` must return a copy (`[...events]`), or a caller can push straight into your history and skip every rule.

Check (in node): after two accepted and one rejected dispatch, listeners saw exactly two notifications, `getEvents().length` is 2, `getState()` deep-equals `replay(getEvents())`, and pushing onto the array returned by `getEvents()` doesn't change the store.

### ⭐⭐⭐ 6. Fuzz the promises (challenge)

Write a fuzz test: 300 trials of 40 random commands (random types, random amounts, sometimes illegal, increasing timestamps), asserting after *every* command that the balance is never negative, the log grew by at most 1, a rejection appended nothing, `eventCount === events.length`, the deltas sum to the balance, the statement's last row matches the balance, and the store's cached state equals a full replay.

What it practices: property-based testing against invariants. The original could not satisfy a single one of these properties, and no example test would have found the `payBill` hole — but a fuzzer finds it in milliseconds.

Hint: bias the generator so ~15% of amounts are illegal (zero or negative); otherwise you only ever test the happy path.

Check (in node): 300 × 40 operations pass. Then delete the `MONEY_OUT` check from `validate` and watch "balance went negative in trial N" fire almost immediately.

## Solutions

### 1. totals()

```js
export function totals(events) {
  const sums = { depositedCents: 0, withdrawnCents: 0, feesCents: 0 };
  for (const event of events) {
    if (event.type === 'deposited') sums.depositedCents += event.amountCents;
    if (event.type === 'withdrew') sums.withdrawnCents += event.amountCents;
    if (event.type === 'fee-charged') sums.feesCents += event.amountCents;
  }
  return sums;
}
```

WHY: the interesting part is the assertion, not the function. `deposited - withdrawn - fees === balance` is a **cross-check**: two independent walks over the same facts that must agree. In the original there was nothing to cross-check *against* — one number, take it or leave it. Note also what this exercise did not require: no schema change, no backfill, no coordination with whoever writes events. New questions are cheap when the answers aren't stored. Verified by running: `{50000, 1250, 7000}` and the invariant holds.

### 2. interest-accrued

```js
const COMMAND_TO_EVENT = {
  open: 'opened', deposit: 'deposited', withdraw: 'withdrew',
  'charge-fee': 'fee-charged',
  'accrue-interest': 'interest-accrued',   // <- new
};

// applyEvent:
case 'interest-accrued':
  return { ...base, balanceCents: state.balanceCents + event.amountCents };

// deltaOf:
if (event.type === 'deposited' || event.type === 'interest-accrued') return event.amountCents;
```

WHY: three lines, in the three places that define what an event *means* — and zero lines in validation, because "a positive whole number of cents" was never a fact about deposits specifically. Old logs replay identically because nothing about them changed; that's the backward compatibility you get from append-only data. The one thing to be careful about is naming: `interest-accrued`, past tense, because by the time it's in the log it has happened. If you find yourself wanting to *edit* an old event to add interest, that's the instinct this project exists to retrain. Verified by running: balance +125, `deltaOf` +125, statement row correct, negative amount still `INVALID_AMOUNT`.

### 3. Snapshots

```js
export function takeSnapshot(events) {
  return { eventIndex: events.length, at: events.at(-1)?.at ?? null, state: replay(events) };
}

export function replayFrom(snapshot, events) {
  return events.slice(snapshot.eventIndex).reduce(applyEvent, snapshot.state);
}
```

WHY: `eventIndex` is what makes this safe — it says *exactly* how much of the log the snapshot already accounts for, so `replayFrom` can never double-count or skip. Storing the count rather than a timestamp matters, because two events can share a timestamp (the duplicate fee did). And because `applyEvent` returns new states rather than mutating, the snapshot's `state` can't be corrupted by later folding. Delete every snapshot you have and the system still works, just slower — that's the definition of a cache, and the line real event-sourced systems must not cross. Verified by running: snapshots at 0, 3, and the end all reproduce `replay(events)` exactly, before and after appending more.

### 4. Undo by appending the opposite

```js
export function validateReversal(events, state, command) {
  const target = events[command.targetIndex];
  if (!Number.isInteger(command.targetIndex) || target === undefined) {
    return fail('NO_SUCH_EVENT', `No event at index ${command.targetIndex}`);
  }
  if (deltaOf(target) === 0) {
    return fail('NOT_REVERSIBLE', `A ${target.type} event moved no money`);
  }
  if (events.some((e) => e.type === 'reversed' && e.targetIndex === command.targetIndex)) {
    return fail('ALREADY_REVERSED', `Event #${command.targetIndex} was already reversed`);
  }
  const deltaCents = -deltaOf(target);
  if (state.balanceCents + deltaCents < 0) {
    return fail('INSUFFICIENT_FUNDS', `Reversing would leave ${state.balanceCents + deltaCents}`);
  }
  return { ok: true, deltaCents };
}

// in append(), after the generic validate() passes:
if (command.type === 'reverse') {
  const reversal = validateReversal(events, state, command);
  if (!reversal.ok) return reversal;
  const undo = { type: 'reversed', at: command.at,
                 targetIndex: command.targetIndex, deltaCents: reversal.deltaCents };
  return { ok: true, events: [...events, undo] };
}

// applyEvent:  case 'reversed': return { ...base, balanceCents: state.balanceCents + event.deltaCents };
// deltaOf:     if (event.type === 'reversed') return event.deltaCents;
```

WHY: the reversal event carries its own `deltaCents` rather than making readers look up the target, which keeps `applyEvent` a pure function of one event and one state — the property that lets snapshots and incremental stores work at all. `ALREADY_REVERSED` is the rule that stops a retried refund from paying out twice (the same class of bug as the duplicate fee it's cleaning up, which is not a coincidence). And note where this rule had to live: `validate` only sees the *state*, but "has this been reversed?" is a question about the *log*, so it belongs in `append`. Real ledgers work exactly this way — you'll see the compensating entry on your bank statement next to the mistake, because deleting the mistake would be fraud. Verified by running: log grows by one, first five events byte-identical, balance +3500, and all four refusals fire.

### 5. A store around the log

```js
export function createStore(initialEvents = []) {
  let events = [...initialEvents];
  let state = replay(events);
  const listeners = new Set();
  return {
    getState: () => state,
    getEvents: () => [...events],                     // a copy: nobody edits history
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    dispatch(command) {
      const result = append(events, command);
      if (!result.ok) return result;                  // refusals notify nobody
      events = result.events;
      const event = events.at(-1);
      state = applyEvent(state, event);               // O(1), not a full replay
      for (const listener of listeners) listener(state, event);
      return { ok: true, event };
    },
  };
}
```

WHY: `state = applyEvent(state, event)` is the whole optimisation — the log is the truth, but you don't re-read it from the beginning every time, exactly as project 59's reducer folds one action into the current state. The fuzz test then pins the two views together (`getState()` must always deep-equal `replay(getEvents())`), which is the assertion that catches the classic incremental-cache bug where the fast path and the slow path drift apart. Returning a copy from `getEvents()` is not paranoia: hand out the real array and one `push` bypasses every rule in the file, which is the original's disease all over again. Verified by running: two notifications for two accepted commands, none for the rejected one, cached state matches replay, and the handed-out array is a copy.

### 6. Fuzz the promises

```js
test('FUZZ: the promises hold for any sequence of commands', () => {
  const TYPES = ['deposit', 'withdraw', 'charge-fee', 'accrue-interest', 'open'];
  for (let trial = 0; trial < 300; trial++) {
    const store = createStore();
    let events = [];
    let clock = Date.parse('2024-03-01T00:00:00Z');

    for (let i = 0; i < 40; i++) {
      clock += Math.floor(Math.random() * 100000);
      const command = {
        type: TYPES[Math.floor(Math.random() * TYPES.length)],
        owner: 'Ada',
        amountCents: Math.random() < 0.15
          ? Math.floor(Math.random() * 2000) - 1000    // sometimes illegal
          : Math.floor(Math.random() * 20000) + 1,
        at: new Date(clock).toISOString(),
      };
      const before = events;
      const result = append(before, command);
      assert.equal(result.ok, store.dispatch(command).ok, 'store and append agree');
      if (result.ok) events = result.events;

      assert.ok(events.length - before.length <= 1, 'at most one event per command');
      if (!result.ok) assert.equal(events, before, 'a refusal appends nothing');

      const state = replay(events);
      assert.ok(state.balanceCents >= 0, `balance went negative in trial ${trial}`);
      assert.equal(state.eventCount, events.length);
      assert.equal(
        events.reduce((sum, event) => sum + deltaOf(event), 0),
        state.balanceCents, 'the deltas always add up to the balance',
      );
      const rows = statement(events);
      assert.equal(rows.length, events.length);
      if (rows.length > 0) assert.equal(rows.at(-1).balanceCents, state.balanceCents);
      assert.deepEqual(store.getState(), state, 'cached state == full replay');
    }
  }
});
```

WHY: read the assertions as sentences and you have the system's contract — *the balance is never negative; a refusal changes nothing; the parts sum to the whole; every view agrees*. The original violated the first and the last within seven lines of its demo, and no amount of careful example-writing would have caught the `payBill` hole, because the person who forgot the rule is the same person who would have written the test. A fuzzer doesn't share your blind spots. The `store and append agree` line is quietly the most valuable one: two implementations of the same idea (recompute vs. cache) checked against each other 12,000 times per run. Verified by running: 300 trials × 40 commands pass; deleting the `MONEY_OUT` overdraft check makes it fail almost immediately.
