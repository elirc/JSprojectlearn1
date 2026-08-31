# Solution walkthrough — Maximum Subarray

## The naive approach (and what it costs)

Try every possible stretch. A stretch is defined by a start `i` and an
end `j`, so:

```js
let best = -Infinity;
for (let i = 0; i < nums.length; i++) {
  let sum = 0;
  for (let j = i; j < nums.length; j++) {
    sum += nums[j];               // extend the stretch by one
    best = Math.max(best, sum);
  }
}
```

(The truly naive version re-sums each stretch from scratch — three nested
loops, O(n³). The running-sum trick above trims it to O(n²).) For an
array of 10,000 elements, O(n²) is ~50 million additions. Correct, but we
can do the whole thing in *one* pass.

## The insight

Every subarray **ends somewhere**. So instead of thinking about all
n²/2 stretches at once, walk the array and ask a much smaller question at
each position `i`:

> "What is the best subarray that ends *exactly here*?"

There are only two candidates:

1. `nums[i]` **alone** — start fresh at `i`.
2. `nums[i]` **glued onto** the best subarray ending at `i - 1`.

Which is better? Glue on only if the previous best-ending-here is
*positive* — a positive prefix is a gift; a negative prefix is dead
weight you should drop. That's one `Math.max`. The global answer is then
just the biggest "best ending here" you ever saw. This is **Kadane's
algorithm**, and it's a first glimpse of dynamic programming: solve
"...ending at i" using "...ending at i-1".

## The real approach, step by step

1. `endingHere = nums[0]`, `best = nums[0]`. **Not zero!** With
   all-negative input, e.g. `[-3, -1, -2]`, a `best` starting at 0 stays
   0 and 0 is not the sum of any real subarray. Starting from `nums[0]`
   means both variables always describe an actual stretch.
2. For each `i` from 1 to the end:
   - `endingHere = Math.max(nums[i], endingHere + nums[i])` — start
     fresh, or extend; whichever pays more.
   - `best = Math.max(best, endingHere)` — record if it's a new record.
3. Return `best`.

Trace `[-2, 1, -3, 4, -1, 2, 1, -5, 4]`:

| i | nums[i] | endingHere | best |
|---|---------|-----------|------|
| 0 | -2 | -2 | -2 |
| 1 | 1 | max(1, -1) = 1 | 1 |
| 2 | -3 | max(-3, -2) = -2 | 1 |
| 3 | 4 | max(4, 2) = **4** (restart!) | 4 |
| 4 | -1 | 3 | 4 |
| 5 | 2 | 5 | 5 |
| 6 | 1 | 6 | **6** |
| 7 | -5 | 1 | 6 |
| 8 | 4 | 5 | 6 |

Answer: 6, from the stretch `[4, -1, 2, 1]`. Notice row 3: the running
sum `-2` was dead weight, so the algorithm silently dropped it and
restarted at the 4.

## Complexity

- **Time: O(n).** One loop, and each iteration does two `Math.max` calls
  and one addition — constant work. Doubling the array doubles the time,
  nothing worse.
- **Space: O(1).** Two number variables, regardless of input size. No
  arrays, no maps. (Compare with Two Sum, which paid O(n) memory for its
  speed — Kadane gets speed for free because the "memory" it needs about
  the entire past compresses into a single number.)

## Common mistakes

- **Initializing `best = 0`** (or `endingHere = 0`). Fails every
  all-negative test. This is *the* Kadane bug; interviewers watch for it.
- **Updating `best` before `endingHere`** in a way that skips `nums[0]`,
  or looping from `i = 0` after already using `nums[0]` as the seed —
  double-counts the first element (`[5]` → 10). Seed from `nums[0]`,
  loop from 1.
- **Returning the subarray instead of the sum** — or vice versa when a
  variation asks for the other. Read the return type.
- **Thinking "max subarray" allows skipping elements.** `[5, -100, 6]`
  is 6, not 11 — the stretch must be contiguous.
- **Trying to track start/end indices on the first attempt.** Get the
  sum right first; index tracking is a variation (see LEARN.md §8).
