# 🏋️ Practice: State Machine

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. canTransition — asking without throwing (warm-up)

`transition` throws on an illegal move, which is right for *doing* but wrong for *asking* — no caller should need a try/catch to find out whether a button is legal. Write `canTransition(state, event)` returning a boolean, and add a test that loops over every state in `TRANSITIONS` and every event in `['pay', 'ship', 'deliver', 'cancel', 'nonsense']`, asserting the answer always agrees with `allowedEvents(state).includes(event)`. Also check an unknown state: `canTransition('banana', 'pay')` must be `false`, not a crash.

What it practices: separating a question from a command, and testing two functions against each other instead of against 25 hand-written answers.

Hint: one line — `return TRANSITIONS[state]?.[event] !== undefined;`. The `?.` is what makes the unknown state return `false` instead of throwing.

### ⭐⭐ 2. applyAll — replay a whole event log (core)

Write `applyAll(state, events)` that folds a list of events over the machine and returns the final state. When one of them is illegal, the error must say *which* one: `Event 1 ("deliver") failed: ...` — because in a 40-event replay, "cannot deliver a paid order" alone tells you nothing about where. Preserve the original error as `cause`. Check offline: `applyAll('pending', ['pay', 'ship', 'deliver'])` → `'delivered'`; `applyAll('pending', [])` → `'pending'`; `applyAll('pending', ['pay', 'deliver'])` throws a message containing `Event 1 ("deliver")`.

What it practices: wrapping an error to add context without destroying the original — project 30's lesson applied to a loop.

Hint: `events.forEach((event, i) => ...)` gives you the index; rethrow with `new Error(message, { cause: err })`.

### ⭐⭐ 3. Are all the states reachable? (core)

The exhaustive test proves every transition *target* exists. It does not prove the reverse: a state can be defined in `TRANSITIONS`, spelled correctly, and simply unreachable from `pending` — dead code that looks like a feature. Write `reachableStates(transitions, initial)` doing a breadth-first walk from the initial state and returning a `Set`, then add a structural test asserting every key of `TRANSITIONS` is in it. Check offline: the set is all five states; add a `refunded: {}` row that nothing points at and your new test must fail.

What it practices: a second structural property of the rulebook — testing the table as *data*, not as behavior.

Hint: a `seen` Set plus a `queue` array. Pull with `queue.shift()`, and for each `Object.values(transitions[state] ?? {})` target, enqueue it only if it isn't already in `seen` — that check is also what stops cycles from looping forever.

### ⭐⭐ 4. An Order object with an audit trail (core)

The engine is a pure function over strings; real apps want an object that holds the current state. Write an `Order` class with a private `#state` starting at `INITIAL_STATE`, a `send(event)` method that transitions or throws, a `state` getter, an `allowedEvents` getter for the UI, and a `log` getter returning every accepted transition as `{ event, from, to }`. Crucially: a rejected event must leave the state *and* the log untouched. Check offline: after `pay` then `ship`, state is `'shipped'`, `allowedEvents` is `['deliver']`, `send('cancel')` throws, and the log still has exactly 2 entries with `log[0]` equal to `{ event: 'pay', from: 'pending', to: 'paid' }`.

What it practices: wrapping a pure core in a stateful shell, and putting the assignment *after* the throwing call so failures can't half-apply.

Hint: `this.#state = transition(from, event);` before `this.#log.push(...)` — if `transition` throws, the push never runs. Return `[...this.#log]` so callers can't edit your history.

### ⭐⭐⭐ 5. Promote the engine to a factory (challenge)

`transition` and `allowedEvents` both hard-code the module-level `TRANSITIONS`, so the engine can only ever run one machine. Write `createMachine({ initial, transitions })` returning an object with `initial`, `states`, `transition(state, event)` and `allowedEvents(state)` — all closed over that machine's own table. Then rebuild the order machine as `createMachine({ initial: INITIAL_STATE, transitions: TRANSITIONS })` and prove the engine is genuinely reusable with a second, unrelated one: a door with `closed { open, lock }`, `opened { close }`, `locked { unlock }`. Check offline: `door.transition('closed', 'lock')` → `'locked'`; `door.transition('locked', 'open')` throws mentioning `allowed: unlock`; the rebuilt order machine still answers `transition('pending', 'pay')` → `'paid'`.

