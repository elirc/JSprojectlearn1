# 📘 Learning Guide: Generic LRU Cache

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What is this exercise about?

A **cache** is a small stash of recently-used values kept close at hand so you don't recompute or refetch them. Since memory is finite, a cache needs an eviction rule; **LRU** ("least recently used") is the classic one — when full, throw out the entry nobody has touched for the longest time. This exercise's cache is a class built on a `Map`, exploiting a handy `Map` property: it remembers insertion order, so "delete + re-insert on every read" keeps the *oldest-untouched* entry first in line for eviction.

The runtime logic here is correct. The problem is purely type-level: the class hardwires `Map<any, any>`, so a cache built for "users by numeric id" happily accepts string keys, string values, and hides its own misses. The refactor makes the class **generic** — `LruCache<K, V>` — so each *instance* declares what it holds, and `get` honestly returns `V | undefined`.

## 2. Concepts you need first

### Caches and LRU eviction
Picture a cache of capacity 2: you `set(a)`, `set(b)` — full. Reading `a` marks it recently used. Now `set(c)` must evict someone: LRU evicts `b` (least recently used), keeping `a` and `c`. The point: keep hot data, drop cold data, never grow past capacity.

### `Map`, insertion order, and iterators
A `Map` is JavaScript's real key-value collection — unlike plain objects, *any* value can be a key, and `7` (number) and `'7'` (string) are genuinely different keys. Two facts this class leans on:
- A `Map` iterates in insertion order, and *re*-inserting a key moves it to the back. So `delete(key); set(key, value)` = "mark as most recently used."
- `map.keys()` returns an **iterator** (a step-by-step value producer); `.next().value` grabs the first key — which, by the above, is the least recently used one.

### `any` — and why containers make it worse
`any` disables checking: every operation on an `any` compiles, and `any` results spread into whatever touches them. A container (cache, queue, registry) is *infrastructure* — many features flow through it — so `any` inside a container leaks into every consumer. Blast radius, maximized.

### Generic classes
You've seen generic *functions* (exercise 16's territory: one function, a type placeholder per call). A **generic class** declares placeholders once, at the class, and every method shares them:

```ts
class Box<T> {
  private item: T | undefined;
  put(item: T): void { this.item = item; }
  take(): T | undefined { return this.item; }
}
const nums = new Box<number>();
nums.put(5);        // ✅ OK
nums.put('five');   // ❌ Error: string is not a number
```

The key idea: **each instance binds its own types.** `new Box<number>()` and `new Box<string>()` are the same class but incompatible types — one implementation, per-instance guarantees.

### Honest maybe-returns: `V | undefined`
A cache read can miss — the key may not be there (or was evicted). A typed container says so in the signature: `get(key: K): V | undefined`. Callers must narrow before use:

```ts
const user = cache.get(7);   // User | undefined
user.name;                   // ❌ Error: 'user' is possibly 'undefined'
if (user !== undefined) {
  user.name;                 // ✅ OK
}
```

An `any`-returning `get` hides the miss case entirely — that's the difference between a typed container and a typed-*looking* one. (Exercise 05 covers null-safety.)

### `#private` fields
`#entries` (with the hash) is JavaScript's own private-field syntax — truly inaccessible from outside the class, enforced at runtime, not just by the type checker (unlike the `private` keyword, which is compile-time only).

### Contained unsafety: the audited `!` and `as`
Sometimes *you* know something the type checker can't prove. Two examples live in this class:
- `this.#entries.get(key)!` — the `!` (non-null assertion) is justified because the line above checked `has(key)`. Guarded, adjacent, auditable.
- `this.#entries.keys().next().value as K` — the iterator's type can't express "this map is non-empty right now" (we just checked `size > capacity`), so a cast bridges the gap.

The pattern: unsafe steps are allowed *inside* a component, sealed next to the checks that justify them, while the public signatures stay honest. What's forbidden is unsafety leaking into the interface.

### Getters
`get size(): number { ... }` defines a **getter** — a method accessed like a property: `cache.size`, no parentheses.

## 3. Walking through the original code

The hardwired storage:

```ts
export class LruCache {
  private entries = new Map<any, any>();
```

