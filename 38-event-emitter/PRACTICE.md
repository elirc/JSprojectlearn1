# 🏋️ Practice: Event Emitter

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Three untested promises (warm-up)

Add one test to `emitter.test.js` covering three things the suite never checks. First: `once` returns an unsubscribe function too, so calling it *before* any emit means the listener never fires at all. Second: calling an unsubscribe function twice is harmless — no crash, no error. Third: `emit` returns the number of listeners it delivered to, so a `once` listener's first emit returns `1` and the second returns `0`.

What it practices: reading the contract in the class comment and turning each promise into an assertion.

Hint: `const off = emitter.once('ping', fn); off();` then `assert.equal(emitter.emit('ping'), 0)`. The double-`off` case works because of the `?.` in `this.#listeners.get(event)?.delete(listener)`.

### ⭐⭐ 2. off() and removeAllListeners() (core)

The closure-based unsubscribe is elegant, but sometimes the caller genuinely has the function in hand and no handle — so add `off(event, listener)` returning `true` if something was removed and `false` if not, plus `removeAllListeners(event)` that clears one event (or every event when called with no argument). Then rewrite `on`'s returned closure to call `this.off(event, listener)` so there's one removal path, not two. Check offline: subscribing `a` and `b` to `'tick'`, then `off('tick', a)` → `true`, a second `off('tick', a)` → `false`, and emitting logs only `b`.

What it practices: adding a public door without duplicating the logic behind it.

Hint: `const set = this.#listeners.get(event); if (!set) return false; return set.delete(listener);` — `Set.delete` already returns the boolean you want.

### ⭐⭐ 3. The leak nobody noticed (core)

`#listeners` never shrinks. Subscribe to `'tick'`, unsubscribe, and the Map still holds a `'tick'` key pointing at an empty Set — do that for a million short-lived event names and you have a slow memory leak. Add `eventNames()` returning the currently-subscribed event names so the leak is *observable*, write a test that fails today, then make removal delete the key when its Set becomes empty. Check offline: after `on('tick', fn)` then `off()`, `eventNames()` must be `[]`; and after a `once` listener fires, `eventNames()` must be `[]` too.

What it practices: finding the bug that only shows up in production, and building the observability that makes it testable.

Hint: build on exercise 2 — put the cleanup inside `off`: `if (set.size === 0) this.#listeners.delete(event);`. It's safe during `emit` because `emit` iterates over a copy.

### ⭐⭐ 4. waitFor — bridge events into async/await (core)

Write `waitFor(event)` returning a Promise that resolves with the first emitted argument (or the array of arguments when there are several). This is the adapter that lets event-driven code be awaited: `const conn = await emitter.waitFor('ready')`. Check offline in an async test: schedule `setTimeout(() => emitter.emit('ready', 'db'), 5)`, then `assert.equal(await emitter.waitFor('ready'), 'db')`. Also assert `eventNames()` is `[]` afterwards — waiting must not leak a listener.

What it practices: converting a callback API into a promise API, the single most common piece of glue in real JavaScript.

Hint: `return new Promise((resolve) => this.once(event, (...args) => resolve(args.length > 1 ? args : args[0])));` — `once` gives you the cleanup for free.

### ⭐⭐⭐ 5. The 'error' event convention (challenge)

Node's emitters have a rule: a special `'error'` event is where failures go. Adopt it — when listeners throw during `emit`, check whether anyone is listening to `'error'`; if so, deliver each failure there as `(err, sourceEvent)` and *don't* throw the AggregateError; if nobody is listening, throw as today. Beware the trap: a throwing `'error'` listener must not recurse forever. Check offline: with an `'error'` listener registered, emitting `'save'` where one listener throws does *not* throw, the other listeners still ran, and the error listener saw `('disk full', 'save')`; remove the error listener and the AggregateError comes back.

What it practices: making a policy decision explicit and defending the recursive edge that the naive version falls into.

Hint: guard with `if (event !== 'error' && this.listenerCount('error') > 0)`. That single condition means failures *inside* an error delivery always throw instead of looping.

### ⭐⭐⭐ 6. onAny — a firehose for logging (challenge)

Add `onAny(listener)`: the listener receives `(eventName, ...args)` for *every* emit, and gets its own unsubscribe function. This is how devtools panels and audit logs are built. Nail down the ordering: normal listeners for the event run first, any-listeners after, and an any-listener that throws is collected into the same failure list as everyone else. Check offline: with an any-listener and a `'tick'` listener registered, `emit('tick', 1)` then `emit('silence')` then unsubscribing the any-listener then `emit('tick', 2)` produces the log `['tick-listener', ['tick', 1], ['silence'], 'tick-listener']`.

What it practices: extending a delivery loop while keeping every existing guarantee (copy-before-iterate, isolation, loud reporting) intact.

Hint: a second private field, `#anyListeners = new Set()`, and a second loop in `emit` — copy it before iterating for the same reason as the first.

## Solutions

### 1. Three untested promises

```js
test('once also hands back an unsubscribe, and unsubscribing twice is safe', () => {
  const emitter = new EventEmitter();
  let calls = 0;
  const off = emitter.once('ping', () => calls++);
  off();
  assert.equal(emitter.emit('ping'), 0); // nobody left to deliver to
  assert.equal(calls, 0);

  assert.doesNotThrow(() => off()); // second off(): the ?. absorbs it
  assert.equal(emitter.listenerCount('never-used'), 0);
});

test('emit reports how many listeners it delivered to', () => {
  const emitter = new EventEmitter();
  emitter.once('x', () => {});
  assert.equal(emitter.emit('x'), 1);
  assert.equal(emitter.emit('x'), 0); // the once-listener detached itself
});
```

