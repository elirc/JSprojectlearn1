# 📘 Learning Guide: Debounce & Throttle

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

Two tiny tools that control *how often* a function is allowed to run:

- `debounce(fn, waitMs)` — "wait for quiet." A search box shouldn't call the server on every keystroke; it should wait until you stop typing for 300ms, then search once.
- `throttle(fn, intervalMs)` — "steady drumbeat." A scroll handler shouldn't fire 200 times a second; it should fire at most once every 100ms while you scroll.

Running `node original.js` simulates typing `c`, `ca`, `cat` into a search box, then `kim` into a username field. Expected output: one search and one username check. Actual output: only the username check — the search silently vanishes. That vanishing act is the bug this project fixes.

## 2. Concepts you need first

### Timers: `setTimeout` and `clearTimeout`

`setTimeout(fn, ms)` says "run this function after ms milliseconds" and immediately returns a **timer id** — a ticket you can use to cancel:

```js
const id = setTimeout(() => console.log("boom"), 1000);
clearTimeout(id);   // cancel it
// prints nothing — the timer never fires
```

`clearTimeout(null)` or clearing an already-fired timer is harmless — it just does nothing. That's why debounce can clear unconditionally.

### The event loop (just enough of it)

JavaScript runs one thing at a time. `setTimeout` doesn't pause your code — it schedules work for later and your code keeps going. When the current code finishes *and* the delay has passed, the scheduled function runs. So in the original file, all four keystroke calls happen instantly, and the timers fire afterwards.

### Callbacks

A **callback** is a function you hand to something else to call later. The function inside `setTimeout(...)` is a callback; so is the `fn` you pass to `debounce`.

### Closures (quick recap — project 27 covers this deeply)

A **closure** is a function that remembers variables from where it was created:

```js
function makeStamp() {
  let last = "never";
  return (msg) => { const old = last; last = msg; return old; };
}
const stamp = makeStamp();
console.log(stamp("a")); // never
console.log(stamp("b")); // a   — `last` survived between calls
```

Key point for this project: each call to `makeStamp()` creates a *fresh, private* `last`. Debounce uses the same trick with a timer id instead.

### Higher-order functions / factories

A function that *returns* a function is sometimes called a **factory**. `debounce` is a factory: give it a function and a delay, get back a new "patient" version of that function. Each product of the factory carries its own private state.

### `...args`, `fn.apply`, and `this`

- `function (...args) {}` collects all arguments into an array (**rest parameters**).
- `fn.apply(thisValue, argsArray)` calls `fn` with a given `this` and an array of arguments.
- **`this`** is a special variable meaning "the object this function was called on" (for `obj.method()`, `this` is `obj`). Regular `function`s get their own `this` when called; **arrow functions don't** — they borrow `this` from the code around them. The debounce wrapper is a regular `function` on purpose, so it *has* a `this` to forward; the arrow inside `setTimeout` borrows that `this`, which is exactly what we want.

You don't need to master `this` today (project 29 digs in) — just know the wrapper forwards everything faithfully so it also works on object methods.

### `Date.now()` and `-Infinity`

`Date.now()` returns the current time as a number (milliseconds since Jan 1, 1970). `-Infinity` is a number smaller than every other number — handy as "so long ago that any check passes":

```js
console.log(Date.now());              // e.g. 1755763200000
console.log(Date.now() - -Infinity);  // Infinity — definitely >= any interval
```

### Mock timers — testing time without waiting

Testing "fires after 300ms" by actually waiting 300ms makes tests slow, and on a busy machine timers can drift, making tests randomly fail (**flaky**). Node's test runner can swap the real clock for a fake one:

```js
test('example', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  setTimeout(() => console.log('fired'), 500);
  t.mock.timers.tick(500);   // pretend 500ms passed — instantly
});
```

`tick(n)` advances fake time by `n` ms and runs any timers that came due. Tests finish in milliseconds and never flake. The same `apis: ['Date']` option fakes `Date.now()` too.

