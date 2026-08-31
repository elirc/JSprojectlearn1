# 🏋️ Practice: Async Event Emitter

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Exercises 1, 4 and 5 need only the public API — import `AsyncEmitter` from `refactored/async-emitter.js` in a scratch file. Exercises 2 and 3 add methods to the class, so work in a *copy* of `async-emitter.js`. Everything runs offline with `node --test` or plain `node`.

## Exercises

### ⭐ 1. Pin down `once` (warm-up)

`once` exists in the class but no test targets it directly (only `waitFor` uses it). Write a test proving both halves of its contract: the listener fires exactly one time across two emits, and it detaches itself — `listenerCount` drops back to 0.

What it practices: reading a small wrapper (`once` is built on `on`) and testing its whole contract, not just the happy path.
Expected: after two `emitAsync('ping')` calls, the counter is `1` and `listenerCount('ping')` is `0`.
Hint: `once` calls `off()` *before* running your listener. Would swapping those two lines change your test's result if the listener re-emits?

### ⭐⭐ 2. `eventNames()` — what is anyone listening to?

Add an `eventNames()` method returning an array of event names that currently have **at least one** listener. Careful: when the last listener unsubscribes, its `Set` stays in the map with size 0 — an empty event must not be reported.

What it practices: interrogating the `Map`-of-`Set`s data structure, and the difference between "key exists" and "key has members".
Expected: subscribe to `'message'` and `'status'` under one `AbortController`; `eventNames()` is `['message', 'status']`; after `abort()` it is `[]`.
Hint: `[...this.#listeners]` gives `[event, set]` pairs — filter, then map.

### ⭐⭐ 3. `emitSerial` — one listener at a time

`emitAsync` starts all listeners at once (their awaits interleave). Add `emitSerial(event, ...args)`: awaits each listener **to completion before starting the next**, in registration order — for handlers that must not overlap, like writes to one file. Keep the failure policy: every listener still runs, failures are collected into one `AggregateError`.

What it practices: sequential-vs-parallel async iteration under the same error contract.
Expected: listener A awaits 30 ms then logs `'A'`; listener B logs `'B'` immediately. `emitSerial` → log is `['A', 'B']`; `emitAsync` (same setup) → `['B', 'A']`.
Hint: a `for...of` with `try { await fn(...args) } catch { failures.push(...) }` — no `Promise.allSettled` needed.

### ⭐⭐ 4. `waitForMatch` — wait for the *right* event

`waitFor` resolves on the next event, whatever its payload. Write `waitForMatch(event, predicate, { timeoutMs })`: keeps listening past payloads the predicate rejects, resolves with the first one it accepts, and cleans up its listener on success *and* on timeout. Chat scenario: wait for the message addressed to *you*, not just any message.

What it practices: composing `on` + a promise by hand — `once` can't do this, because a rejected payload must keep the subscription alive.
Expected: emit `{ to: 'bob' }` then `{ to: 'me' }` → resolves with `{ to: 'me' }`; `listenerCount` is 0 afterward; with `timeoutMs: 50` and no match it rejects after ~50 ms, count 0 again.
Hint: use `on` (not `once`); call `off()` only inside the branch where the predicate passes, and in the timeout.

### ⭐⭐⭐ 5. `waitForAny` — first of several events wins

Real connects finish with `'connected'` *or* `'error'` — awaiting only one risks waiting forever. Write `waitForAny(events, { timeoutMs })` resolving with `[eventName, payload]` for whichever fires first. The hard part is cleanup: when one event wins (or the timeout fires), the listeners on **all the other events** must detach too.

What it practices: multi-listener lifecycles — N subscriptions, one settlement, zero leaks (the whole point of this project).
Expected: `waitForAny(['connected', 'error'])`, then `emitAsync('error', 'boom')` → resolves `['error', 'boom']`; `listenerCount` is 0 for *both* events; the timeout path also leaves both at 0.
Hint: collect every unsubscribe fn in an array; write one `cleanup()` that clears the timer and calls them all; call it in every exit path.

## Solutions

### 1. `once` contract

```js
test('once fires exactly once and detaches itself', async () => {
  const bus = new AsyncEmitter();
  let calls = 0;
  bus.once('ping', () => { calls++; });
  await bus.emitAsync('ping');
  await bus.emitAsync('ping');
  assert.equal(calls, 1);
  assert.equal(bus.listenerCount('ping'), 0);
});
```

WHY: subscriptions are resources, and `once` is the smallest self-cleaning one — the test pins both that it delivered and that it *released*. The detach-before-run order inside `once` matters: if the listener itself emits the same event, the already-removed listener can't re-fire.

### 2. `eventNames()`

```js
eventNames() {
  return [...this.#listeners]
    .filter(([, set]) => set.size > 0)
    .map(([event]) => event);
}
```