WHY: `once` is implemented *in terms of* `on`, so it inherits the unsubscribe handle automatically — a nice consequence of building the small piece first. The double-`off` safety comes from the `?.` in `this.#listeners.get(event)?.delete(listener)`; without it the second call would crash on an undefined Set. Verified by running: all assertions pass against the unmodified emitter.

### 2. off() and removeAllListeners()

```js
on(event, listener) {
  if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
  this.#listeners.get(event).add(listener);
  return () => this.off(event, listener); // one removal path
}

off(event, listener) {
  const set = this.#listeners.get(event);
  if (!set) return false;
  return set.delete(listener);
}

removeAllListeners(event) {
  if (event === undefined) this.#listeners.clear();
  else this.#listeners.delete(event);
}
```

WHY: routing the closure through `this.off` means any future change to removal — like exercise 3's cleanup — happens in exactly one place, which is the whole reason the class exists instead of two loose functions. `Set.delete` already answers "was it there?", so the boolean costs nothing. `removeAllListeners()` with no argument is the teardown hook a test suite calls between cases; separating "one event" from "everything" by checking `undefined` keeps both honest. Verified by running: `off` → `true` then `false`, and only `b` fires afterwards.

### 3. eventNames() and the leak

```js
eventNames() {
  return [...this.#listeners.keys()];
}

off(event, listener) {
  const set = this.#listeners.get(event);
  if (!set) return false;
  const removed = set.delete(listener);
  if (set.size === 0) this.#listeners.delete(event); // don't keep empty Sets
  return removed;
}
```

```js
test('unsubscribing the last listener forgets the event entirely', () => {
  const emitter = new EventEmitter();
  const off = emitter.on('tick', () => {});
  assert.deepEqual(emitter.eventNames(), ['tick']);
  off();
  assert.deepEqual(emitter.eventNames(), []); // fails before the fix
});
```

WHY: this is a leak you cannot see with the original public API — `listenerCount('tick')` reported `0` both before and after the fix, which is why the bug survived a whole test suite. Adding `eventNames()` is not a feature so much as an *instrument*, the same move as project 44's request counter. The cleanup is safe during `emit` because `emit` snapshots `[...set]` into an array before the loop, so deleting the Map key mid-delivery can't disturb the round in progress. Verified by running: `eventNames()` is `[]` after an unsubscribe and after a `once` fires.

### 4. waitFor

```js
waitFor(event) {
  return new Promise((resolve) => {
    this.once(event, (...args) => resolve(args.length > 1 ? args : args[0]));
  });
}
```

```js
test('waitFor turns the next emit into an awaited value', async () => {
  const emitter = new EventEmitter();
  setTimeout(() => emitter.emit('ready', 'db'), 5);
  assert.equal(await emitter.waitFor('ready'), 'db');
  assert.deepEqual(emitter.eventNames(), []); // no listener left behind
});
```

WHY: `once` does all the hard work — subscribe, fire, detach — so `waitFor` is three lines and leaks nothing, which is exactly why the small primitive was worth building first. The `args.length > 1` branch is a judgement call: most events carry one payload and `await` reads much better without unwrapping an array, but multi-argument events shouldn't silently lose data. Note what this *cannot* do: if the event already fired before you called `waitFor`, you wait forever — pair it with project 43's `withTimeout` in real code. Verified by running: resolves to `'db'`, multi-arg resolves to `[1, 2]`, and `eventNames()` is empty afterwards.

### 5. The 'error' event convention

```js
emit(event, ...args) {
  const listeners = [...(this.#listeners.get(event) ?? [])];
  const failures = [];

  for (const listener of listeners) {
    try { listener(...args); } catch (err) { failures.push(err); }
  }

  if (failures.length > 0) {
    // Route failures to 'error' listeners if there are any — but NEVER
    // when we are already delivering 'error', or a broken error handler
    // would call itself forever.
    if (event !== 'error' && this.listenerCount('error') > 0) {
      for (const err of failures) this.emit('error', err, event);
      return listeners.length;
    }
    throw new AggregateError(failures, `${failures.length} listener(s) failed for "${event}"`);
  }
  return listeners.length;
}
```

WHY: throwing an AggregateError is the right *default* — silence is the enemy — but it forces every caller of `emit` into a try/catch, which is miserable in an app with a hundred emit sites. The `'error'` event moves the handling to one place, subscribed once at startup, while keeping the "nobody is listening ⇒ explode loudly" fallback. The `event !== 'error'` half of the guard is the whole difficulty: without it, an error handler that itself throws re-enters `emit('error')` forever and blows the stack. With it, a broken error handler is the one case that still throws — which is correct, because there's nobody left to tell. Verified by running: with an error listener the save emit doesn't throw and both other listeners still ran; without one the AggregateError returns; a throwing error listener throws once instead of recursing.

### 6. onAny

```js
#anyListeners = new Set();

onAny(listener) {
  this.#anyListeners.add(listener);
  return () => this.#anyListeners.delete(listener);
}

// inside emit, after the normal delivery loop:
for (const listener of [...this.#anyListeners]) {
  try { listener(event, ...args); } catch (err) { failures.push(err); }
}
```

WHY: every rule the normal loop follows applies here too — copy before iterating (an any-listener may unsubscribe itself), try/catch per listener, failures into the same array so one broken logger can't silence the app. Any-listeners run *after* the specific ones so that a logger records what the real handlers already saw, and `emit`'s return value still counts only the specific listeners, because "how many handlers care about this event" shouldn't change just because a debug panel is open. Verified by running: the log comes out `['tick-listener', ['tick', 1], ['silence'], 'tick-listener']`, including delivery for `'silence'`, an event with no listeners of its own.