One class, and every instance forever holds "anything to anything." The constructor validates capacity properly (a loud `RangeError` for bad input — the runtime discipline is genuinely good).

The read path:

```ts
get(key: any): any {
  if (!this.entries.has(key)) return undefined;
  const value = this.entries.get(key);
  this.entries.delete(key);
  this.entries.set(key, value);
  return value;
}
```

Correct LRU: a hit refreshes recency by delete + re-insert. But `get(key: any): any` — any key accepted, and the return type hides both "wrong type stored" and "not found."

The write path evicts correctly too:

```ts
if (this.entries.size > this.capacity) {
  const oldest = this.entries.keys().next().value;
  this.entries.delete(oldest);
}
```

Then the demo shows the types betraying the runtime:

```ts
const userCache = new LruCache(100);
userCache.set(7, { id: 7, name: 'Ada' });
userCache.set('7', 'seven');
```

A **string** key and a string value enter the numeric-id user cache. `Map` keeps them as *separate entries* — `get(7)` and `get('7')` return different things. That key-type precision is exactly why the JS version chose `Map`... and `any` just threw the benefit away.

The three crashes-in-waiting: `userCache.get('7').name.toUpperCase()` (the value is the string `'seven'`; `.name` is `undefined`; boom), and `userCache.get(999).name` (a miss returns `undefined`; boom). All fully compiled, zero warnings.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: keys of the wrong type slip in.** Runtime story: one call site reads an id from a URL — where everything is a string — and forgets to convert. `cache.set('7', ...)` and `cache.get(7)` now talk past each other: the cache "loses" entries that are right there under the other key. Symptom: mysterious cache misses, doubled network requests, and an eventual crash when the string-keyed entry surfaces somewhere expecting a `User`. The `'7'` vs `7` confusion is precisely what Maps exist to prevent — `any` re-opened the hole at the type level.

**Flaw 2: wrong values join the pool.** `set(7, 'seven')` compiles. Whoever later reads key 7 gets a string wearing a `User` costume. `.name.toUpperCase()` crashes — far from the write that caused it.

**Flaw 3: the hidden miss.** Every cache read can miss; that's what caches *do*. `get(): any` erases that fact, so `get(999).name` compiles. The most common cache bug — forgetting to handle the miss — is invisible.

**Flaw 4: infrastructure amplifies.** This isn't one bad function; it's a container many features flow through. Every consumer inherits `any` results and spreads them further. Fixing the container fixes every consumer at once — which is also why it's worth doing properly.

## 5. Try it yourself first!