What it practices: the "promote the hard-coded thing to a parameter" move — the same step project 01 takes with FizzBuzz rules and project 04 with cipher shifts.

Hint: everything already reads `TRANSITIONS[...]`; the change is mechanical — take `transitions` as a parameter and return the functions from inside the factory so they capture it.

### ⭐⭐⭐ 6. Guards: rules that depend on data (challenge)

"Pay" shouldn't succeed if the customer underpaid, and "ship" shouldn't if the item is out of stock — conditions the table can't express today. Allow each entry to be *either* a target string (as now) or `{ target, guard }` where `guard(context)` returns a boolean, and write `transitionWith(table, state, event, context)` that honours both shapes. A blocked guard throws a message clearly different from an illegal-move message, because "not allowed here" and "not allowed *yet*" are different problems. Check offline: `pay` with `{ amountPaid: 50, total: 50 }` → `'paid'`, but `{ amountPaid: 10, total: 50 }` throws `blocked`; `cancel` (a plain string entry) still works with no context at all; the unmodified `TRANSITIONS` table still works through the new function.

What it practices: extending a data format so old data stays valid — the backwards-compatible upgrade every real config format needs.

Hint: normalize first, branch never twice: `const { target, guard } = typeof rule === 'string' ? { target: rule } : rule;` — after that one line the rest of the function doesn't care which shape it got.

## Solutions

### 1. canTransition

```js
export function canTransition(state, event) {
  return TRANSITIONS[state]?.[event] !== undefined;
}
```

```js
test('canTransition always agrees with allowedEvents', () => {
  for (const state of Object.keys(TRANSITIONS)) {
    for (const event of ['pay', 'ship', 'deliver', 'cancel', 'nonsense']) {
      assert.equal(canTransition(state, event), allowedEvents(state).includes(event));
    }
  }
  assert.equal(canTransition('banana', 'pay'), false);
});
```

WHY: the table is the single source of truth, so the question form and the command form can never disagree — and the cross-check test says so for all 25 combinations without listing one of them. Throwing is correct for `transition` (an illegal move is a caller bug) and wrong for `canTransition` (asking is never a bug), which is a distinction worth internalizing: exceptions are for things that shouldn't happen, not for answers. Verified by running: all 25 pairs agree, and the unknown state returns `false`.

### 2. applyAll

```js
export function applyAll(state, events) {
  let current = state;
  events.forEach((event, index) => {
    try {
      current = transition(current, event);
    } catch (err) {
      throw new Error(`Event ${index} ("${event}") failed: ${err.message}`, { cause: err });
    }
  });
  return current;
}
```

WHY: the machine's error already explains *what* is wrong ("Cannot deliver an order that is paid"); the index explains *where*, and you need both to debug a replay. `{ cause: err }` keeps the original error attached rather than flattening it to a string, so a caller can still inspect it programmatically — this is the standard error-wrapping shape and Node prints the cause chain automatically. The empty list returning the input unchanged is the identity case a fold should always satisfy. Verified by running: the happy path reaches `'delivered'`, and the bad replay throws `Event 1 ("deliver") failed: Cannot "deliver" an order that is paid (allowed: ship, cancel)`.

### 3. Reachability

```js
export function reachableStates(transitions, initial) {
  const seen = new Set([initial]);
  const queue = [initial];

  while (queue.length > 0) {
    const state = queue.shift();
    for (const target of Object.values(transitions[state] ?? {})) {
      if (!seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
  }
  return seen;
}
```

```js
test('EXHAUSTIVE: every defined state is reachable from the start', () => {
  const reachable = reachableStates(TRANSITIONS, INITIAL_STATE);
  for (const state of Object.keys(TRANSITIONS)) {
    assert.ok(reachable.has(state), `"${state}" is defined but unreachable from ${INITIAL_STATE}`);
  }
});
```

WHY: the existing exhaustive test checks arrows point at real states; this one checks real states have arrows pointing *at them*. Together they close the loop, and both are tests of the table rather than of any particular order — add a state tomorrow and they keep working. The `!seen.has(target)` guard does double duty: it avoids re-queuing work and it makes cyclic tables (a `refund` back to `pending`, say) terminate instead of spinning. Verified by running: all five states are reachable, and an added `refunded: {}` row that nothing targets is correctly reported as unreachable.

