# 🏋️ Practice: LRU Cache

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. The value that looks like a miss (warm-up)

Store `undefined` as a value: `cache.set('a', undefined)`. Now `cache.get('a')` returns `undefined` — and so does `cache.get('never-stored')`. Two completely different situations, one answer. Add a test that pins down today's behavior: `get` can't tell them apart, but `has('a')` is `true` while `has('never-stored')` is `false`, and `size` is `1`. Then confirm the stored-undefined entry is still a real entry by checking it gets *refreshed* by a `get`: with capacity 2, `set('a', undefined)`, `set('b', 2)`, `get('a')`, `set('c', 3)` leaves `keys()` as `['a', 'c']`.

What it practices: noticing where a return value is ambiguous, and using the API you already have to disambiguate.

Hint: read `get`'s first line — `if (!this.#entries.has(key)) return undefined;`. Both paths reach the same `undefined` by different routes.

### ⭐⭐ 2. delete() and peek() (core)

Add two methods. `delete(key)` removes an entry and returns `true`/`false` for whether it was there — cache invalidation, the other half of caching. `peek(key)` reads a value *without* refreshing recency, the read-only twin of `get`, for debug panels and admin screens that must not distort what they observe. Check offline with capacity 3: after `a, b, c`, `delete('b')` → `true`, a second `delete('b')` → `false`, `keys()` → `['a', 'c']`; then `set('d')` keeps all three (`['a','c','d']`), `peek('a')` returns 1 and leaves the order alone, while `get('a')` moves it to the end (`['c','d','a']`).

What it practices: matching each method's side effects to its meaning — the same design decision `has` already made.

Hint: `Map.delete` returns the boolean you want. `peek` is `this.#entries.get(key)` with no delete/set dance.

### ⭐⭐ 3. Hit rate — is this cache even helping? (core)

A cache with a 5% hit rate is pure overhead, and you can't know without measuring. Add `hits`, `misses` and `hitRate` getters, counting in `get` only (a `has` peek is not a read, and `set` is not a read either). `hitRate` on a fresh cache must be `0`, not `NaN`. Check offline: `set('a', 1)`, then `get('a')`, `get('a')`, `get('b')` → `hits` 2, `misses` 1, `hitRate` `2/3`.

What it practices: instrumenting a data structure, and the division-by-zero guard that separates a real metric from a `NaN` on a dashboard.

Hint: `const total = this.#hits + this.#misses; return total === 0 ? 0 : this.#hits / total;`

### ⭐⭐ 4. cached() — memoize with a bound (core)

Project 27's memoize remembers *everything*, which is a memory leak wearing a performance costume. Write `cached(fn, capacity)` returning a wrapped single-argument function that looks the answer up in an `LruCache` first, and expose the cache as a property on the wrapper so tests can inspect it. Check offline with a call-counting `slowSquare` and capacity 2: `fast(4)` twice → 1 real call; then `fast(5)`, `fast(6)` (evicting 4) → 3 calls; then `fast(4)` again → 4 calls, because it was evicted and had to be recomputed.

What it practices: composing two things you already built, and seeing why bounded memoization behaves differently from unbounded.

