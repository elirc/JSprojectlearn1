# 🏋️ Practice: Priority Queue

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

Exercises 4 and 5 add code — work on a **copy** of `refactored/heap.js` / `scheduler.js`. Exercises 1, 2, 3 and 6 build *on top* of the heap without changing it.

## Exercises

### ⭐ 1. A heap is not a sorted array (warm-up)

Push `5, 3, 8, 1, 9, 2` into a `BinaryHeap((a, b) => a - b)` and print `toArray()`. *Before running*, predict it. Then write assertions proving three things at once: the raw array is **not** sorted, every parent is `<=` both its children (loop `i` from 1 and check index `(i - 1) >> 1`), and popping until empty nevertheless yields `[1, 2, 3, 5, 8, 9]`.

What it practices: separating the promise a structure actually makes ("parents beat children") from the stronger one you assumed it made ("everything is in order").

Hint: the parent check is one line inside a `for` loop — `assert.ok(raw[(i - 1) >> 1] <= raw[i])`.

### ⭐⭐ 2. heapSort(items, compare) (core)

Write a pure sorting function using nothing but the heap: push everything in, pop everything out, return the results. It must not modify the input array, must return `[]` for an empty input, and must work for strings with `(a, b) => a.localeCompare(b)`. Then fuzz it: 200 trials of 50 random numbers, asserting your result equals `[...arr].sort((a, b) => a - b)` every time.

What it practices: recognising that you have just built a real O(n log n) sorting algorithm out of two methods — and using the built-in `sort` as an **oracle** to check yourself against.

Hint: `for (const item of items) heap.push(item)` then `while (heap.size > 0) sorted.push(heap.pop())`. Nothing clever.

### ⭐⭐ 3. topK — the best k of a million (core)

You have a huge stream of scores and want the top 3. Sorting all of them is O(n log n) and needs all of them in memory at once. Write `topK(items, k, compare)` that holds **at most k items** by keeping a heap ordered *worst-first*: push each item, and if the heap now holds more than `k`, pop — which throws away the current worst. Return the k best in best-first order. Check offline with `[7, 2, 9, 4, 9, 1, 6]`: `k=3` → `[9, 9, 7]`, `k=0` → `[]`, `k=100` → all 7 sorted, empty input → `[]`, `k=-1` → `RangeError`.

What it practices: the counter-intuitive trick that you keep the *best* items by building a heap that surfaces the *worst* one — because the worst is the only one you ever need to identify.

Hint: flip the comparator with `(a, b) => compare(b, a)`, and remember the final popping order is worst-first, so `.reverse()` at the end.

### ⭐⭐ 4. cancel() by lazy deletion (core)

Real schedulers cancel work. Add `cancel(name)` to a copy of `TaskScheduler`, returning `true` if it cancelled something and `false` if the name wasn't queued or was already cancelled. The catch: a heap cannot cheaply remove an item from the *middle*. So don't — record the name in a `Set` and discard it when it reaches the front. `size`, `peek` and `next` must all report as if it were gone immediately. Check offline: queue `charge-card`(1), `send-otp`(1), `rebuild-index`(9); `cancel('charge-card')` → `true`, again → `false`, `cancel('never-queued')` → `false`, `size` → 2, `peek()` → `send-otp`. Then repeat but cancel `rebuild-index` (the item at the *back*) and check `size` is still 2 straight away.

What it practices: **lazy deletion** — when removal is expensive, mark instead of remove, and pay at read time. It's the same instinct as project 41's "expire on read."

Hint: one private `#discardCancelled()` that all three public methods call first, and `size` = `queue.size - cancelled.size`.

### ⭐⭐⭐ 5. heapify — build a heap in O(n) (challenge)

Pushing n items costs O(n log n). Turning an array you *already have* into a heap costs only **O(n)** — because most items are leaves and leaves need no work at all. Write `buildHeapArray(items, compare)` that copies the input, then calls sift-down on every index from `(length >> 1) - 1` **down to 0**. Check offline with `[9, 4, 7, 1, 8, 2, 6, 3, 5]`: the result must satisfy the parent rule at every index, start with `1`, and contain exactly the same nine numbers. `[]` and `[5]` must survive unchanged.

What it practices: reading a loop's bounds as an argument. Two questions to answer in a comment: why start at `(length >> 1) - 1`, and why go *downwards*?