```js
test('eventNames reports only events with live listeners', () => {
  const bus = new AsyncEmitter();
  const session = new AbortController();
  bus.on('message', () => {}, { signal: session.signal });
  bus.on('status', () => {}, { signal: session.signal });
  assert.deepEqual(bus.eventNames().sort(), ['message', 'status']);
  session.abort();
  assert.deepEqual(bus.eventNames(), []);
});
```

WHY: `off` deletes the listener from its `Set` but leaves the empty `Set` in the map, so "has the key" and "has listeners" genuinely differ — the filter on `set.size > 0` is the exercise. A debugging method like this is also the natural companion to the leak smoke-alarm: it shows *what* is leaking.

### 3. `emitSerial`

```js
async emitSerial(event, ...args) {
  const listeners = [...(this.#listeners.get(event) ?? [])];
  const failures = [];
  for (const fn of listeners) {
    try { await fn(...args); } catch (err) { failures.push(err); }
  }
  if (failures.length > 0) {
    throw new AggregateError(failures, `${failures.length} listener(s) failed for "${event}"`);
  }
  return listeners.length;
}
```

```js
test('emitSerial runs listeners one at a time, in order', async () => {
  const bus = new AsyncEmitter();
  const log = [];
  bus.on('save', async () => {
    await new Promise((r) => setTimeout(r, 30));
    log.push('A');
  });
  bus.on('save', () => { log.push('B'); });
  await bus.emitSerial('save');
  assert.deepEqual(log, ['A', 'B']); // emitAsync would give ['B', 'A']
});
```

WHY: `emitAsync` maps all listeners into promises up front, so they interleave; the sequential `for...of` awaits each before starting the next — the classic parallel-vs-serial fork in async code. The error policy is unchanged on purpose: every listener still gets its delivery and failures surface together, so callers switching between the two methods only change *timing*, never error behavior.

### 4. `waitForMatch`

```js
waitForMatch(event, predicate, { timeoutMs } = {}) {
  return new Promise((resolve, reject) => {
    let timer;
    const off = this.on(event, (...args) => {
      const value = args.length <= 1 ? args[0] : args;
      if (!predicate(value)) return; // not ours — stay subscribed
      clearTimeout(timer);
      off();
      resolve(value);
    });
    if (timeoutMs !== undefined) {
      timer = setTimeout(() => {
        off();
        reject(new Error(`Timed out after ${timeoutMs}ms waiting for matching "${event}"`));
      }, timeoutMs);
    }
  });
}
```

```js
test('waitForMatch skips non-matching payloads and cleans up', async () => {
  const bus = new AsyncEmitter();
  const wait = bus.waitForMatch('message', (m) => m.to === 'me');
  await bus.emitAsync('message', { to: 'bob' });
  await bus.emitAsync('message', { to: 'me' });
  assert.deepEqual(await wait, { to: 'me' });
  assert.equal(bus.listenerCount('message'), 0);
});
```

WHY: `once` detaches after the first delivery, but here the first delivery may be the wrong one — so the subscription must survive rejections and end itself only on match or timeout. Every exit path (match, timeout) both clears the timer and unsubscribes: that pairing is the resource-lifecycle discipline the README calls "every `on` needs an owner who guarantees the matching `off`".

### 5. `waitForAny`

```js
waitForAny(events, { timeoutMs } = {}) {
  return new Promise((resolve, reject) => {
    let timer;
    const offs = [];
    const cleanup = () => {
      clearTimeout(timer);
      for (const off of offs) off();
    };
    for (const event of events) {
      offs.push(this.on(event, (...args) => {
        cleanup();
        resolve([event, args.length <= 1 ? args[0] : args]);
      }));
    }
    if (timeoutMs !== undefined) {
      timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out after ${timeoutMs}ms waiting for any of: ${events.join(', ')}`));
      }, timeoutMs);
    }
  });
}
```

```js
test('waitForAny settles on the first event and detaches ALL listeners', async () => {
  const bus = new AsyncEmitter();
  const wait = bus.waitForAny(['connected', 'error']);
  await bus.emitAsync('error', 'boom');
  assert.deepEqual(await wait, ['error', 'boom']);
  assert.equal(bus.listenerCount('connected'), 0); // the loser detached too
  assert.equal(bus.listenerCount('error'), 0);
});
```

WHY: one settlement owns N subscriptions, so the win/timeout handler must tear down all of them — forgetting the *losing* listeners is exactly the reconnect leak from the original, in miniature. Funnelling every exit through one `cleanup()` is the same move as tying a session's subscriptions to one `AbortController`: many resources, one owner, one release point. (The promise can't double-settle: `resolve` after `reject` — or a second `resolve` — is ignored by promise semantics, but cleanup still must run exactly once for the counts to hit zero.)
