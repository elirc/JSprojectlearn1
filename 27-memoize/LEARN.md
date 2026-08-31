# 📘 Learning Guide: Memoize

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A function called `memoize(fn)` that takes any slow function and returns a faster twin. The twin remembers ("caches") every answer, so asking the same question twice is instant the second time.

```js
const square = memoize((n) => n * n);
square(4); // computes 16 (slow the first time)
square(4); // instantly returns the remembered 16
```

Running `node original.js` shows a home-made cache working... then giving a *wrong answer* (`slowDouble(4)` prints `16` instead of `8`), then a naive `fib(32)` taking about a second. The refactored version fixes all of it, and `fib(80)` finishes instantly.

## 2. Concepts you need first

### Caching

A **cache** is a stash of already-computed answers. Before doing expensive work, check the stash; after doing it, save the result. The trade: memory spent, time saved.

### Functions are values

In JavaScript a function is a value like any other. You can store one in a variable, put it in an array, pass it to another function, or return it from a function:

```js
const shout = (s) => s + "!";
const doTwice = (fn, x) => fn(fn(x));
console.log(doTwice(shout, "hi")); // hi!!
```

### Higher-order functions and wrappers

A **higher-order function** takes a function and/or returns one. A **wrapper** is a higher-order function that returns a new function which adds behavior around the old one:

```js
function withLogging(fn) {
  return (...args) => {
    console.log("calling with", args);
    return fn(...args);
  };
}
const loudAdd = withLogging((a, b) => a + b);
loudAdd(2, 3); // prints: calling with [2, 3]   then returns 5
```

`memoize` is exactly this shape — the added behavior is caching.

### Closures — the heart of this project

A **closure** is a function that remembers the variables from the place it was created, even after that place has finished running:

```js
function makeCounter() {
  let count = 0;               // local to makeCounter
  return () => { count++; return count; };
}
const next = makeCounter();
console.log(next()); // 1
console.log(next()); // 2  — count survived between calls!
```

Two magic properties:
1. `count` is **private** — nothing outside `makeCounter` can read or reset it.
2. Each call to `makeCounter()` makes a **fresh** `count`. A second counter starts at 1, independent of the first.

Swap "count" for "cache" and you have this whole project.

### Global variables and why they collide

A **global** variable lives at the top of a file, visible to everything. When two functions share one global cache, they can overwrite each other's entries — the original's core bug. Closures are the antidote: private, per-wrapper state.

### Pure functions

A **pure function** always gives the same output for the same input and does nothing else (no printing, no mutating, no randomness). Only pure functions are safe to memoize — caching `Math.random()` gives you a very fast wrong answer, because the "remembered" value should have changed.

### Rest parameters and spread

`function f(...args)` collects however many arguments were passed into one array called `args`. Going the other way, `fn(...args)` spreads an array back out into separate arguments:

```js
const collect = (...args) => args;
console.log(collect(1, 2, 3)); // [1, 2, 3]
```

### Truthy, falsy, and the `!= undefined` trap

JavaScript treats some values as "falsy" in conditions: `false`, `0`, `""`, `null`, `undefined`, `NaN`. A cache check like `if (cache[n] != undefined)` asks "is the stored value not undefined-ish?" — but what if the *legitimate answer* is `undefined`, or (with loose `!=`) `null`? Then the check says "not cached" forever and recomputes every time. The right question is "does an entry exist?", which `Map.has(key)` answers directly.

```js
const m = new Map();
m.set("k", false);
console.log(m.get("k"));  // false (a real, cached answer)
console.log(m.has("k"));  // true  — entry exists, falsy value or not
```

### Recursion and Fibonacci

**Recursion** is a function calling itself. **Fibonacci** is the sequence 0, 1, 1, 2, 3, 5, 8... where each number is the sum of the previous two:

```js
function fib(n) {
  if (n <= 1) return n;            // base case
  return fib(n - 1) + fib(n - 2);  // two recursive calls
}
console.log(fib(10)); // 55
```

Beautiful, but naive: `fib(32)` recomputes `fib(30)` twice, `fib(29)` three times... the work roughly *doubles* with each step up. `fib(80)` would take longer than your lifetime. Memoization collapses it: each `fib(k)` is computed once, ever.

