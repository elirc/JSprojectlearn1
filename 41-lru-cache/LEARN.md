# 📘 Learning Guide: LRU Cache

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A **cache** with a size limit that automatically throws out the item you've gone longest without using. Think of a tiny desk with room for 3 books: every time you grab a book, it goes on top of your "recently used" pile; when a 4th book arrives, the one you haven't touched the longest goes back to the shelf.

```
put a, put b, put c        → desk holds: a b c
read a  (a is "hot" now)
put d   (desk is full!)    → throw out b (longest untouched)
desk now holds: c, a, d — with a safe, because you just used it
```

That policy — evict the **L**east **R**ecently **U**sed item — is how browser caches and database memory buffers work. The original version evicts the *wrong* item; the refactor gets it right with less code.

## 2. Concepts you need first

### What a cache is, and why evict

A **cache** stores results that were expensive to get (a network download, a big computation) so the next request is instant. Memory isn't infinite, so a cache has a **capacity** (max items). When full, it must **evict** (remove) something. LRU's bet: the item you haven't used in the longest time is the least likely to be needed next.

### Objects vs Map for key→value storage

A plain object can store values by key (`cache["a"] = 1`), but a **Map** is built for it — and has a superpower this project depends on: **a Map remembers the order keys were inserted**, and looping over it replays that order:

```js
const m = new Map();
m.set("x", 1); m.set("y", 2); m.set("x", 99); // updating "x" keeps its old spot
console.log([...m.keys()]); // prints: [ 'x', 'y' ]
m.delete("x"); m.set("x", 99);                // delete THEN set = moves to the end
console.log([...m.keys()]); // prints: [ 'y', 'x' ]
```

That delete-then-set trick is the entire engine of the refactor: "I just used this" = move it to the end of the Map.

### Iterators and `.next()`

`m.keys()` doesn't give an array — it gives an **iterator**, an object you pull values from one at a time by calling `.next()`:

```js
const m = new Map([["a", 1], ["b", 2]]);
const it = m.keys();
console.log(it.next().value); // prints: a   (the FIRST = oldest key)
```

So `m.keys().next().value` is a one-line way to ask "what's the oldest entry?" — exactly what LRU needs to evict. `[...m.keys()]` spreads the iterator into a real array.

### Array `shift` (and why the original is slow-ish)

`arr.shift()` removes and returns the *first* element. The original uses an array as an age queue: oldest at position 0. `indexOf` and `splice` (find and remove from the middle) have to scan the array — that's **O(n)** work per operation (work grows with size). Map's get/set/delete are **O(1)** — constant time, no matter how big.

### Classes, private fields, getters

A **class** bundles data with methods. `#entries` is a **private field** — code outside the class cannot touch it, so nobody can corrupt the cache's internal order. A **getter** (`get size() {...}`) is read like a property: `cache.size`, no parentheses. Validating inputs in the **constructor** (`new LruCache(3)`) and throwing a `RangeError` for nonsense like capacity 0 keeps garbage out from the start.

### Invariants and sync rules

An **invariant** is a rule your data must always satisfy. When you keep *two* structures describing the same facts (an object of values + an array of ages), you've created a **sync rule**: every code path must update both, identically, forever. The refactor's punchline: use one structure that provides the property for free, and the sync rule stops existing.

## 3. Walking through the original code

Two structures, one implicit promise to keep them matching:

```js
var cache = {};
var order = [];      // order[0] = least recently used
var CAPACITY = 3;
```

`put` writes to both:

```js
function put(key, value) {
  cache[key] = value;
  order.push(key);   // BUG: if key already existed, it's now in the
                     // array TWICE
  if (order.length > CAPACITY) {
    var oldest = order.shift();
    delete cache[oldest];
  }
}
```

Store the value, append the key to the age list, and if over capacity, shift off the oldest key and delete it. Two bugs are already visible in the comments — hold that thought.

```js
function get(key) {
  return cache[key];
  // BUG: a get doesn't refresh recency!
}
```

`get` just reads. It never tells the `order` array "this key was just used." The demo shows the consequences: `"a"` is read (hot!), then `put("d", 4)` evicts... `"a"`. And updating `"b"` puts it in `order` twice, so the next eviction shifts the *stale duplicate* and deletes a key that's still listed as alive. The two structures now flatly disagree.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: `get` doesn't refresh recency — so it's not LRU at all.** LRU means "recently *used* items survive." This version only tracks recently *added*. Here's how it bites you: your app caches user profiles. The logged-in user's own profile is read on every single page — the hottest item imaginable — but because it was *added* first, it's the first thing evicted. Your busiest data gets thrown out over and over, and the cache mysteriously doesn't help performance.

**Flaw 2: updating a key duplicates it in `order`.** `order.push(key)` runs even if the key already exists. Now `order` says the cache holds 4 things when it holds 3. The next eviction `shift()`s the old duplicate of `"b"` and deletes `"b"` from the values — even though `order` still lists a newer `"b"`. From then on, every operation acts on lies, and each one compounds the disagreement. This is the tax of *two structures + a sync rule nobody enforces*.

