# 📘 Learning Guide: Promise Implementation From Scratch

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

We're building our own version of JavaScript's built-in `Promise` — the object behind every `await`, every `.then`, every `fetch`. Not to replace it, but because building one is the single best way to stop finding async JavaScript mysterious.

When it's done, this works exactly like the real thing:

```js
new MyPromise((resolve) => setTimeout(() => resolve(42), 100))
  .then((v) => v + 1)
  .then((v) => console.log("got", v));   // prints: got 43  (after ~100ms)
```

The original file is the naive "it's just a callback holder" version. Run `node original.js` and you see:

```
got 42
```

...and the line that should print `this NEVER prints: early` never appears. That silent nothing is the bug that motivates the whole project.

## 2. Concepts you need first

### What a promise is for

JavaScript runs one thing at a time. Slow work (timers, files, network) is started, and the result arrives *later*. A **promise** is an object that stands in for that future result. You attach functions to it ("when the value arrives, do this"), instead of waiting around.

```js
const p = new Promise((resolve) => setTimeout(() => resolve("hi"), 50));
p.then((v) => console.log(v));  // prints: hi   (after ~50ms)
console.log("this prints first");
```

### The executor, resolve, and reject

The function you pass to `new Promise(...)` is called the **executor**. It receives two functions: `resolve(value)` to report success, `reject(reason)` to report failure. **Settling** means either one happening; a settled promise is either **fulfilled** (succeeded with a value) or **rejected** (failed with a reason). Before that it's **pending**.

```js
new Promise((resolve, reject) => {
  if (Math.random() > 0.5) resolve("win");
  else reject(new Error("lose"));
}).then((v) => console.log(v), (e) => console.log(e.message));
```

### A state machine

A **state machine** is anything that is always in exactly one named state, with strict rules about which moves are allowed. A promise is a tiny one:

```
pending --> fulfilled(value)     allowed, once
pending --> rejected(reason)     allowed, once
fulfilled --> anything           FORBIDDEN
rejected  --> anything           FORBIDDEN
```

"Settle once, forever" is the first rule the naive version breaks.

### Chaining: then returns a NEW promise

`.then()` doesn't just register a callback — it returns a *fresh promise* representing your handler's result. That's why you can build pipelines:

```js
Promise.resolve(2)
  .then((n) => n * 10)     // a new promise that fulfills with 20
  .then((n) => n + 1)      // a new promise that fulfills with 21
  .then((n) => console.log(n));  // prints: 21
```

Each link's output feeds the next link's input. A handler that **throws** makes the next promise *rejected* — errors travel down the same pipe as values.

### catch, and how errors skip ahead

`.catch(fn)` is just `.then(undefined, fn)`. Here's the subtle part: when a rejected promise hits a `.then(onlySuccessHandler)`, there's no rejection handler there, so the rejection **passes through** unchanged to the next link. That's how one `catch` at the end catches a throw from three links earlier:

```js
Promise.reject(new Error("boom"))
  .then((v) => console.log("skipped"))     // no reject handler: pass through
  .then((v) => console.log("also skipped"))
  .catch((e) => console.log("caught:", e.message)); // caught: boom
```

### The microtask queue

JavaScript keeps a to-do list called the **microtask queue**. When a promise settles, its handlers aren't called immediately — they're put on that queue, and the queue runs only after the currently executing code finishes. `queueMicrotask(fn)` lets you use the queue directly:

```js
queueMicrotask(() => console.log("second"));
console.log("first");
// prints: first, then second
```

Why it matters: handlers running "later, always" means the code right after `.then(...)` reliably runs *before* the handler — whether the promise was already settled or not. No timing coin-flips.

### Thenables and adoption

A **thenable** is any object with a `.then` method — duck-typing for "promise-like." When you resolve a promise *with a thenable*, the promise doesn't fulfill with the object; it **adopts** the thenable's eventual result:

```js
const thenable = { then: (resolve) => resolve("inner value") };
Promise.resolve(thenable).then((v) => console.log(v)); // inner value
```

This one rule is why returning a promise from `.then` gives you the *flattened* value, never a promise-inside-a-promise. It's also why `await` works on our home-made class: `await` just calls `.then`.

### Classes, `#private` fields, and prototypes

The refactor uses a **class** (a blueprint bundling data and methods) with `#state`, `#result`, `#reactions` as **private fields** — the `#` means only code inside the class can touch them, so nobody outside can corrupt the state machine. The original uses the older style: a plain function plus `MyPromise.prototype.then = ...`, which attaches a shared method to everything built with `new MyPromise(...)`.

## 3. Walking through the original code

The whole "implementation" is a constructor and one method. The constructor:

```js
function MyPromise(executor) {
  var self = this;
  self.callbacks = [];
  self.value = undefined;

  executor(function resolve(value) {
    self.value = value;
    for (var i = 0; i < self.callbacks.length; i++) {
      self.callbacks[i](value);
    }
  }, function reject() {
```

