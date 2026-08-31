# Solution walkthrough — Top K Frequent Elements

## The naive approach and its cost

Count into a `Map`, turn it into an array, sort it by count, slice off the
front:

```js
const counts = new Map();
for (const value of nums) counts.set(value, (counts.get(value) ?? 0) + 1);
return [...counts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, k)
  .map(([value]) => value);
```

Five lines, obviously correct, and — let's be honest — what you should
usually write at work. Its cost is **O(n + m log m)** where `m` is the number
of distinct values: linear counting, then a full sort of the distinct entries.

The waste is easy to name once you see it. You asked for the top 10 and the
sort dutifully put items 4,000 and 4,001 in the right order relative to each
other. Sorting answers "what is the exact rank of everything?" when the
question was "which few are at the top?"

That gap only matters when `m` is large and `k` is small — but that is
exactly the shape of the real problem this models: top 10 search queries out
of millions, top 20 error messages out of a day's logs.

## The insight

Keep a **shortlist of exactly `k` items** and walk the counts once, deciding
for each one: does this beat the worst thing on my shortlist?

That question needs only one thing from the shortlist — cheap access to its
weakest member. Not a sorted list. Not ranks. Just the minimum, plus the
ability to throw it out and put something else in.

A **min-heap** delivers precisely that: the smallest item sits at index 0
forever, and both "add an item" and "remove the smallest" cost O(log size).

So the loop is:

```
push the candidate
if the heap now holds more than k, pop
```

After every iteration the heap contains the k biggest counts seen *so far*.
That invariant is the proof: it holds trivially before the first push, each
step preserves it, and when the walk ends "so far" means "overall."

The counter-intuitive bit — **a MIN-heap to find the MAXIMUM items** — is
worth saying out loud. The item you interact with constantly is not the
winner; it is the current *worst survivor*, the one on the chopping block. A
min-heap parks exactly that item where you can reach it in O(1).

## The approach, step by step

1. **Guard `k <= 0`** and return `[]`. Otherwise a `size() > k` check with
   `k = 0` would pop from an empty heap.
2. **Count.** One pass into a `Map`:
   `counts.set(value, (counts.get(value) ?? 0) + 1)`. dsa/07's move exactly.
   A `Map` and not a plain object, because keys stay numbers and don't
   collide with prototype names.
3. **Write the `MinHeap` class.** Store items in a flat array `this.items`.
   Index math: `parent(i) = (i - 1) >> 1`, `left(i) = 2*i + 1`,
   `right(i) = 2*i + 2`. Order by `item.count`.
   - `push`: append, then `_bubbleUp` from the last index — swap with the
     parent while the parent's count is bigger.
   - `pop`: save `items[0]`, `items.pop()` the last item, and if the heap
     isn't now empty, write that last item into slot 0 and `_sinkDown` —
     repeatedly swap with the *smaller* of the two children while either is
     smaller than it.
4. **Walk the counted entries.** `heap.push({ value, count })`, then
   `if (heap.size() > k) heap.pop();`.
5. **Drain.** `while (heap.size() > 0) out.push(heap.pop().value);` Order is
   unspecified, so no further work is needed. (This happens to emerge in
   ascending count order — a free side effect, not a promise.)

## Complexity

- **Time O(n + m log k)**, conventionally written **O(n log k)**. The
  counting pass is O(n). Then each of the `m` distinct values does one push
  and at most one pop on a heap that never exceeds `k + 1` items, so O(log k)
  each. Since `m <= n`, that is O(n log k) overall.
- **Space O(m)** for the `Map` plus **O(k)** for the heap, so **O(n)** in the
  worst case where every value is distinct. The `Map` dominates, and you
  cannot avoid it — you have to count before you can rank.
- Versus the naive **O(n + m log m)**: with a million log lines, 50,000
  distinct messages, and `k = 10`, the sort does ~50,000 × 15.6 ≈ 780,000
  comparisons and the heap does ~50,000 × 3.3 ≈ 166,000. Real, but the same
  order of magnitude — the honest headline is that the heap's advantage grows
  as `k` shrinks relative to `m`, and it is unbeatable when the data streams
  past and you cannot hold it all at once.
- The bucket method in the variations is **O(n)** and beats both, at the cost
  of an array of size `n + 1`. Worth knowing; not worth pretending the heap
  is useless, since the heap generalises to streams and the bucket trick
  does not.

## Common mistakes

- **Returning the counts instead of the values.** `heap.pop()` gives you a
  `{ value, count }` — take `.value`. The `[22,22,22,22,22,11,11,33]` test
  is built so that returning counts and returning values can't be confused.
- **Using a max-heap.** Then the item at index 0 is your *best* survivor,
  which you never want to evict, and finding the worst one costs a linear
  scan. Push everything into a max-heap and pop `k` times and you're back to
  O(m log m) — correct, but you've rebuilt heap-sort.
- **`>=` instead of `>` in the size check.** `if (heap.size() >= k) pop()`
  evicts one item too eagerly and you end up returning `k - 1` values. The
  boundary test with counts 5/4/3/2 catches it.
- **Popping from an empty heap when `k` is 0.** Guard at the top.
- **Sinking down toward the larger child.** `_sinkDown` must swap with the
  *smaller* child; the larger one immediately re-breaks the heap property one
  level below.
- **Forgetting to shrink the array in `pop`.** Overwrite `items[0]` without
  removing the last element and the heap grows, holding that item twice.
- **Reaching for `sort` inside the loop.** Re-sorting a k-element shortlist
  on every candidate is O(m · k log k) — worse than just sorting once.
