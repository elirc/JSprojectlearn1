# Solution walkthrough — Quick Select (kth smallest)

## The naive approach and its cost

The obvious answer is one line:

```js
return [...arr].sort((a, b) => a - b)[k - 1];
```

It is correct, and for most real code it is the right call. But look at what
you paid for: sorting puts **all n** elements in order — it answers "what is
the 1st smallest, and the 2nd, and the 3rd, ... and the n-th" — when you asked
one question. That's O(n log n) work for an O(n)-sized answer.

A slightly cleverer naive version: scan for the minimum, remove it, repeat k
times. That's O(n·k) — fine for k = 3, catastrophic for k = n/2, which is
exactly the "find the median" case people actually want.

The question that leads somewhere: *is there a way to eliminate a big chunk of
the array per pass, without ordering what's left?*

## The insight

**Partitioning gives you one element's final position for free.**

Pick any value in the array — call it the *pivot*. Rearrange the array so that
everything smaller than the pivot ends up to its left and everything else to
its right. You have not sorted either side; you have no idea what order they
are in. But the pivot itself is now at index `p`, and `p` is **exactly** where
a full sort would have put it, because exactly `p` elements are smaller.

So after one O(n) pass you can compare `p` with the target index `k - 1`:

- `p === k - 1` — the pivot is the answer. Stop.
- `k - 1 < p` — the answer is somewhere in the left chunk. **The entire right
  chunk is irrelevant.** Never look at it again.
- `k - 1 > p` — mirror image; discard the left chunk.

That "throw one side away" is the whole difference from dsa/21. Merge sort
recursed into *both* halves, so every element got touched at every level:
O(n log n). Quick select recurses into *one*, so the amount of live data halves
each pass: n + n/2 + n/4 + ... ≈ 2n, which is O(n). It is dsa/19's binary
search move — discard the region that cannot contain the answer — except the
array isn't sorted, so you have to *manufacture* the split each time.

## The approach, step by step

1. **Copy the input.** `const a = [...arr];` Partitioning is destructive and
   the contract promises the caller's array survives.
2. **Convert the rank to an index.** `const target = k - 1;` Do this once, at
   the top, and never think about 1-based again.
3. **Keep a live window** `lo = 0`, `hi = a.length - 1`. The invariant that
   makes this work: *the answer is always somewhere inside `a[lo..hi]`.*
4. **Loop while `lo < hi`.** Partition `a[lo..hi]`, getting back the pivot's
   resting index `p`, then:
   - `p === target` → `return a[p]`
   - `target < p` → `hi = p - 1`
   - else → `lo = p + 1`
5. **When the window collapses** (`lo === hi`), that one slot must be the
   answer — return `a[lo]`.
6. **The partition itself** (Lomuto): choose `mid` as the pivot slot, swap it
   to `hi` to get it out of the way, then walk a `read` pointer from `lo` to
   `hi - 1` behind a `write` pointer. Every time `a[read] < pivot`, swap it to
   `write` and advance `write`. This is literally dsa/05's move-zeroes write
   pointer, with "is nonzero" swapped for "is less than the pivot." Finish by
   swapping the pivot from `hi` into `write`, and return `write`.

Two details worth arguing about:

- **A loop, not recursion.** The recursive call would be the very last thing
  the function does (a *tail call*), so it carries no information back — you
  can just reassign `lo`/`hi` and go around again. That drops the stack from
  O(log n) to O(1) and removes any stack-overflow worry.
- **Middle element as pivot, not last.** Taking `a[hi]` is the textbook
  version and it is a trap: on already-sorted input the last element is the
  largest, the partition peels off exactly one element, and you get n passes
  of O(n) work — O(n²) on the most common input shape in the world. The middle
  element is deterministic (so tests stay reproducible) and immune to that.

## Complexity

- **Time O(n) average.** Each partition is O(size of window). A "typical"
  pivot lands somewhere near the middle, so the window shrinks geometrically:
  n + n/2 + n/4 + ... The sum of that series is under 2n, so it's linear —
  strictly better than sorting.
- **Time O(n²) worst case.** If every pivot is the smallest or largest element
  of its window, each pass removes only one element: n + (n-1) + (n-2) + ...
  ≈ n²/2. Pivot choice is what keeps you out of this; real implementations use
  a random pivot or median-of-three. (An algorithm called *median of medians*
  makes it O(n) even in the worst case, at a constant factor nobody enjoys.)
- **Space O(n)** for the defensive copy, **O(1) beyond it** — the loop version
  allocates nothing per pass. Compare dsa/21, which needed O(n) of live
  intermediate arrays as a genuine part of the algorithm.

## Common mistakes

- **Off by one on `k`.** Returning `a[k]` instead of `a[k - 1]`, or comparing
  `p === k`. Convert once at the top and the bug disappears.
- **Mutating the caller's array.** Partitioning in place on `arr` itself is
  the natural way to write it and it breaks the contract; the mutation test
  catches it.
- **Recursing into both sides.** If you call yourself on the left *and* the
  right, you have written quicksort. It works, and it is O(n log n) — you gave
  the speedup back.
- **Forgetting the `lo === hi` exit.** With `while (lo < hi)` you must return
  `a[lo]` after the loop; without it the function falls off the end and
  returns `undefined` for single-element windows.
- **Storing the pivot as an *index* rather than a value.** `const pivot = mid;`
  then swapping elements around leaves you comparing against whatever drifted
  into that slot. Capture `const pivot = a[hi];` — a number, immune to swaps.
- **Always picking `a[hi]` as the pivot.** Correct but quadratic on sorted and
  reverse-sorted input, both of which the tests include.
- **Not excluding the pivot when you shrink** — `hi = p` / `lo = p` instead of
  `p - 1` / `p + 1`. Once you know `p !== target`, the pivot is definitively
  not the answer, and leaving it in the window can stop the window shrinking
  at all. This is an infinite loop, not a wrong answer, and it triggers on
  inputs as small as `quickSelect([-1, 1], 2)`.
