# Solution — Binary Search

## The naive approach and its cost

**Linear scan.** Look at every element until you find the target:

```js
for (let i = 0; i < nums.length; i++) if (nums[i] === target) return i;
return -1;
```

Correct, **O(n)**, and it ignores the single most useful fact you were
given: *the array is sorted*. On a million elements it does up to a
million comparisons; binary search does twenty.

`nums.indexOf(target)` is the same algorithm with the loop hidden. If
your solution is one line long, you haven't done the exercise.

**Recursive binary search.** The right idea, and often how it's first
taught, but it costs O(log n) stack frames and this problem asks for the
loop — because the loop is the version you'll actually reach for, and
the version whose off-by-one errors you need to have felt.

## The insight

Sorted means one comparison is worth *half the array*. If the middle
element is smaller than your target, then so is everything to its left —
all of it, ruled out, in one look. That is the entire idea; the rest is
bookkeeping done carefully.

The bookkeeping: keep two indexes, `low` and `high`, marking the
**closed window** `[low, high]` of positions still worth checking, and
maintain the invariant

> *if `target` is in the array at all, its index is between `low` and
> `high` inclusive.*

It is true at the start (`0` to `length - 1` is everywhere). Each turn
preserves it: after ruling out `mid` and one side, the target — if it
exists — is still inside the smaller window. When the window becomes
empty (`low > high`), the invariant says the target was nowhere: `-1`.

Reasoning through an invariant like that is how you write binary search
correctly *without* debugging it into shape.

## The approach, step by step

1. `let low = 0; let high = nums.length - 1;`
   For an empty array `high` is `-1`, so the loop never runs and you
   return `-1`. No special case needed.
2. `while (low <= high)` — **`<=`, not `<`**. When `low === high` the
   window still holds one candidate, and that candidate is often the
   answer.
3. `const mid = Math.floor((low + high) / 2);`
   Indexes must be integers; on an even-sized window this lands just
   left of centre, which is fine.
4. `if (nums[mid] === target) return mid;` — check the equal case
   first, so a hit exits immediately.
5. `if (nums[mid] < target) low = mid + 1; else high = mid - 1;`
   The `± 1` matters: `mid` has just been ruled out, and excluding it
   makes the window **strictly** smaller — which is what guarantees the
   loop ends.
6. After the loop: `return -1`.

Trace `binarySearch([1, 3, 5, 7, 9], 9)`:

| low | high | mid | nums[mid] | action        |
|-----|------|-----|-----------|---------------|
| 0   | 4    | 2   | 5         | too small → low = 3 |
| 3   | 4    | 3   | 7         | too small → low = 4 |
| 4   | 4    | 4   | 9         | **return 4**  |

And a miss, `binarySearch([1, 3, 5, 7, 9], 4)`:

| low | high | mid | nums[mid] | action        |
|-----|------|-----|-----------|---------------|
| 0   | 4    | 2   | 5         | too big → high = 1 |
| 0   | 1    | 0   | 1         | too small → low = 1 |
| 1   | 1    | 1   | 3         | too small → low = 2 |
| 2   | 1    | —   | —         | `low > high` → **-1** |

## Complexity

- **Time: O(log n).** The window halves every turn: 1000 → 500 → 250 →
  … → 1. About log2(n) steps — 10 for a thousand elements, 20 for a
  million, 30 for a billion. Doubling the data costs *one* extra step.
- **Space: O(1).** Three numbers, nothing allocated. (Recursion would
  be O(log n) stack.)
- Worth remembering: sorting first costs O(n log n), so binary search
  pays off when you search the same array many times, not once.

## Common mistakes

- **`while (low < high)`.** The one-element window never gets checked,
  so single-element arrays and any target that ends up alone return
  `-1`. This is the single most common binary-search bug.
- **`low = mid` or `high = mid`.** On a two-element window `mid` equals
  `low`, so the window stops shrinking and the loop spins forever.
  Always move *past* the middle.
- **Forgetting `Math.floor`.** `(0 + 3) / 2` is `1.5`; `nums[1.5]` is
  `undefined`, every comparison goes false, and the results are
  nonsense rather than an error.
- **`high = nums.length`.** Then `mid` can be the length itself and
  `nums[mid]` is `undefined`. Either use the closed window
  `[0, length - 1]` with `<=` (this solution), or the half-open window
  `[0, length)` with `<` — but pick one and keep it consistent; mixing
  them is where off-by-one bugs breed.
- **Returning a boolean.** The signature asks for an index, and `-1`
  when missing. (Note `0` is a perfectly good index and falsy — never
  test the result with `if (result)`.)
- **Assuming the array is sorted when it isn't.** Binary search on
  unsorted data returns confidently wrong answers, with no error. The
  precondition is part of the algorithm.