**Flaw 3: the obvious patch is slow.** "Fine, before pushing, remove the old entry with `indexOf` + `splice`." That works, but it scans the whole array on every operation — O(n) — in the one component whose entire job is being fast.

## 5. Try it yourself first!

1. **Vague hint:** The bugs come from keeping two structures in sync. Is there one built-in structure that stores key→value *and* remembers order?
2. **Warmer:** A `Map` iterates in insertion order. What happens to a key's position if you `delete` it and `set` it again?
3. **Warmer still:** So "mark as just used" = delete + set. Which end of the Map is now the safest? Which end gets evicted?
4. **Almost the answer:** `get`: if present, delete + re-set the entry (moves it to the end), return the value. `set`: delete the key first (handles updates), set it, then if `size > capacity`, evict `map.keys().next().value` (the first = oldest key).
5. **Design question:** should `has(key)` also refresh recency? Decide, and write your reason as a comment — there's a defensible answer either way, but the refactor picks one.

## 6. Understanding the refactored solution

**One structure, zero sync rules:**

```js
export class LruCache {
  #entries = new Map();
  #capacity;
```

Just a Map. Position in the Map *is* the recency: first = coldest, last = hottest. There is no second structure to disagree with — the original's cache/order contradiction is now *unrepresentable*.

**The constructor rejects nonsense:**

```js
if (!Number.isInteger(capacity) || capacity < 1) {
  throw new RangeError(`Capacity must be a positive integer, got ${capacity}`);
}
```

A cache of capacity 0 or 2.5 is a caller bug — throw immediately with a clear message, rather than misbehaving later.

**`get` refreshes — the U in LRU:**

```js
const value = this.#entries.get(key);
this.#entries.delete(key); // move to the end:
this.#entries.set(key, value);
```

Reading an entry moves it to the end of the Map. That's the fix for Flaw 1, in two O(1) calls.

**`set` deletes first — one line, two bugs fixed:**

```js
this.#entries.delete(key); // updating a key also refreshes it
this.#entries.set(key, value);
if (this.#entries.size > this.#capacity) {
  const leastRecent = this.#entries.keys().next().value;
  this.#entries.delete(leastRecent);
}
```

Deleting before setting means updates can't duplicate (Flaw 2 gone) *and* an updated key counts as freshly used. Eviction is simply "delete the first key in the Map."

**`has` deliberately does NOT refresh.** Peeking ("is it in there?") shouldn't change an entry's fate. That's an **API design decision** — and there's a test pinning it down, so a future editor can't accidentally flip the behavior without a test failing.

**The tests** each guard one promise: eviction picks the oldest; a `get` rescues a hot item (the original's headline failure); updating never duplicates (`size` stays 3); `has` doesn't refresh; capacity 1 works; capacities 0 and 2.5 throw. Notice how tests turn design decisions into things that *can't silently change*.

## 7. Words you learned (glossary)

- **Cache** — a store of expensive-to-get results for fast reuse.
- **Capacity** — the cache's maximum item count.
- **Evict** — remove an item to make room.
- **LRU** — Least Recently Used: evict what you've gone longest without touching.
- **Hot / cold** — frequently used / rarely used.
- **Map insertion order** — Maps replay keys in the order they were inserted.
- **Iterator** — an object you pull values from one at a time with `.next()`.
- **O(1) / O(n)** — constant work per operation / work that grows with size.
- **shift / splice / indexOf** — remove first element / cut from the middle / scan for a position (the last two scan: O(n)).
- **Invariant** — a rule the data must always satisfy.
- **Sync rule** — the obligation to keep two structures matching (best avoided entirely).
- **Unrepresentable** — a wrong situation the data shape cannot even express.
- **Private field (`#`)** — class data outsiders can't touch.
- **Getter** — a method read like a property.
- **RangeError** — the error type for "a number outside the allowed range."
- **API design decision** — a deliberate, documented behavior choice (like `has` not refreshing).

## 8. Experiments to try on the plane (no internet needed)

1. **See Map order with your own eyes.** In a scratch file: `const m = new Map(); m.set('a',1); m.set('b',2); m.delete('a'); m.set('a',1); console.log([...m.keys()])`. Expected: `[ 'b', 'a' ]` — delete + set moved 'a' to the end.
2. **Replay the original's disagreement.** Run `original.js` and compare the final `cache` and `order` printouts. Expected: `order` contains a key that `cache` no longer has — the two structures disagree.
3. **Rescue test by hand.** With `LruCache(3)`: set a, b, c; `get('a')`; set d. Print `cache.keys()`. Expected: `[ 'c', 'a', 'd' ]` — b was evicted, a survived because you used it.
4. **Flip the `has` decision.** Temporarily make `has()` call `this.get(key) !== undefined` instead, and rerun the "has() peeks without changing recency" test in your head (or with node later). Expected: that test now fails — proof that the test was pinning down a real design choice. Undo your change.
5. **Add a `clear()` method.** One line: `this.#entries.clear()`. Then check `cache.size` is 0 after calling it. Expected: works without touching any other method — encapsulation means new doors don't disturb old ones.