Hint: indexes from `length >> 1` onward have no children — they are already legal one-item heaps. And sift-down assumes both subtrees below it are already heaps, which is only true if you fix the deepest rows first.

### ⭐⭐⭐ 6. Merge k sorted lists (challenge)

Merge any number of already-sorted lists into one sorted list, without concatenating and re-sorting. Write `mergeSorted(lists, compare)` that pushes the *first* item of each non-empty list into a heap, then repeatedly pops the winner and pushes the next item from whichever list it came from. The heap therefore never holds more than k items no matter how long the lists are — this is how database merge-joins and log aggregators work on files too big for memory. Check offline: `[[1,4,9],[2,3],[5]]` → `[1,2,3,4,5,9]`; `[]` → `[]`; `[[],[]]` → `[]`; `[[7]]` → `[7]`; `[[1,1],[1]]` → `[1,1,1]`. Then fuzz 300 trials against `lists.flat().sort()`.

What it practices: putting a *cursor* in the heap rather than a value — the item you push carries "which list, which position" so you know what to pull next.

Hint: push `{ value, listIndex, offset }` and compare only on `.value`.

## Solutions

### 1. A heap is not a sorted array

```js
const heap = new BinaryHeap((a, b) => a - b);
for (const n of [5, 3, 8, 1, 9, 2]) heap.push(n);

const raw = heap.toArray();
assert.deepEqual(raw, [1, 3, 2, 5, 9, 8]);                     // the real layout
assert.notDeepEqual(raw, [...raw].sort((a, b) => a - b));      // NOT sorted
for (let i = 1; i < raw.length; i++) {
  assert.ok(raw[(i - 1) >> 1] <= raw[i]);                      // ...but legal
}

const popped = [];
while (heap.size > 0) popped.push(heap.pop());
assert.deepEqual(popped, [1, 2, 3, 5, 8, 9]);                  // and correct
```

WHY: `[1, 3, 2, 5, 9, 8]` is the punchline of the whole project. Reading left to right it looks wrong — 3 before 2, 9 before 8 — and it is *perfectly* correct, because siblings were never promised anything about each other. The heap only guarantees a chain of "beats" from the root to every leaf, and that chain is all a priority queue needs. Everything the heap is faster at, it is faster at because of what it declines to promise. Verified by running.

### 2. heapSort

```js
export function heapSort(items, compare) {
  const heap = new BinaryHeap(compare);
  for (const item of items) heap.push(item);
  const sorted = [];
  while (heap.size > 0) sorted.push(heap.pop());
  return sorted;
}
```

```js
test('heapSort matches the built-in sort on random input', () => {
  for (let trial = 0; trial < 200; trial++) {
    const input = Array.from({ length: 50 }, () => Math.floor(Math.random() * 100));
    assert.deepEqual(heapSort(input, (a, b) => a - b), [...input].sort((a, b) => a - b));
  }
});
```

WHY: n pushes at O(log n) plus n pops at O(log n) is O(n log n) — the same complexity class as the built-in sort, from six lines that contain no sorting logic at all. It falls out because a data structure that always knows its minimum, asked repeatedly, *is* a sort. The fuzz test uses **oracle testing** (project 72 does the same against `RegExp`): you don't have to invent hard cases when a trusted implementation can produce the expected answer for you. Note the copy — `heapSort` reads the input and never mutates it, unlike `Array#sort`, which sorts in place and surprises people. Verified by running: strings, numbers, empty input and 200 random trials all pass.

### 3. topK

```js
export function topK(items, k, compare) {
  if (!Number.isInteger(k) || k < 0) {
    throw new RangeError(`k must be a non-negative integer, got ${k}`);
  }
  const worstFirst = new BinaryHeap((a, b) => compare(b, a)); // flipped!
  for (const item of items) {
    worstFirst.push(item);
    if (worstFirst.size > k) worstFirst.pop(); // evict the current worst
  }
  const best = [];
  while (worstFirst.size > 0) best.push(worstFirst.pop());
  return best.reverse();
}
```

WHY: the flipped comparator is the trick people find backwards, and it's worth sitting with. To *keep* the best k, the only question you ever ask is "which of my k is worst?" — because that's the one a newcomer has to beat. So build the heap that answers *that* question in O(1). Memory is O(k), not O(n), so this runs over a billion-row stream on a laptop; cost is O(n log k), which for k=3 is barely more than a single scan. `k=0` returning `[]` works with no special case (`size > 0` pops immediately every time), and `k` larger than the input just never triggers an eviction. Verified by running all five checks.