### 4. The Order class

```js
export class Order {
  #state = INITIAL_STATE;
  #log = [];

  get state() { return this.#state; }
  get allowedEvents() { return allowedEvents(this.#state); }
  get log() { return [...this.#log]; } // a copy — history is read-only

  send(event) {
    const from = this.#state;
    this.#state = transition(from, event); // throws => nothing below runs
    this.#log.push({ event, from, to: this.#state });
    return this.#state;
  }
}
```

WHY: the ordering inside `send` is the whole safety argument — because `transition` throws *before* the assignment completes and long before the log push, a rejected event cannot leave the object half-updated. That's only possible because the engine is a pure function that returns a value instead of a method that mutates. The `log` getter returns a copy for the same reason project 39's `timeline()` does: an audit trail a caller can edit is not an audit trail. Verified by running: the rejected `cancel` leaves state `'shipped'` and the log at 2 entries, and pushing onto the returned log array does not grow the real one.

### 5. createMachine

```js
export function createMachine({ initial, transitions }) {
  return {
    initial,
    states: Object.keys(transitions),
    allowedEvents: (state) => Object.keys(transitions[state] ?? {}),
    transition(state, event) {
      const next = transitions[state]?.[event];
      if (next === undefined) {
        const allowed = Object.keys(transitions[state] ?? {});
        throw new Error(
          `Cannot "${event}" from ${state}` +
          (allowed.length ? ` (allowed: ${allowed.join(', ')})` : ' (terminal state)'),
        );
      }
      return next;
    },
  };
}

export const orderMachine = createMachine({ initial: INITIAL_STATE, transitions: TRANSITIONS });

const door = createMachine({
  initial: 'closed',
  transitions: {
    closed: { open: 'opened', lock: 'locked' },
    opened: { close: 'closed' },
    locked: { unlock: 'closed' },
  },
});
```

WHY: nothing about `transition`'s logic was ever specific to orders — the only order-shaped thing in it was the name it reached for. Closing over `transitions` instead of reading a module global turns 15 lines into a library: the door machine gets legal-move checking, terminal-state detection and helpful errors for free, and so does the next machine you write. The generic error wording ("from closed" rather than "an order that is closed") is the small price; a `label` option could buy it back. Verified by running: the door rejects `open` while locked with `allowed: unlock`, rejects `lock` while open, and the rebuilt order machine behaves exactly as before.

### 6. Guards

```js
export const GUARDED_TRANSITIONS = {
  pending: {
    pay: { target: 'paid', guard: (ctx) => ctx.amountPaid >= ctx.total },
    cancel: 'cancelled', // plain string entries still allowed
  },
  paid: {
    ship: { target: 'shipped', guard: (ctx) => ctx.inStock },
    cancel: 'cancelled',
  },
  shipped: { deliver: 'delivered' },
  delivered: {},
  cancelled: {},
};

export function transitionWith(table, state, event, context = {}) {
  const rule = table[state]?.[event];
  if (rule === undefined) {
    const allowed = Object.keys(table[state] ?? {});
    throw new Error(
      `Cannot "${event}" an order that is ${state}` +
      (allowed.length ? ` (allowed: ${allowed.join(', ')})` : ' (terminal state)'),
    );
  }

  // Normalize the two shapes once; everything below is shape-agnostic.
  const { target, guard } = typeof rule === 'string' ? { target: rule } : rule;

  if (guard && !guard(context)) {
    throw new Error(`"${event}" is blocked from ${state}: its condition is not met`);
  }
  return target;
}
```

WHY: two distinct errors for two distinct situations is the design decision that makes this useful — "you cannot ship a cancelled order" is a permanent fact about the machine, while "you cannot ship yet, it's out of stock" is temporary and the UI should say so differently. Normalizing the rule shape in one line means the rest of the function, and the exhaustive table test (which becomes `typeof rule === 'string' ? rule : rule.target`), never branches again. Because a bare string is still valid, the untouched `TRANSITIONS` table works through the new engine with no migration at all. Verified by running: exact payment passes, underpayment is blocked, the string-shaped `cancel` works with no context, terminal states still throw the old message, and the original table runs unchanged.
