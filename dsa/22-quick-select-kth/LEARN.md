# 📘 Learning Guide: Quick Select (kth smallest)

How to answer one question about an array without answering all the others.

## 1. The problem in plain words

You have a pile of unsorted numbers. Someone asks: "what's the 3rd smallest?"

You could sort the pile and count to 3. That works. But sorting answered
*every* rank at once — 1st, 2nd, all the way to n-th — when you were asked
about one. Quick select does only the work your question needs.

`k` is a **rank**, counted from 1: `k = 1` is the smallest value, `k = n` is
the largest, `k = 3` is "third smallest." Array indices are counted from 0.
Half the bugs in this problem live in that gap, so convert once and be done:
`const target = k - 1;`

## 2. Concepts you need first

- **Divide & conquer (dsa/21).** Merge sort split the array and recursed into
  *both* halves. That structure is about to reappear with one crucial change:
  you will recurse into **one** half and throw the other away. Everything
  interesting about this problem is in that difference.
- **Discarding a region (dsa/19).** Binary search's whole trick is proving
  "the answer cannot be over there" and never looking again. Quick select is
  the same idea applied to an array that *isn't sorted* — so you have to do a
  pass of work to create the split before you can discard.
- **The write pointer (dsa/05).** In move-zeroes you walked a `read` pointer
  across the array while a slower `write` pointer marked "everything before me
  is already correct." Partitioning is that exact pattern, with "is nonzero"
  replaced by "is smaller than the pivot." Re-read your dsa/05 solution — you
  are about to write it again.
- **Swapping in place.** `const t = a[i]; a[i] = a[j]; a[j] = t;` — no new
  arrays, no `splice`. Partitioning rearranges; it never allocates.

## 3. How to think about it

Forget sorting. Ask a smaller question: **can I find out where ONE element
belongs, cheaply?**

Yes. Pick any element — the **pivot**. Walk the array once, shoving every
smaller element to its left and everything else to its right. Neither side is
sorted; you have no idea what order they're in. But the pivot now sits at
index `p`, and that is *precisely* where a full sort would have put it,
because exactly `p` elements are smaller. One O(n) pass bought one true
position.

Now compare `p` with your target index:

```
                    p
  [ all smaller ] [ P ] [ all not-smaller ]
   \___________/         \_______________/
    if target < p         if target > p
    look here             look here
    (throw the rest away) (throw the rest away)
```

Then repeat inside whichever side survived. Here is the full run of
`quickSelect([7, 2, 9, 4], 3)` — target index `2`:

```
  window [0..3]  [7, 2, 9, 4]   pivot = 2 (the middle element)
                 ----------------------------------------
                 [2, 4, 9, 7]   pivot landed at p = 0
                 p=0 < target=2  ->  answer is to the RIGHT, lo = 1

  window [1..3]     [4, 9, 7]   pivot = 9
                 ----------------------------------------
                 [2, 4, 7, 9]   pivot landed at p = 3
                 p=3 > target=2  ->  answer is to the LEFT, hi = 2

  window [1..2]     [4, 7]      pivot = 4
                 ----------------------------------------
                 [2, 4, 7, 9]   pivot landed at p = 1
                 p=1 < target=2  ->  lo = 2

  window [2..2]  one slot left  ->  return a[2] = 7
```

Notice the array drifts toward sorted but never gets there — and it doesn't
need to. Only index 2 was ever required to be right.

## 4. Common wrong turns

- **Sorting "just to check."** If your implementation calls `.sort()` anywhere,
  you have written the naive version with extra steps.
- **Recursing into both sides.** Handle the left *and* the right and you have
  written quicksort: correct, O(n log n), speedup gone. Only one side can hold
  rank `k` — if `target < p`, everything at index `p` or beyond already has at
  least `p` elements below it, so none of it can be the `target`-th.
- **Off-by-one on `k`.** Returning `a[k]`, or testing `p === k`. The rank is
  1-based, the index is 0-based, and mixing them gives answers that are
  *almost* right — the hardest kind of bug to spot.
- **Mutating the caller's array.** Partitioning is destructive by nature. Copy
  at the top (`const a = [...arr];`) and the problem evaporates.
- **Leaving the pivot inside the shrunken window.** After `p !== target` you
  know the pivot is not the answer, so shrink to `p - 1` / `p + 1`, not `p`.
  Using `p` can leave the window the same size forever —
  `quickSelect([-1, 1], 2)` spins the loop endlessly.
- **Assuming duplicates need special handling.** They don't — the 2nd and 3rd
  smallest of `[3, 3, 1]` are both `3`, and a plain partition gets that right.

## 5. The solution, step by step

**Step 1 — copy, and convert the rank.**

```js
const a = [...arr];
const target = k - 1;
```