1. **Vague hint:** the runtime code is finished — don't touch the algorithm. Only the *types* forget things. What single feature lets a class remember "what do I hold" per instance?
2. **Warmer:** add two type parameters to the class: `class LruCache<K, V>`. Where do `K` and `V` need to appear? (The Map, and every method signature.)
3. **Warmer still:** what should `get` return, honestly? Not `V` — the key might be absent or evicted. Say so in the type.
4. **Specific:** after the generics, two lines will complain: `entries.get(key)` (possibly undefined — you just checked `has`, so a `!` with a comment is fair) and `keys().next().value` (the iterator can't know the map is non-empty — `as K` with a comment). Keep both *inside* the class, next to their justifications.
5. **Prove it:** construct `new LruCache<number, User>(100)` and try the original's four abuses (string key, string value, unchecked `.name` on a miss, assigning a `LruCache<string, string>` to a `LruCache<number, User>` variable). All four should be compile errors — keep them as `@ts-expect-error` tests.

## 6. Understanding the refactored solution

The declaration:

```ts
export class LruCache<K, V> {
  #entries = new Map<K, V>();
  #capacity: number;
```

`K` and `V` are declared once and shared by every method. The internal Map is typed with them, so even the *implementation* is checked against the promise. The body is byte-for-byte the JS version's — generics changed no behavior, only what the compiler knows.

The honest read:

```ts
get(key: K): V | undefined {
  if (!this.#entries.has(key)) return undefined;
  const value = this.#entries.get(key)!; // one contained ! — guarded by has()
  this.#entries.delete(key);
  this.#entries.set(key, value);
  return value;
}
```

`key: K` — only the right key type enters. `V | undefined` — the miss is in the signature, so callers must narrow (the usage example shows the shape: check `=== undefined`, then use). The `!` is the contained-unsafety pattern: `Map.get` is typed `V | undefined` because *in general* the key may be absent — but the line above proved it's present. The assertion sits adjacent to its guard, auditable in one glance.

The eviction cast:

```ts
const oldest = this.#entries.keys().next().value as K;
```

We only reach this line when `size > capacity`, so the map is non-empty and `.next().value` is a real key — but the iterator's type can't carry that knowledge, so `as K` bridges it. Again: sealed inside, commented, with honest signatures outside.

The usage section is the punchline of generics:

```ts
const userCache = new LruCache<number, User>(100);
const slugCache = new LruCache<string, string>(50);
```

Same class, two instances, two contracts. And the four type tests lock in everything the original allowed: string key rejected, string value rejected, unchecked `.name` on a possible miss rejected, and cross-instance assignment (`slugCache` as a user cache) rejected.

The README's last note connects forward: with this class, a memoizer (remembering function results) upgrades naturally from an unbounded `Map` to a typed, capacity-capped `LruCache<string, R>` — containers done right compose into everything above them.

## 7. Words you learned (glossary)

- **Cache** — a stash of recently-used values to avoid recomputing/refetching.
- **Eviction** — removing an entry to stay within capacity.
- **LRU (least recently used)** — evict the entry untouched the longest.
- **Capacity** — the maximum number of entries a cache holds.
- **`Map`** — JS's key-value collection; keys keep their type (`7` ≠ `'7'`) and insertion order is preserved.
- **Recency refresh** — delete + re-insert on read, moving an entry to "most recent."
- **Iterator** — an object producing values one `.next()` at a time (`map.keys()`).
- **Generic class** — a class with type parameters (`LruCache<K, V>`) declared once, shared by all methods.
- **Type parameter binding** — each instance fixing its own `K`/`V` at construction.
- **Honest maybe-return** — `V | undefined`: the miss case stated in the signature.
- **Narrowing** — checking `undefined` (or a tag) so the compiler shrinks the type.
- **`#private` field** — runtime-enforced privacy, JavaScript-native.
- **Getter** — a method read like a property (`cache.size`).
- **Non-null assertion (`!`)** — "trust me, not undefined"; acceptable only adjacent to the check that proves it.
- **Contained unsafety** — assertions sealed inside a component, next to their justifications, behind honest public signatures.
- **Blast radius** — how far a bad type spreads; containers maximize it.
- **`@ts-expect-error`** — a comment asserting the next line must fail to compile.

## 8. Experiments to try on the plane (no internet needed)

Run `npm run typecheck` from the `typescript/` folder after each change (then undo it).

1. **Let inference do the binding.** In `refactored/lru-cache.ts`, add `const inferred = new LruCache<string, number>(10); inferred.set('a', 1);` then try `inferred.set('b', 'two');`. Expected: ❌ the second set errors — the instance's `V` is `number`, forever.
2. **Feel the honest miss.** Add `const u = userCache.get(7); const n = u.name;`. Expected: ❌ "'u' is possibly 'undefined'". Wrap it in `if (u !== undefined) { ... }`. Expected: ✅ — the signature forced the one check every cache caller should write.
3. **Remove the contained `!`.** Delete the `!` after `this.#entries.get(key)`. Expected: ❌ the method no longer compiles ("possibly undefined") — showing the assertion is doing real, local work right next to its `has()` guard.
4. **Constrain the keys.** Change the class line to `class LruCache<K extends string | number, V>`. Expected: ✅ still compiles here (both instances qualify) — but a hypothetical `new LruCache<boolean, string>(5)` would now be rejected. Constraints let a container document what keys it's meant for.
5. **Add a typed method.** Implement `delete(key: K): boolean { return this.#entries.delete(key); }` and call `userCache.delete('7')`. Expected: ❌ string rejected on the number-keyed instance — new methods inherit the instance's contract automatically; that's the "declare once, every method shares it" promise.