It keeps an array of callbacks and a value. When `resolve` runs, it stores the value and immediately loops through whatever callbacks exist *right now*, calling each one synchronously. The second parameter, `reject`, is an empty function — failure literally isn't implemented.

The `then` method:

```js
MyPromise.prototype.then = function (onFulfilled) {
  this.callbacks.push(onFulfilled);
};
```

Push the callback into the array. Return nothing. That's it.

The demo at the bottom shows why this *looks* fine:

```js
var p = new MyPromise(function (resolve) {
  setTimeout(function () { resolve(42); }, 10);
});
p.then(function (v) { console.log("got", v); });
```

`then` runs first (the timer takes 10ms), so the callback is in the array by the time `resolve` loops. Prints `got 42`. But swap the order — resolve *first*, subscribe *after* — and the callback sits in an array nobody will ever loop over again. That's the `this NEVER prints` line.

## 4. What's wrong with it (in beginner terms)

**No state — resolve twice, run twice.** Story: your promise wraps a "connected" event that (due to a reconnect bug elsewhere) fires twice. Every `.then` callback runs twice: two welcome messages, two chat joins, double everything. Real promises are a one-way gate; this is a swinging door.

**Callbacks run synchronously inside resolve().** Sometimes your handler runs *during* the `resolve()` call, sometimes 10ms later via a timer — depending on when settling happens relative to subscribing. Story: your handler reads a variable that the code after `.then()` was about to set. With a slow promise it's set in time; with a fast one (cache hit!) the handler runs early and reads `undefined`. The bug appears only when things get *faster* — the most confusing kind.

**Rejection doesn't exist.** No `reject`, no `.catch`. Any error just explodes up whatever call stack happens to be running. Failures have no path to the code that cares.

**Subscribing after settling does nothing.** The killer. Story: your `getUser()` caches results. First call: network, 200ms, promise settles after `.then` — works. Second call: cache hit, promise settles instantly, your `.then` callback goes into the dead array — the UI just never updates. "Works the first time, blank the second" is exactly this bug.

**`then` returns nothing.** `p.then(a).then(b)` is a TypeError (you called `.then` on `undefined`). No chaining, no pipelines, no error propagation. Every promise is a dead end.

## 5. Try it yourself first!

Try to fix the original before reading section 6. Hints, vague to specific:

1. Start with the never-fires bug. When `then` is called, what question should it ask before deciding whether to store the callback... or do something else with it right away?
2. Give the promise a `state` variable: `"pending"`, `"fulfilled"`, `"rejected"`. Which methods check it? Which are allowed to change it, and how many times?
3. To fix the timing flakiness: never call a handler directly. Wrap every handler call in `queueMicrotask(...)` — including the "already settled, subscribe late" path from hint 1. Now both paths behave identically.
4. Chaining is the boss level. `then` must create and return a NEW MyPromise. The trick: capture the new promise's own `resolve`/`reject` from inside its executor, and have the stored reaction call them with the handler's return value (resolve) or thrown error (reject).
5. Final touches: if the handler isn't a function, pass the current state and result straight through to the next promise (this creates the pass-through holes that make `catch` work). And in resolve: if the value has a callable `.then`, don't fulfill — call that `.then` with your own resolve/reject and adopt whatever it does (guard with a boolean so a rude thenable calling back twice only counts once).

## 6. Understanding the refactored solution

**The state machine, enforced twice.** Three constants (`PENDING`, `FULFILLED`, `REJECTED`) and private fields nobody outside can touch. In the constructor, a `settled` flag makes `resolve` and `reject` *together* a use-once pair:

```js
const resolve = (value) => {
  if (settled) return; // settling is final
  settled = true;
  this.#resolveWith(value);
};
```

The executor runs inside `try/catch` — an executor that throws is treated as a rejection, so even setup errors flow down the normal failure pipe.

**`#settle` — the single place state changes.** It records state and result, then takes the queued reactions, *empties the array*, and schedules each one. Emptying means each reaction is delivered exactly once, ever.

**`#schedule` — everything goes through the microtask queue.** Every handler call is wrapped in `queueMicrotask`. Whether you subscribed before settling (reaction queued, delivered by `#settle`) or after (delivered directly by `then`), the handler runs on the same queue, with the same timing rules. The pass-through is here too:

```js
if (typeof handler !== 'function') {
  reaction.settleNext(this.#state, this.#result);
  return;
}
```

No handler for this outcome? Forward state and result unchanged to the next promise. This is the "hole" that lets a rejection slide past `.then(fn)` after `.then(fn)` until a `catch` plugs it. When there *is* a handler: its return value fulfills the next promise (and if that value is a thenable, adoption kicks in), and a throw rejects the next promise.

**`then` — register a reaction, return the next link.**

