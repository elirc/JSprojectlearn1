# 📘 Learning Guide: Async Event Emitter

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

An **event emitter**: an object that lets one part of a program announce "something happened!" and any number of other parts react to it, without either side knowing about the other. Think of it as a bulletin board — some code pins up a note ("message arrived"), and everyone who signed up for that kind of note gets called.

The original file simulates a chat app that reconnects. Run `node original.js` and you'd see something like:

```
message listeners after 3 reconnects: 3     <- should be 1!
sent: hello                                  <- after ~3 wasteful polls
emit('save') returned before the save even ran
[10ms later the whole process crashes with an unhandled rejection]
```

The refactored `AsyncEmitter` fixes all three problems: you can *await* an event, clean up whole groups of subscriptions in one call, and async listener failures are collected instead of crashing the process.

## 2. Concepts you need first

### Events, listeners, emit

A **listener** (or handler) is a function you register to run when a named event fires. **Emitting** is firing the event. A minimal emitter is just a map from names to arrays of functions:

```js
const listeners = { greet: [] };
listeners.greet.push((name) => console.log("hi", name)); // subscribe
listeners.greet.forEach((fn) => fn("Ada"));              // emit
// prints: hi Ada
```

**Subscribing** = adding your function. **Unsubscribing** = removing it so it stops being called.

### Callbacks and closures

A **callback** is any function you hand to other code to call later. A **closure** is a function that remembers the variables around it when it was created:

```js
function makeSession(id) {
  const data = { id };                    // captured by the closure below
  return () => console.log("session", data.id);
}
const fn = makeSession(7);
fn(); // session 7  — `data` is kept alive as long as `fn` exists
```

That "kept alive" part matters: if an emitter still holds your listener, the listener holds its closure, and everything the closure references can never be garbage-collected (freed from memory). That's a **memory leak** — memory your program can never get back.

### Promises, async/await

A **Promise** is an object standing in for a value that arrives later. It either **resolves** (succeeds with a value) or **rejects** (fails with an error). `async` functions return promises; `await` pauses that function until a promise settles.

```js
const p = new Promise((resolve) => setTimeout(() => resolve("done"), 100));
console.log(await p); // done   (printed after ~100ms)
```

An **unhandled rejection** is a rejected promise nobody ever attached error-handling to. In Node, it crashes the whole process — often long after, and far away from, the code that caused it.

### Timers: setTimeout

`setTimeout(fn, ms)` runs `fn` once after roughly `ms` milliseconds, without blocking anything:

```js
setTimeout(() => console.log("later"), 50);
console.log("now");
// prints: now, then (after ~50ms) later
```

### Polling — asking "are we there yet?" in a loop

**Polling** means repeatedly checking a condition on a timer instead of being notified. It's wasteful (checks that find nothing), laggy (you learn the answer up to one interval late), and dangerous (if the answer never comes, you loop forever).

### AbortController and AbortSignal

Built into JavaScript: an **AbortController** is a little remote control with one button, `abort()`. Its `.signal` (an **AbortSignal**) can be handed to many operations; when you press the button, everything holding that signal gets told to stop.

```js
const ac = new AbortController();
ac.signal.addEventListener("abort", () => console.log("stopped!"));
console.log(ac.signal.aborted); // false
ac.abort();                     // prints: stopped!
console.log(ac.signal.aborted); // true
```

One press can cancel *many* things at once — that's the superpower this project uses.

### Promise.allSettled and AggregateError

`Promise.all` fails fast: one rejection and you lose track of the rest. `Promise.allSettled` waits for *every* promise and reports each outcome:

```js
const results = await Promise.allSettled([
  Promise.resolve("ok"),
  Promise.reject(new Error("bad")),
]);
console.log(results.map((r) => r.status)); // [ 'fulfilled', 'rejected' ]
```

An **AggregateError** is one error object that carries a list of errors inside it (`err.errors`) — perfect for "3 listeners failed, here are all 3 reasons."

### Map and Set

A **Map** stores key → value pairs (here: event name → its listeners). A **Set** stores unique values with fast add/delete (here: the listeners themselves).

```js
const m = new Map();
m.set("msg", new Set());
m.get("msg").add(() => {});
console.log(m.get("msg").size); // 1
```

## 3. Walking through the original code

The original imports a perfectly good *synchronous* emitter from project 38 and shows three ways it breaks down in an async app.

**Failure 1 — polling for an event:**

```js
var connected = false;
bus.on("connected", function () { connected = true; });

async function sendWhenConnected(msg) {
  while (!connected) {
    await new Promise(function (r) { setTimeout(r, 100); });
  }
  console.log("sent:", msg);
}
```

