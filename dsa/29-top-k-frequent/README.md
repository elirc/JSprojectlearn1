# 29 — Top K Frequent Elements

Given an array of values, return the `k` that show up most often. Counting is
the easy half — you did that in dsa/07. The interesting half is picking the
top `k` *without* sorting all the counts, which is what a **heap** is for.

**The order of your returned array does not matter.** The tests sort both
your result and the expectation before comparing, so `[1, 2]` and `[2, 1]`
both pass.

## Signature

```js
/**
 * @param {Array<number|string>} nums - the values to count (not modified)
 * @param {number} k - how many of the most frequent values to return
 * @returns {Array<number|string>} the k most frequent values, in any order
 */
export function topKFrequent(nums, k) { ... }
```

## Worked examples

| Input | Output | Why |
|-------|--------|-----|
| `topKFrequent([1,1,1,2,2,3], 2)` | `[1, 2]` | counts are 1→3, 2→2, 3→1; take the top two |
| `topKFrequent([4,4,9,9,9,7], 3)` | `[4, 9, 7]` | k equals the distinct count, so everything comes back |
| `topKFrequent(["a","a","a","b","b","c"], 2)` | `["a", "b"]` | strings count just the same as numbers |
| `topKFrequent([1,1,2], 0)` | `[]` | zero of anything is nothing |

Any ordering of those outputs is accepted.

## Constraints & edge cases

- Return the **values**, not their counts. `[1,1,1,2,2,3]` with k=2 is
  `[1, 2]`, never `[3, 2]`.
- **Order is unspecified** — the tests normalise with
  `[...result].sort(...)` before comparing.
- Test inputs always have an **unambiguous top k**: there is never a
  frequency tie straddling the k boundary, so you never need a tie-break rule.
- `k === 0` returns `[]`. `k` equal to the number of distinct values returns
  all of them.
- Values may be negative, zero, or strings. `nums` must not be modified.
- Target complexity: O(n log k) time, O(n) space. Counting everything and
  sorting the distinct values is O(n log n) — fine, but not the target. (When
  `k` is close to the distinct count the two are the same thing; the heap
  wins when `k` is small and the distinct count is huge.)

## Hints (take them one at a time!)

1. Two separate jobs. First, "how many times does each value appear?" — a
   `Map` and one pass, exactly like dsa/07 and dsa/08. Second, "which `k` of
   those entries have the biggest counts?" Solve them one at a time.
2. For the second job, you never need the counts *sorted* — you only ever
   need to know **which survivor is currently the weakest**, because that's
   the one to throw away when a better candidate shows up. A structure that
   keeps the smallest item permanently at the front does that in O(log k).
   dsa/14's min-stack was a special case of the same idea.
3. Build a **min-heap** keyed on `count`: a flat array where the item at
   index `i` has children at `2*i + 1` and `2*i + 2`, and every parent's
   count is `<=` its children's. `push` appends then bubbles up; `pop` takes
   index 0, moves the last item there, then sinks it down. Then: push each
   `{ value, count }`, and whenever the size exceeds `k`, pop. LEARN.md
   builds the heap from scratch if this is new.

## Run it

```
node --test dsa/29-top-k-frequent/attempt.test.js
```