```js
then(onFulfilled, onRejected) {
  let settleNext;
  const next = new MyPromise((resolve, reject) => {
    settleNext = (state, result) => (state === FULFILLED ? resolve(result) : reject(result));
  });
```

It builds the next promise and smuggles out that promise's own settle controls as `settleNext`. The reaction — handlers plus `settleNext` — is either queued (still pending) or scheduled immediately (already settled: late subscribers fire, killing the original's worst bug). Chaining is literally *promises settling promises*. `catch(fn)` is one line: `this.then(undefined, fn)`.

**`#resolveWith` — thenable adoption.** Resolving checks whether the value has a callable `.then`. If not: plain fulfillment. If yes: call that `.then`, wiring its success into `#resolveWith` again (adoption can recurse through nested thenables) and its failure into rejection. An `adopted` boolean guards against misbehaving thenables that call back twice — first signal wins, rest ignored.

**How the tests work.** Node's built-in runner (`node --test`) with `assert`. The elegant part: the tests use real `await` on MyPromise — since MyPromise is a thenable, JavaScript's own machinery adopts it, which is itself proof that adoption works. Key tests map straight to the original's five problems: late subscribers still fire; double-resolve counts once; `['after then', 'handler']` proves microtask ordering; the pipeline test proves chaining; the skip-to-catch test proves pass-through; and the "sneaky thenable" test calls resolve twice and asserts exactly one delivery, value `"first"`.

## 7. Words you learned (glossary)

- **Promise** — an object standing in for a value (or error) that arrives later.
- **Executor** — the function passed to `new Promise(...)`, receiving `resolve` and `reject`.
- **resolve / reject** — report the operation's success (with a value) or failure (with a reason).
- **Settle** — go from pending to fulfilled or rejected; happens at most once.
- **Pending / fulfilled / rejected** — the three promise states.
- **State machine** — a system always in exactly one named state, with fixed rules for transitions.
- **Chaining** — each `.then` returns a new promise fed by the handler's result.
- **Handler** — a function given to `.then`/`.catch` to run when the promise settles.
- **Reaction** — this implementation's stored bundle: handlers plus the next promise's settle function.
- **Pass-through** — a missing handler forwards state and result unchanged to the next link (how errors reach `catch`).
- **Microtask queue** — the to-do list where promise handlers run, after the current code finishes.
- **queueMicrotask** — schedule a function onto the microtask queue directly.
- **Synchronous / asynchronous** — right now, blocking, vs. later, scheduled.
- **Thenable** — any object with a callable `.then`; treated as promise-like.
- **Adoption / flattening** — resolving with a thenable takes on its eventual result instead of wrapping it.
- **try/catch** — run code; if it throws, jump to `catch` instead of crashing.
- **Class / private field (`#x`)** — a blueprint for objects; `#` fields only the class's own code can touch.
- **Prototype** — the older mechanism for sharing methods among objects created by a constructor function.
- **Promises/A+** — the community specification that real promise implementations follow.
- **Duck typing** — treating an object by what it *has* (a `.then` method) rather than what class it is.

## 8. Experiments to try on the plane (no internet needed)

Everything runs offline with `node`. Use scratch files that `import { MyPromise } from "./refactored/my-promise.js"` — don't edit the project files (copy `my-promise.js` first when an experiment says to modify it).

1. **Prove the original's dead-array bug, then the fix.** With the built-in `Promise`: `const p = new Promise(r => r("early")); setTimeout(() => p.then(v => console.log("late subscriber got:", v)), 100);` — it prints. The original MyPromise stays silent in the same shape; the refactored one prints, just like the real thing.
2. **Race the microtask queue.** `MyPromise.resolve("x").then(() => console.log("C")); console.log("A"); queueMicrotask(() => console.log("B"));` Expected order: `A`, then `C`, then `B` — synchronous code first, then microtasks in the order they were queued (the `.then` reaction was queued before your manual `B`).
3. **Watch an error tunnel through the chain.** Build a 4-link chain: `.then(v => { throw new Error("boom") })`, two more `.then(v => console.log("skipped?"))`, then `.catch(e => console.log("caught", e.message))`. Expected: no "skipped?" lines, one `caught boom`. Now insert a `.catch(() => "recovered")` in the middle: the later `.then`s run again — catch *repairs* the chain.
4. **Break the settle-once guard.** In a *copy* of my-promise.js, comment out `if (settled) return;` in `resolve`. Run: `let n = 0; const p = new MyPromise(r => { r(1); r(2); }); p.then(() => n++);` then check `n` after a short timeout. Refactored original: `n === 1`, value 1. Your broken copy: watch what double-settling does. Restore the guard.
5. **Write your own sneaky thenable.** `const sneaky = { then: (res, rej) => { rej(new Error("no")); res("yes"); } };` and `MyPromise.resolve(sneaky).then(v => console.log("v:", v), e => console.log("e:", e.message));` Expected: only `e: no` — first signal wins, the later resolve is ignored by the `adopted` guard.