**Step 2 — set up the window.** The invariant for the whole algorithm:
*the answer always lives inside `a[lo..hi]`.*

```js
let lo = 0;
let hi = a.length - 1;
```

**Step 3 — write `partition(a, lo, hi)`.** Choose the middle slot as pivot and
swap it out to `hi` so it's parked somewhere known. Capture the *value*
(`const pivot = a[hi]`), not the index — indices go stale as you swap. Then
run the dsa/05 walk from `lo` to `hi - 1`: whenever `a[read] < pivot`, swap it
down to `write` and advance `write`. Finish with `swap(a, write, hi)` to drop
the pivot into place, and return `write`.

Why the *middle* and not simply `a[hi]`? Because on an already-sorted array
the last element is the largest, so the partition peels off exactly one
element per pass — n passes of O(n) work, the O(n²) worst case, on the most
common input shape there is. The middle element is deterministic (your tests
stay reproducible) and dodges that trap.

**Step 4 — loop, don't recurse.**

```js
while (lo < hi) {
  const p = partition(a, lo, hi);
  if (p === target) return a[p];
  if (target < p) hi = p - 1;
  else lo = p + 1;
}
return a[lo];
```

The recursive version would call itself as its very last action, so the call
carries nothing back — reassigning `lo`/`hi` does the same job with no stack.
(That transformation is called *tail-call elimination*; doing it by hand is a
good reflex.)

**Step 5 — the collapse case.** When `lo === hi` the window is one slot wide.
The invariant says the answer is in the window, so that slot *is* the answer.
Without the final `return a[lo]` you fall off the end and hand back
`undefined` for every single-element input.

Run the tests: `node --test dsa/22-quick-select-kth/attempt.test.js`.

## 6. Complexity, gently

**The average case.** Each pass does work proportional to the window it
partitions, then keeps roughly half — so the total is `n + n/2 + n/4 + ...`,
a series that never reaches `2n` no matter how many terms you add. That's
**O(n)**, linear. Sorting first was O(n log n): on a million elements, about
2 million steps instead of about 20 million.

Set it beside dsa/21, because the contrast is the lesson:

```
  merge sort:    log n levels, and EVERY level touches all n elements
                 -> n log n
  quick select:  each pass touches only what's left, and half vanishes
                 -> n + n/2 + n/4 + ... -> 2n
```

Same divide, opposite conquer. Merge sort needs both halves because it must
order everything; you need one, because you asked one question.

**The worst case is genuinely O(n²)**, and pretending otherwise is how people
get burned. If every pivot is the smallest or largest element in its window,
each pass discards one element: n + (n−1) + (n−2) + ... ≈ n²/2. Pivot choice
is the entire defence — the middle element beats the naive last element, a
random pivot makes an adversarial input essentially impossible, and *median of
medians* guarantees O(n) even in the worst case, at a constant factor nobody
uses casually.

**Space is O(n)** for the defensive copy and **O(1)** on top of it — the loop
allocates nothing per pass, unlike dsa/21's intermediate arrays.

## 7. Words you learned

- **Pivot** — the element you partition around; its final index comes for free.
- **Partition** — one linear pass that puts everything smaller than the pivot
  on its left and everything else on its right, in place.
- **Lomuto partition** — the single-write-pointer flavour used here (the other
  common one is Hoare's, with pointers walking in from both ends).
- **Rank vs. index** — "3rd smallest" (1-based) vs. `a[2]` (0-based).
- **Selection** — the family of problems asking for the element of a given
  rank; quick select is its workhorse.
- **Average case vs. worst case** — the cost on typical input vs. the cost on
  the most hostile input; here they differ enormously (O(n) vs. O(n²)).
- **Tail call** — a recursive call in final position, replaceable by a loop.
- **In place** — rearranging the array you already have, allocating nothing.

## 8. Variations to try

1. Return the k-th **largest** instead. Two one-line ways exist: flip the
   partition's comparison, or convert the rank (`k` largest of `n` is rank
   `n - k + 1` smallest). Do both; decide which you'd defend in review.
2. Find the **median** — `k = Math.ceil(n / 2)`, and for even `n` average the
   two middle values. You now need *two* selections and it's still cheaper
   than a sort.
3. Return the k **smallest values** as an array, not just the k-th. Hint:
   `a.slice(0, k)` is already exactly that set (in some order) by the time you
   return — argue why, then test it.
4. Swap the pivot rule to "always `a[hi]`" and time it with `console.time` on a
   sorted array of 100,000 elements. Watch O(n²) show up in wall-clock time.
5. Handle heavy duplicates with a **three-way partition** (Dutch national
   flag): `< pivot`, `=== pivot`, `> pivot`. On an all-one-value array this
   folder's version is O(n²) and the three-way one is O(n) — build the input
   that proves it.