### `console.time` / `console.timeEnd`

A built-in stopwatch: `console.time("label")` starts it, `console.timeEnd("label")` prints elapsed milliseconds. The original uses it to show `fib(32)`'s cost.

## 3. Walking through the original code

The shared cache and the first slow function:

```js
var cache = {};

function slowSquare(n) {
  if (cache[n] != undefined) return cache[n];
  for (var i = 0; i < 20000000; i++) {}   // pretend this takes ages
  var result = n * n;
  cache[n] = result;
  return result;
}
```

Check the stash; if there's something under key `n`, return it. Otherwise burn time in an empty 20-million-lap loop (simulating expensive work), compute, save, return. The plumbing works!

Then a second function is added — with the *same* pasted plumbing and the *same* global `cache`:

```js
function slowDouble(n) {
  if (cache[n] != undefined) return cache[n]; // SAME cache...
  ...
}
```

The demo shows the payoff and the disaster:

```js
console.log(slowSquare(4)); // 16, slow — then cached
console.log(slowSquare(4)); // 16, instant. Caching works!
console.log(slowDouble(4)); // should be 8. Prints 16 — square's answer!
```

`slowSquare(4)` stored `16` under key `4`. `slowDouble(4)` looks up key `4`, finds `16`, and returns it. Wrong answer, no error, no warning.

Finally, naive `fib` with the stopwatch around it — about a second for `fib(32)`, because the same subtrees get recomputed millions of times.

## 4. What's wrong with it (in beginner terms)

**One cache for everyone.** The key is just the argument (`4`), with nothing saying *which function* the answer belongs to. Story: months later someone adds `slowHalve(n)` to the file. Every test of `slowHalve` passes... except the ones that happen to run after `slowSquare` used the same numbers. Bugs that depend on *what ran before* are among the nastiest to hunt.

**Pasted plumbing.** Each expensive function needs the same three cache lines copied in. Copy-paste breeds drift: someone fixes the falsy-check bug in one copy and not the other four. The README calls this the "rule of three" — the third time you paste something, that's the signal to extract it into one shared place.

**The falsy-cache trap.** `if (cache[n] != undefined)` treats "no entry" and "entry whose value is undefined (or null, with loose `!=`)" the same. Story: you memoize `findUser(id)`, which returns `null` for unknown ids. Every lookup of an unknown id misses the cache and hits the slow path — the cache silently does nothing, exactly for the case where the work was most wasted. The refactor's tests pin this with a function that returns `false`.

## 5. Try it yourself first!

Try writing `memoize` before reading the solution. Hints, vague → specific:

1. Don't fix the two slow functions — write one new function that can fix *any* function.
2. Its shape: take `fn`, return a brand-new function. Callers use the new one.
3. Where does the cache live so it's private and per-wrap? Inside `memoize`, as a local `const cache = new Map()`, created before you return the inner function.
4. The inner function: build a key from the arguments, then `if (!cache.has(key)) cache.set(key, fn(...args));` and `return cache.get(key);`.
5. For multiple arguments, `JSON.stringify(args)` makes a workable key: `(1,2)` → `"[1,2]"`, different from `(2,1)` → `"[2,1]"`.
6. Bonus: let callers pass their own key-maker function for arguments JSON handles badly (like objects).

## 6. Understanding the refactored solution

The whole tool is ten lines:

```js
export function memoize(fn, keyOf = (...args) => JSON.stringify(args)) {
  const cache = new Map();

  return function (...args) {
    const key = keyOf(...args);
    if (!cache.has(key)) {
      cache.set(key, fn.apply(this, args));
    }
    return cache.get(key);
  };
}
```

Design choices, one by one:

