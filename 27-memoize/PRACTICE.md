# 🏋️ Practice: Memoize

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Memoize a recursion of your own (warm-up)

Following the `fib` pattern, define triangular numbers (`tri(n) = n + tri(n-1)`, with `tri(0) = 0`) memoized *against itself*, and count how many times the inner function actually runs. Expected: `tri(4)` returns `10` after exactly 5 inner calls (n = 4,3,2,1,0), and then `tri(5)` returns `15` after only **one** more call — the whole subtree was cached.

**Practices:** self-referential memoization — the recursion hits the cache, not the raw function.

**Hint:** `const tri = memoize((n) => { calls++; return n <= 0 ? 0 : tri(n - 1) + n; });` — the recursive call must go through `tri`, the wrapped name.

### ⭐⭐ 2. `once(fn)` — a sibling wrapper (core)

Write `once(fn)`: the returned function runs `fn` on the first call, then returns that first result forever, ignoring later arguments. Expected: with a counter inside, calling the wrapped function three times leaves the counter at 1; and if `fn` doubles its argument, `wrapped(10)` then `wrapped(99)` returns `20` both times.

**Practices:** closures holding private state other than a Map — a boolean and a saved result.

**Hint:** two captured variables: `let called = false; let result;`.

### ⭐⭐ 3. Add `clear()` and `stats()` without exposing the cache (core)

Copy `memoize` into a new `memoizeInspectable(fn)` whose returned function carries two extra methods: `wrapped.clear()` empties the cache, and `wrapped.stats()` returns `{ hits, misses }`. The Map itself must stay unreachable. Expected: after `sq(4); sq(4); sq(5);` stats are `{hits: 1, misses: 2}`; after `sq.clear(); sq(4);` they become `{hits: 1, misses: 3}`.

**Practices:** functions are objects — you can attach methods that share the same closure.

**Hint:** declare `function wrapped(...) {...}` then `wrapped.clear = () => cache.clear();` before returning it. `hits`/`misses` are just two more closed-over `let`s.

### ⭐⭐ 4. `spy(fn)` — prove cache hits by composing wrappers (core)

Write `spy(fn)` that returns a wrapped function with a public `wrapped.calls` counter, then *compose* it: `const spied = spy(slow); const fast = memoize(spied);`. Expected: after `fast(4); fast(4); fast(4); fast(5);`, `spied.calls` is exactly `2` — proof that memoize only reached through to the real function twice.

**Practices:** wrappers stack — each higher-order function adds one behavior, and they don't need to know about each other.

**Hint:** the counter can live *on* the function: `wrapped.calls = 0;` and `wrapped.calls++` inside.

### ⭐⭐⭐ 5. `maxSize` — evict the oldest entry (challenge)

Real caches can't grow forever. Write `memoizeWithLimit(fn, { maxSize })`: when adding an entry pushes the cache past `maxSize`, delete the *oldest* entry. Expected with `maxSize: 2` and a call counter: `f(1); f(2); f(3)` = 3 computations; `f(3); f(2)` = still 3 (both cached); `f(1)` = 4 (it was evicted). This is a sneak preview of project 41 (LRU cache).

**Practices:** Map insertion order as a free "age" record.

**Hint:** the oldest key is `cache.keys().next().value` — Maps iterate in insertion order.

### ⭐⭐⭐ 6. `memoizeAsync` — don't cache failures (challenge)

For a function that returns a Promise, cache the *promise* — but if it rejects, delete the entry so the next call retries. Expected with a fetcher that fails on its first call ever: call 1 rejects with the error (1 real call), call 2 succeeds (2 real calls), call 3 is a cache hit (still 2). Bonus check: two calls fired *before* the first resolves share one promise — the counter stays at 1.

**Practices:** caching in-flight work, and treating errors as "never happened".

**Hint:** `Promise.resolve(fn(...args)).catch(err => { cache.delete(key); throw err; })` — store *that*, and re-throw so callers still see the failure.

## Solutions

### 1. Triangular numbers

```js
let calls = 0;
const tri = memoize((n) => { calls++; return n <= 0 ? 0 : tri(n - 1) + n; });
// tri(4) === 10, calls === 5;  then tri(5) === 15, calls === 6
```

**Why:** same shape as `fib` — because the inner function recurses through the *memoized* name `tri`, every sub-answer lands in the cache, so extending to `tri(5)` costs one new computation. Recursing through a plain inner name would skip the cache entirely.

### 2. `once`

```js
export function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  };
}
```

**Why:** a closure doesn't have to hold a Map — any private variables work. `called` must be a separate flag (not "is result undefined?") for exactly the reason the README's `!= undefined` trap exists: `fn` might legitimately return `undefined`.

### 3. `clear()` and `stats()`

```js
export function memoizeInspectable(fn, keyOf = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  let hits = 0, misses = 0;
  function wrapped(...args) {
    const key = keyOf(...args);
    if (cache.has(key)) { hits++; }
    else { misses++; cache.set(key, fn.apply(this, args)); }
    return cache.get(key);
  }
  wrapped.clear = () => cache.clear();
  wrapped.stats = () => ({ hits, misses });
  return wrapped;
}
```

**Why:** the cache stays truly private — outsiders get two narrow doors (`clear`, `stats`), not the Map. All three functions share one closure, which is the same "function + hidden state" machinery the README credits for making the shared-cache bug impossible.

### 4. `spy`

```js
export function spy(fn) {
  function wrapped(...args) {
    wrapped.calls++;
    return fn.apply(this, args);
  }
  wrapped.calls = 0;
  return wrapped;
}
// const spied = spy((n) => n * n); const fast = memoize(spied);
// fast(4); fast(4); fast(4); fast(5);  ->  spied.calls === 2
```

**Why:** wrappers compose because each one takes a function and returns a function — memoize neither knows nor cares that its `fn` is itself a wrapper. This is how logging, retrying, and timing stack up in real codebases.

### 5. `memoizeWithLimit`

```js
export function memoizeWithLimit(fn, { maxSize = Infinity, keyOf = (...args) => JSON.stringify(args) } = {}) {
  const cache = new Map();
  return function (...args) {
    const key = keyOf(...args);
    if (!cache.has(key)) {
      cache.set(key, fn.apply(this, args));
      if (cache.size > maxSize) {
        cache.delete(cache.keys().next().value); // oldest insertion
      }
    }
    return cache.get(key);
  };
}
```

**Why:** Maps iterate in insertion order, so "first key out of the iterator" *is* the oldest entry — no timestamps needed. Verified with node: computations went 3 → 3 → 4 exactly as the exercise predicts. (Project 41 upgrades this to true least-*recently-used*.)

### 6. `memoizeAsync`

```js
export function memoizeAsync(fn, keyOf = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  return function (...args) {
    const key = keyOf(...args);
    if (!cache.has(key)) {
      const promise = Promise.resolve(fn.apply(this, args))
        .catch((err) => { cache.delete(key); throw err; });
      cache.set(key, promise);
    }
    return cache.get(key);
  };
}
```

**Why:** storing the promise (not the value) means two overlapping calls share one piece of in-flight work — verified: two simultaneous calls, one real execution. The `.catch` deletes the entry then re-throws, so failures stay visible but are never served from cache; verified sequence was fail(1 call) → succeed(2 calls) → hit(still 2).