Hint: use `has` then `get`, not `get` alone — otherwise a legitimately cached `undefined` result gets recomputed every single time (exercise 1's trap, in production form).

### ⭐⭐⭐ 5. Time-to-live (challenge)

Add `{ ttlMs, now }` options so entries expire: `new LruCache(3, { ttlMs: 1000, now: () => clock })`. An expired entry must be *removed*, not merely hidden — `size` has to drop. Reading must NOT extend the life (that's a different policy, and mixing them up gives you a cache that never refreshes stale data); writing the key again must reset the clock. Check offline with a fake clock: store at 0; at 999 `get` returns the value; at 1000 `has` is `false`, `get` is `undefined`, and `size` is `0`. Then: store at 0, read at 500, and it must still expire at 1000; re-`set` at 1500 and it must survive until 2500.

What it practices: injecting the clock (projects 28, 39, 43 again), and stating an expiry policy precisely enough to test.

Hint: store `{ value, storedAt }` instead of a bare value, and write one private helper `#alive(key)` that deletes-and-returns-false when `now() - storedAt >= ttlMs`. Then `get`, `has` and `peek` all call it and none of them repeats the rule.

### ⭐⭐⭐ 6. resize() and an invariant fuzz test (challenge)

Real caches are tuned at runtime. Add `resize(capacity)` that validates like the constructor and, when shrinking, evicts least-recently-used entries until the cache fits. Then write a fuzz test: 500 trials, each with a random capacity 1–5, performing 80 random operations (`set`/`get`/`has`/`delete`/`resize`) on 8 random keys, asserting after *every* operation that `size <= capacity`, `keys()` has no duplicates, and `keys().length === size`. Check offline: filling capacity 5 with `a..e` then `resize(2)` leaves `['d', 'e']`; then `resize(4)` plus two sets gives `['d','e','f','g']`; `resize(0)` throws `RangeError`.

What it practices: fuzz testing against invariants — the technique that finds the bug you'd never think to write an example for.

Hint: a `while` loop, not an `if`: shrinking from 5 to 2 evicts more than one. Expose a `capacity` getter so the test can assert against it.

## Solutions

### 1. The value that looks like a miss

```js
test('a stored undefined is indistinguishable from a miss — via get()', () => {
  const cache = new LruCache(2);
  cache.set('a', undefined);
  assert.equal(cache.get('a'), undefined);           // stored
  assert.equal(cache.get('never-stored'), undefined); // absent — same answer!
  assert.equal(cache.has('a'), true);                 // has() knows the difference
  assert.equal(cache.has('never-stored'), false);
  assert.equal(cache.size, 1);
});

test('...but it is a real entry: a get() still refreshes it', () => {
  const cache = new LruCache(2);
  cache.set('a', undefined);
  cache.set('b', 2);
  cache.get('a');
  cache.set('c', 3);
  assert.deepEqual(cache.keys(), ['a', 'c']); // 'b' evicted, 'a' rescued
});
```

WHY: this is why `has` exists as a separate method rather than being spelled `get(key) !== undefined` — a point LEARN.md's experiment 4 makes from the other direction. The Map underneath distinguishes "key present with value `undefined`" from "key absent" perfectly; only the *return type* of `get` collapses them. Real caches solve this by returning a sentinel or a `{ hit, value }` object; the cheap fix, used in exercise 4, is to ask `has` first.

### 2. delete() and peek()

```js
delete(key) {
  return this.#entries.delete(key); // true if it was there
}

peek(key) {
  return this.#entries.get(key); // read WITHOUT the delete/set refresh
}
```

WHY: `peek` is `get` minus two lines, and those two lines are the entire meaning of "recently used" — writing them side by side makes the LRU mechanism impossible to misunderstand. `delete`'s boolean matters more than it looks: cache invalidation code often wants to know whether it actually invalidated anything, and `Map.delete` already computes it. Both methods stay O(1) and neither needs to touch the capacity logic, because only `set` can grow the cache. Verified by running: the double-delete gives `true` then `false`, `peek` leaves `['a','c','d']` untouched and `get` reorders to `['c','d','a']`.

### 3. Hit rate

```js
#hits = 0;
#misses = 0;

get(key) {
  if (!this.#entries.has(key)) { this.#misses++; return undefined; }
  this.#hits++;
  const value = this.#entries.get(key);
  this.#entries.delete(key);
  this.#entries.set(key, value);
  return value;
}

get hits() { return this.#hits; }
get misses() { return this.#misses; }
get hitRate() {
  const total = this.#hits + this.#misses;
  return total === 0 ? 0 : this.#hits / total;
}
```

WHY: counting only in `get` is a deliberate definition — `has` is a peek and `set` is a write, and folding them in would inflate the rate until it stops meaning anything. The `total === 0` guard is the same defence `analyze` uses for its error rate in project 36: a fresh cache should report `0`, not `NaN`, because `NaN` propagates through every average and chart downstream. The counters live behind getters so nobody can reset them by accident. Verified by running: 2 hits, 1 miss, rate `2/3`, and `0` on an untouched cache.

### 4. cached()

```js
export function cached(fn, capacity) {
  const cache = new LruCache(capacity);
  const wrapped = (arg) => {
    if (cache.has(arg)) return cache.get(arg); // has() first — see exercise 1
    const value = fn(arg);
    cache.set(arg, value);
    return value;
  };
  wrapped.cache = cache; // exposed for tests and debugging
  return wrapped;
}
```

WHY: `has` then `get` looks redundant but is exactly the fix for exercise 1's ambiguity — with `get` alone, any function that legitimately returns `undefined` would be re-run on every call while the cache filled up with useless entries. The two-step still costs O(1) twice, and the `get` is what refreshes recency, so hot arguments survive. The difference from project 27's memoize is the whole point: unbounded memoization of user-supplied keys is a memory leak, and the LRU turns it into a fixed budget — at the price of occasionally recomputing something you'd already seen. Verified by running: 1 call for two `fast(4)`s, then eviction forces a 4th call, and `fast.cache.hits` is 1.

### 5. Time-to-live

```js
constructor(capacity, { ttlMs = Infinity, now = Date.now } = {}) {
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new RangeError(`Capacity must be a positive integer, got ${capacity}`);
  }
  this.#capacity = capacity;
  this.#ttlMs = ttlMs;
  this.#now = now;
}

/** One place where "is this entry still valid?" is decided. */
#alive(key) {
  const entry = this.#entries.get(key);
  if (entry === undefined) return false;
  if (this.#now() - entry.storedAt >= this.#ttlMs) {
    this.#entries.delete(key); // expire = remove, not hide
    return false;
  }
  return true;
}

get(key) {
  if (!this.#alive(key)) { this.#misses++; return undefined; }
  this.#hits++;
  const entry = this.#entries.get(key);
  this.#entries.delete(key);
  this.#entries.set(key, entry); // same entry object => storedAt survives
  return entry.value;
}

set(key, value) {
  this.#entries.delete(key);
  this.#entries.set(key, { value, storedAt: this.#now() });
  if (this.#entries.size > this.#capacity) {
    this.#entries.delete(this.#entries.keys().next().value);
  }
}

has(key) { return this.#alive(key); }
```

WHY: `#alive` is the single place the expiry rule lives, so `get`, `has` and `peek` cannot drift apart — the same "one structure, nothing to keep in sync" argument the README makes about the Map, applied to a rule instead of data. Re-inserting the *same entry object* in `get` is what keeps reads from extending life: only `set` builds a fresh `{ value, storedAt }`. Deleting on expiry rather than filtering it out means `size` and `keys()` stay truthful, and expired entries can't hold memory forever. `Infinity` as the default TTL means every existing test passes unchanged. Verified by running: alive at 999, gone at 1000 with `size` 0, a read at 500 does not postpone expiry, and a re-`set` at 1500 survives to 2400.

### 6. resize() and the fuzz test

```js
get capacity() { return this.#capacity; }

resize(capacity) {
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new RangeError(`Capacity must be a positive integer, got ${capacity}`);
  }
  this.#capacity = capacity;
  while (this.#entries.size > this.#capacity) {
    this.#entries.delete(this.#entries.keys().next().value); // drop coldest
  }
}
```

```js
test('FUZZ: the invariants hold after any sequence of operations', () => {
  for (let trial = 0; trial < 500; trial++) {
    const cache = new LruCache(1 + Math.floor(Math.random() * 5));
    for (let i = 0; i < 80; i++) {
      const key = 'k' + Math.floor(Math.random() * 8);
      const roll = Math.random();
      if (roll < 0.4) cache.set(key, i);
      else if (roll < 0.7) cache.get(key);
      else if (roll < 0.85) cache.has(key);
      else if (roll < 0.95) cache.delete(key);
      else cache.resize(1 + Math.floor(Math.random() * 5));

      const keys = cache.keys();
      assert.ok(cache.size <= cache.capacity, `size ${cache.size} > capacity ${cache.capacity}`);
      assert.equal(new Set(keys).size, keys.length, 'duplicate key');
      assert.equal(keys.length, cache.size, 'keys() and size disagree');
    }
  }
});
```

WHY: `while` rather than `if` is the bug this exercise exists to prevent — shrinking 5 to 2 needs three evictions, and `set`'s single `if` is only correct because `set` adds one entry at a time. The fuzz test is the real lesson: instead of imagining which sequence might break, you assert the *invariants* the structure promises and let 40,000 random operations hunt for a counterexample. Those three invariants are exactly the ones the original two-structure version could not hold — its `order` array duplicated keys and disagreed with `cache` — so this test is a direct, mechanical statement of why one Map beats two containers. Verified by running: 500 trials × 80 operations pass, `resize(2)` leaves `['d','e']`, and `resize(0)` throws.