There's no way to *await* an event, so the code sets a flag and spin-checks it every 100ms. It works — up to 100ms late, burning wakeups, and if `"connected"` never fires it loops until the heat death of the laptop.

**Failure 2 — the forgotten unsubscribe:**

```js
function startSession(sessionId) {
  var sessionData = { id: sessionId, buffer: [] }; // retained forever
  bus.on("message", function (m) {
    sessionData.buffer.push(m);
  });
}
```

Each reconnect subscribes a new handler and never removes the old one. Project 38's emitter *does* return an unsubscribe function — but nobody kept it. After 3 reconnects, `listenerCount("message")` is 3; every incoming message is processed by two dead sessions plus the live one, and each dead session's `sessionData` is pinned in memory by its closure.

**Failure 3 — fire-and-forget async listeners:**

```js
bus.on("save", async function (doc) {
  await new Promise(function (r) { setTimeout(r, 10); });
  if (!doc.title) throw new Error("untitled docs are unsaveable");
});
```

The emitter calls listeners synchronously and ignores what they return. An async listener returns a promise — ignored. So `emit("save", {})` returns immediately ("returned before the save even ran"), and 10ms later the throw becomes an unhandled rejection that kills the process, with a stack trace pointing nowhere near the `emit` call.

## 4. What's wrong with it (in beginner terms)

**Polling wastes time and can hang forever.** Story: your app polls for `"connected"` every 100ms. In testing, connection takes 250ms — fine, three polls. In production one day the server never sends the event. Your function polls silently forever; the user stares at a spinner; no error, no log, no timeout. A hang is worse than an error, because an error at least tells you where to look.

**Leaked listeners = duplicates + growing memory.** Story: a user with flaky wifi reconnects 50 times during a train ride. Now every chat message is processed 50 times — 50 pushes into 50 buffers, maybe 50 notification sounds. Meanwhile all 50 dead session objects sit in memory forever. The app gets slower and weirder the longer it runs, and restarting "fixes" it — the classic leak signature.

**Fire-and-forget rejections crash you at 2am.** Story: a save fails validation at night. The rejection isn't caught anywhere (nobody had a handle on the promise), so Node kills the process. The crash log shows a timer internals stack trace — nothing about which emit, which document, or which listener. You get paged and have almost nothing to go on.

## 5. Try it yourself first!

Try designing the fix before reading section 6. Hints, vague to specific:

1. What if waiting for an event gave you back something you could `await`? What built-in object represents "a value that arrives later"?
2. For the leak: the real problem isn't that unsubscribing is impossible — it's that you must *remember N handles*. Is there a built-in object where one `abort()` cancels many things at once?
3. For async listeners: the emitter ignores return values. What do async functions return, and what could `emit` do with a whole array of those?
4. `waitFor(event)` = a promise whose `resolve` is subscribed via `once`. Add a `setTimeout` that rejects and unsubscribes if the event takes too long.
5. `emitAsync` = collect `listeners.map(async fn => fn(...args))`, `await Promise.allSettled(...)`, gather rejected reasons, and throw one `AggregateError` if any failed. The `async` wrapper turns even *synchronous* throws into rejections, so both kinds are handled identically.

## 6. Understanding the refactored solution

**`on(event, listener, { signal })` — group cleanup.** Subscribing still returns an unsubscribe function (old contract kept), but now also accepts an AbortSignal:

```js
if (signal?.aborted) return () => {};
...
signal?.addEventListener('abort', off, { once: true });
```

If the signal is *already* aborted, it never subscribes at all (subscribing to a dead session makes no sense). Otherwise, aborting calls `off` automatically. `?.` is **optional chaining**: "if `signal` is undefined, do nothing instead of crashing." `{ once: true }` makes the abort-listener self-remove — and `off` also removes itself from the signal, so the cleanup code doesn't itself leak. Now one `AbortController` per session owns *all* its subscriptions: reconnect = `abort()` the old controller, make a new one. The test runs 50 reconnects and ends with exactly 1 listener.

**The leak smoke-alarm.** If one event's listener count passes `maxListeners`, the emitter warns *once*, naming the event — because a climbing count almost always means a setup path that re-runs without teardown. The warning function is passed in through the constructor (`warn = console.warn`), a technique called **dependency injection**: tests inject their own `warn` that pushes into an array, so even the warning behavior is verified without spamming the console.