### 4. cancel() by lazy deletion

```js
#cancelled = new Set();

cancel(name) {
  if (this.#cancelled.has(name)) return false;
  if (!this.#queue.toArray().some((task) => task.name === name)) return false;
  this.#cancelled.add(name);
  return true;
}

/** Throw away cancelled tasks that have reached the front. */
#discardCancelled() {
  while (this.#queue.size > 0 && this.#cancelled.has(this.#queue.peek().name)) {
    this.#cancelled.delete(this.#queue.pop().name);
  }
}

get size() {
  this.#discardCancelled();
  return this.#queue.size - this.#cancelled.size;
}
peek() { this.#discardCancelled(); return this.#queue.peek(); }
next() { this.#discardCancelled(); return this.#queue.pop(); }
```

WHY: a heap has no cheap "remove that one in the middle" — finding it is O(n) and repairing the hole is fiddly. Lazy deletion sidesteps the problem entirely: cancelling is a `Set.add`, and the cost is paid by whoever reads next, one pop at a time. The `while` (not `if`) matters — several cancelled tasks can be stacked at the front. Subtracting `cancelled.size` is what makes `size` honest *immediately*, even for a task cancelled at the back that the discard loop hasn't reached; it stays correct because a name only enters the set after we confirm it's queued, and leaves the set the moment it's discarded. **Known limitation**, worth a comment in real code: two queued tasks sharing a name would make the count drift — key the set by the task object or its `seq` if names aren't unique. Verified by running both the front-cancel and back-cancel sequences.

### 5. heapify

```js
export function buildHeapArray(items, compare) {
  const a = [...items];
  const siftDown = (i) => {
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let best = i;
      if (left < a.length && compare(a[left], a[best]) < 0) best = left;
      if (right < a.length && compare(a[right], a[best]) < 0) best = right;
      if (best === i) return;
      [a[i], a[best]] = [a[best], a[i]];
      i = best;
    }
  };
  // Start at the last node that HAS a child, and walk upwards.
  for (let i = (a.length >> 1) - 1; i >= 0; i--) siftDown(i);
  return a;
}
```

WHY: the two loop questions answer each other. Indexes from `length >> 1` onward have no children — roughly *half* the array — so they are already valid one-element heaps and touching them would be wasted work. And you must go *downwards* (from the deepest parents to the root) because sift-down is only correct when the two subtrees beneath the node are already heaps; fix the bottom rows and each higher row can rely on them. That's why the total is O(n) rather than O(n log n): the many nodes near the bottom sink at most one or two levels, and only the single root can travel the full height. `[9,4,7,1,8,2,6,3,5]` becomes `[1,3,2,4,8,7,6,9,5]` — the minimum surfaced to index 0 without a single comparison between, say, 5 and 6. Verified by running, including `[]` and `[5]`.

### 6. Merge k sorted lists

```js
export function mergeSorted(lists, compare) {
  const heap = new BinaryHeap((a, b) => compare(a.value, b.value));
  lists.forEach((list, listIndex) => {
    if (list.length > 0) heap.push({ value: list[0], listIndex, offset: 0 });
  });

  const merged = [];
  while (heap.size > 0) {
    const { value, listIndex, offset } = heap.pop();
    merged.push(value);
    const next = offset + 1;
    if (next < lists[listIndex].length) {
      heap.push({ value: lists[listIndex][next], listIndex, offset: next });
    }
  }
  return merged;
}
```

WHY: the heap holds **cursors, not data** — one bookmark per list, never more than k items regardless of whether the lists hold ten rows or ten billion. Each pop is O(log k) and there are n pops, so the whole merge is O(n log k) in O(k) memory, which is exactly why external sorting, database merge-joins and log aggregators are built this way: the lists can live on disk and stream past. The `if (list.length > 0)` guard is what makes the empty cases free — an empty list simply never gets a cursor, so `[]` and `[[],[]]` need no special handling. Notice too that the comparator is *composed*: `(a, b) => compare(a.value, b.value)` wraps the caller's rule for the cursor wrapper, which is only possible because the heap never assumed what it was ordering. Verified by running all five checks plus 300 fuzz trials against `lists.flat().sort()`.