## 3. Walking through the original code

A fake API and the debounce attempt:

```js
var timer = null;

function onSearchKeystroke(text) {
  clearTimeout(timer);
  timer = setTimeout(function () {
    searchApi(text);
  }, 300);
}
```

Every keystroke: cancel the previous pending timer, start a new 300ms one. So while you type quickly, the deadline keeps getting pushed back; only when you pause for 300ms does the last timer survive long enough to fire. The *pattern* is exactly right!

Then feature two copies the pattern:

```js
function onUsernameKeystroke(text) {
  clearTimeout(timer); // BUG: shared timer — this CANCELS pending searches!
  timer = setTimeout(function () {
    console.log("  -> checking username: " + text);
  }, 300);
}
```

Both handlers use the *same* module-level `timer` variable. The username handler cancels whatever timer id is in it — which might be the search's pending timer.

The demo:

```js
onSearchKeystroke("c");
onSearchKeystroke("ca");
onSearchKeystroke("cat");     // this search is pending...
onUsernameKeystroke("kim");   // ...and this just silently killed it.
```

After 300ms, only `-> checking username: kim` prints. The search for "cat" never happens.

## 4. What's wrong with it (in beginner terms)

**Shared timer variable.** The timer id lives in one module-level variable that both features grab. Story: your signup page has a search field and a username field. A user types a search, then immediately tabs to the username box and types. The search never runs. They shrug, retype, it works (because this time they didn't touch the other field within 300ms). You get a bug report saying "search sometimes doesn't work" — the worst kind: no error, not reproducible on demand, and the cause is a variable nowhere near either symptom.

**The "fix" multiplies globals.** The obvious patch is `timer2` for the username field. Then `timer3`, `timer4`... every new debounced thing needs its own loose variable, and every copy of the handler must remember to grab the *right* one. One wrong grab and you're back in silent-cancellation land.

**Untestable except by real waiting.** To test this code you'd have to actually wait 300ms per test, and trust the machine isn't busy. Slow *and* flaky is the worst combination a test suite can have — people stop running slow suites and stop trusting flaky ones.

## 5. Try it yourself first!

Try building `debounce` yourself before reading on. Hints, vague → specific:

1. The keystroke handler's *logic* is right. The problem is where `timer` lives. Where could it live so each usage automatically gets its own?
2. Project 27's `memoize` had exactly this shape: a factory function whose local variable is captured by the function it returns.
3. Write `function debounce(fn, waitMs)` that declares `let timeoutId;` and returns a new function.
4. The returned function: `clearTimeout(timeoutId)`, then `timeoutId = setTimeout(...)` scheduling `fn` with the arguments it received.
5. Use rest parameters (`...args`) so any number of arguments pass through.
6. For `throttle`: instead of a timer id, remember *when you last fired* (`Date.now()`); only fire if enough time has passed, and update the memory when you do.

## 6. Understanding the refactored solution

**Debounce** — five real lines:

```js
export function debounce(fn, waitMs) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), waitMs);
  };
}
```

- `let timeoutId;` lives in the closure. Calling `debounce` twice creates two independent `timeoutId`s — two debounced fields *cannot* cancel each other. Independence isn't something you remember to arrange; it falls out of the shape.
- Every call clears the old timer and schedules a new one — the "keep pushing the deadline back" behavior. Only the **last** call's arguments win, which is what a search box wants.
- `fn.apply(this, args)` forwards arguments and `this`, so the wrapper is transparent even on methods.

**Throttle** — the twin with opposite personality:

```js
export function throttle(fn, intervalMs) {
  let lastFiredAt = -Infinity;
  return function (...args) {
    const now = Date.now();
    if (now - lastFiredAt >= intervalMs) {
      lastFiredAt = now;
      fn.apply(this, args);
    }
  };
}
```

Private state here is a timestamp, starting at `-Infinity` so the very first call always fires. During the cooldown, calls are simply dropped. How to choose between the twins: do you want the *end* of the activity (debounce — search, autosave, resize) or *updates during* it (throttle — scroll progress, mousemove)?

**The tests** are the other half of the lesson:

- `t.mock.timers.enable({ apis: ['setTimeout'] })` replaces real timers with a fake clock; `tick(299)` then `tick(1)` proves the boundary is *exactly* 300ms — no real waiting, no flakes.
- The second test shows the restart behavior: calls at 0ms and 90ms, then 90ms more of waiting — 180ms total but never 100ms of *quiet*, so nothing fires until 10 more ticks.
- The third test is the original's bug, pinned forever: a pending search plus a username check, tick 300, assert *both* fired.
- The throttle test fakes `Date` instead (`apis: ['Date']`), since throttle reads `Date.now()`: call at 0 fires, spam at 0 and 50 is dropped, a call at 100 fires. Result: `[1, 4]`.

## 7. Words you learned (glossary)

- **Debounce**: delay a function until there's been N ms of silence; last call wins.
- **Throttle**: allow a function at most once per N ms; extras are dropped.
- **`setTimeout` / `clearTimeout`**: schedule a function for later / cancel it by id.
- **Timer id**: the ticket `setTimeout` returns, used for cancelling.
- **Event loop**: JavaScript's one-at-a-time scheduler; timeouts run after current code finishes.
- **Callback**: a function handed over to be called later.
- **Closure**: a function that keeps access to variables from where it was created.
- **Factory**: a function that builds and returns new functions (or objects).
- **Module-level / global variable**: declared at the top of a file; shared by everything — the bug's home.
- **Rest parameters (`...args`)**: collect all arguments into an array.
- **`fn.apply(thisVal, args)`**: call a function with a chosen `this` and an argument array.
- **`this`**: the object a method was called on; arrows inherit it, regular functions get their own.
- **`Date.now()`**: current time in milliseconds since 1970.
- **`-Infinity`**: smaller than every number; "infinitely long ago".
- **Mock timers / fake clock**: test-runner feature that lets tests advance time instantly.
- **`tick(n)`**: advance the fake clock by n ms, firing due timers.
- **Flaky test**: a test that sometimes passes and sometimes fails without code changes.

## 8. Experiments to try on the plane (no internet needed)

1. **Find the exact boundary.** In the first test, change `tick(299)` to `tick(300)` and delete the `tick(1)` line's assertion order — or simpler: change `tick(299)` to `tick(298)` then `tick(2)`. Run `node --test 28-debounce-throttle/`. Expected: still passes — what matters is crossing 300 total. Now assert `calls` is non-empty after only `tick(299)`: fails, proving nothing fires early.
2. **Break the closure, resurrect the bug.** In `refactored/debounce-throttle.js`, move `let timeoutId;` *above* the `export function debounce` line (module level) and run the tests. Expected: the "two debounced functions are independent" test fails — you've rebuilt the original's shared-timer bug in one move.
3. **Make throttle "fire on the trailing edge" — see it's not free.** Change throttle's `>=` to `>` and run the tests. Expected: still passes (boundary case at exactly 100ms — check the test's ticks to see why or why not). Then change `intervalMs` handling to `now - lastFiredAt >= intervalMs + 1` — the last `track(4)` gets dropped and the test fails with `[1]` vs `[1, 4]`.
4. **Debounce with different arguments.** In a scratch test, call `save('a'); save('b'); save('c');` then tick past the wait. Expected: only `['c']` — "last call's arguments win" is the debounce contract.
5. **Predict, then run, the original.** Before running `node original.js`, write down what you think prints if you *reorder* the lines so `onUsernameKeystroke("kim")` comes first. Expected once you run your edited copy (make a scratch copy — don't modify the original): both fire? No! The *search* keystrokes cancel the pending *username* timer this time — the bug is symmetrical.