**`waitFor(event, { timeoutMs, signal })` — events you can await.** It wraps `once` in a promise: the next occurrence resolves it. The polling loop becomes one line: `await bus.waitFor("connected")`. With `timeoutMs` set, a timer rejects with a clear message and — importantly — *unsubscribes* the waiting listener, so even the failure path cleans up. Pass a signal and aborting rejects the wait too. "Event never comes" is now a catchable error, not an infinite hang.

**`emitAsync` — deliveries you can trust.**

```js
const results = await Promise.allSettled(
  listeners.map(async (fn) => fn(...args)),
);
```

Every listener runs; the `async` wrapper converts sync throws into rejections so both failure styles are treated the same. Then all failures are thrown together as one `AggregateError`. Two guarantees at once: **isolation** (one bad listener never blocks the others — a test proves the second listener still ran) and **no swallowing** (every failure reaches the caller, attached to the emit that caused it — no more 2am mystery crashes).

**How the tests work.** Node's built-in runner: `test("name", fn)` plus `assert`. `assert.deepEqual` compares structures; `assert.rejects(fn, matcher)` asserts a promise rejects the expected way. Highlights: the reconnect test rebuilds the original's bug with the fix applied (50 sessions → 1 listener, zero warnings); the ordering test proves `await bus.emitAsync("save")` really finishes the save *before* the next line runs (`['saved', 'after emit']` — the original produced the reverse); the failure test registers two throwing listeners and one good one, then checks the good one ran *and* the AggregateError contains exactly 2 errors.

## 7. Words you learned (glossary)

- **Event emitter** — an object where code subscribes to named events and other code fires them.
- **Listener / handler** — a function registered to run when an event fires.
- **Emit** — fire an event, calling all its listeners.
- **Subscribe / unsubscribe** — add / remove a listener.
- **Callback** — a function handed to other code to be called later.
- **Closure** — a function that keeps access to the variables where it was created.
- **Garbage collection** — the runtime automatically freeing memory nothing references anymore.
- **Memory leak** — memory that can never be freed because something (like a forgotten listener) still references it.
- **Promise** — an object representing a future value; it resolves (success) or rejects (failure).
- **async/await** — syntax for writing promise-based code; `await` pauses the function until a promise settles.
- **Unhandled rejection** — a rejected promise with no error handler; crashes Node.
- **Polling** — repeatedly checking for a condition on a timer instead of being notified.
- **setTimeout** — run a function once after a delay, without blocking.
- **AbortController / AbortSignal** — a built-in cancel button (`abort()`) and the signal object many operations can share.
- **Optional chaining (`?.`)** — access a property or call a method only if the thing isn't null/undefined.
- **Promise.allSettled** — wait for all promises and report each one's outcome, never failing fast.
- **AggregateError** — one error carrying a list of underlying errors in `.errors`.
- **Isolation** — one listener's failure not affecting the others.
- **Dependency injection** — passing a dependency (like the `warn` function) in from outside so it can be swapped in tests.
- **Map / Set** — built-in collections: key→value pairs, and unique values.

## 8. Experiments to try on the plane (no internet needed)

Everything here is offline — the "chat client" is fake, no network involved. Work in scratch files; don't edit the project files.

1. **Feel the polling lag.** In a scratch file importing `AsyncEmitter`, record `Date.now()`, `setTimeout(() => bus.emitAsync("go"), 250)`, then `await bus.waitFor("go")` and print the elapsed time — expect ~250ms. Now rebuild the original's flag-plus-100ms-poll-loop version: expect ~300ms (the event lands mid-sleep and you wait out the interval).
2. **Trigger the smoke alarm.** `new AsyncEmitter({ maxListeners: 3 })`, then subscribe 10 listeners to `"data"` in a loop. Expected: exactly ONE console warning naming `"data"` — not seven.
3. **Make waitFor time out.** `await bus.waitFor("never", { timeoutMs: 50 })` inside try/catch. Expected: after ~50ms, catch prints `Timed out after 50ms waiting for "never"`, and `bus.listenerCount("never")` is 0 — the failed wait cleaned up after itself.
4. **Catch an AggregateError.** Register two listeners on `"boom"` that throw different messages and one that pushes to an array. `try { await bus.emitAsync("boom") } catch (err) { ... }`. Expected: the array got its push, `err.errors.length` is 2, and `err.errors.map(e => e.message)` shows both messages.
5. **Break the fix to feel it.** Copy the reconnect test's `startSession` into a scratch file but delete the `current?.abort()` line. Run 50 sessions: `listenerCount("message")` is 50 and (with `maxListeners: 10`) the leak warning fires. Restore the line: count 1, no warning.