- **`const cache = new Map()` inside `memoize`** — the closure. Each call to `memoize()` creates a fresh, private Map that only the returned function can see. `square` and `double` *cannot* share a cache; the original's bug is now structurally impossible, not just avoided.
- **`cache.has(key)`** — asks "is there an entry?", so cached `false`, `null`, `0`, and `undefined` all count as hits. The falsy trap is dead.
- **`keyOf` with a default** — the second parameter is itself a function, defaulting to JSON-stringifying the arguments. Works fine for numbers and strings. For objects, callers inject a better one: `memoize(getLabel, (user) => user.id)`. Making a dependency swappable-by-parameter is called **injection**.
- **`fn.apply(this, args)`** — calls the original function with the same argument list (and the same `this`, a detail that matters if the function is used as a method; safe to gloss over for now).

Then the showpiece:

```js
export const fib = memoize((n) => (n <= 1 ? n : fib(n - 1) + fib(n - 2)));
```

The definition is still the textbook two-liner — but because the *name* `fib` refers to the memoized wrapper, the recursive calls inside also go through the cache. Every subtree is computed exactly once, so `fib(80)` is instant. (The `?:` is the **ternary operator**: `condition ? valueIfTrue : valueIfFalse`.)

**The tests** each pin one claim: correct answers; the wrapped function runs once per distinct input (counted with a `calls` variable the test closes over — a closure testing a closure!); separate caches per wrap (`double(4)` really returns 8); `(1,2)` vs `(2,1)` are different keys; a custom `keyOf` makes two *different* user objects with the same id hit the cache; a cached `false` still counts as a hit; and `fib(80)` returns instantly with the exact expected number.

## 7. Words you learned (glossary)

- **Cache**: stored answers reused to skip repeated expensive work.
- **Memoize / memoization**: automatically caching a function's results by its arguments.
- **Higher-order function**: a function that takes and/or returns a function.
- **Wrapper**: a returned function that adds behavior around another function.
- **Closure**: a function that keeps access to variables from where it was created.
- **Private state**: data only reachable from inside a closure (or similar) — untouchable outside.
- **Global variable**: top-level variable visible everywhere; prone to collisions.
- **Pure function**: same input → same output, no side effects; the only safe kind to memoize.
- **Falsy**: values treated as false in conditions: `false, 0, "", null, undefined, NaN`.
- **`Map.has`**: "does an entry exist?" — independent of whether its value is falsy.
- **Rest parameters (`...args`)**: collect all arguments into an array.
- **Spread (`fn(...args)`)**: expand an array back into separate arguments.
- **Injection**: passing a dependency (like `keyOf`) in as a parameter so callers can swap it.
- **Recursion / base case**: a function calling itself, with a condition that stops it.
- **Fibonacci**: sequence where each number is the sum of the previous two.
- **Ternary (`a ? b : c`)**: inline if/else expression.
- **Rule of three**: pasted the same code a third time? Extract it into one helper.

## 8. Experiments to try on the plane (no internet needed)

1. **Recreate the original's bug — and see it fixed.** In the test file, temporarily make both wraps share a cache by... actually, you can't! There's no way to reach `cache` from outside. That impossibility *is* the lesson. Instead, add `console.log(square.cache)` after creating a memoized `square` in a scratch file. Expected: `undefined` — the cache is truly private.
2. **Memoize an impure function and watch it lie.** Scratch file: `const r = memoize(() => Math.random()); console.log(r(), r(), r());`. Expected: the same number three times — fast, consistent, and wrong for a random generator. This is why only pure functions get memoized.
3. **Break the falsy fix.** In `refactored/memoize.js`, replace the `has` check with `if (cache.get(key) == undefined)` (plus matching set/return) and run `node --test 27-memoize/`. Expected: the "cached falsy results" test fails — `false` keeps getting recomputed.
4. **Time the difference.** In a scratch file, import `fib` and wrap `fib(35)` in `console.time("memo")` / `console.timeEnd("memo")`; compare with the naive `fib` from `original.js` at the same `n`. Expected: microseconds vs around a second.
5. **Defeat the default `keyOf`.** Call a memoized one-argument function with two different objects: `f({id: 1})` and `f({id: 2})` where `keyOf` is left as the default, then try a function of *functions* like `f(() => 1)`. Expected: objects work (JSON tells them apart) but the function argument becomes the key `"[null]"`... twice — a cache collision. Custom `keyOf` exists exactly for inputs JSON can't describe.
