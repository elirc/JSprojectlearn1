# 📘 Learning Guide: Maximum Subarray

Your first *algorithm with a name* — Kadane's — and your first taste of a
huge idea: carrying the best-so-far instead of recomputing the past.

## 1. The problem in plain words

An array of gains and losses, day by day:

```
[-2, 1, -3, 4, -1, 2, 1, -5, 4]
```

Pick a *consecutive run of days* that nets you the most. Here the best
run is `4, -1, 2, 1` for a total of **6**. Report the total (not the run
itself). Runs can be a single day — so even in an all-loss array the
answer is the smallest loss.

## 2. Concepts you need first

### Subarray means contiguous

A **subarray** is a slice with no gaps: for `[1, 2, 3]` the subarrays are
`[1] [2] [3] [1,2] [2,3] [1,2,3]`. `[1, 3]` is *not* one (that's a
"subsequence" — different word, different problems). How many subarrays
does an n-element array have? Every (start, end) pair: about n²/2. For
n = 100,000 that's five *billion* — checking each one is off the table.

### The running-best pattern

You've met this shape before without a name. Finding the max of an array:

```js
let best = nums[0];
for (let i = 1; i < nums.length; i++) {
  if (nums[i] > best) best = nums[i];
}
```

One pass, one variable that summarizes everything already seen. Kadane's
algorithm is this pattern with a second, cleverer variable. Also note the
idiom: seed `best` with the *first element* and loop from index 1 —
seeding with `0` breaks on all-negative data, here and in Kadane.

### Math.max as a decision

`Math.max(a, b)` reads as "pick whichever is better". Kadane's core line
is a decision written as arithmetic:

```js
endingHere = Math.max(nums[i], endingHere + nums[i]);
//            start fresh      or  extend the old run
```

Try it in a Node REPL: if `endingHere` was `-2` and `nums[i]` is `4`,
extending gives `2` but fresh gives `4` — fresh wins. If `endingHere` was
`+3`, extending gives `7` — extending wins. The rule that falls out:
**extend when the past is positive, drop it when it's negative.**

## 3. How to think about it

The mental leap: **organize all subarrays by where they end.** Every
subarray ends at some index, so if you know the best subarray *ending at*
each index, the overall best is just the max of those.

And the best-ending-at-`i` is easy if you know best-ending-at-`i-1`:

> A subarray ending at `i` is either just `nums[i]`, or some subarray
> ending at `i-1` with `nums[i]` stapled on. Take the better option.

Say the plan aloud: "Walk once. Carry the best run ending right here.
At each step, either extend that run or restart. Remember the best I've
ever carried." If you can say that, the code is four lines.

This "define a quantity at each position in terms of the previous
position" trick is the seed of **dynamic programming** — problem 30
(coin-change) grows it into a full technique.

## 4. Common wrong turns

- **Starting `best` at 0.** `[-3, -1, -2]` then returns 0, which is the
  sum of... nothing. An empty subarray isn't allowed. Seed with
  `nums[0]`.
- **Allowing gaps.** If your mental model says `[5, -100, 6] → 11`,
  reread "contiguous". The -100 must be either included or fatal.
- **Restarting only at zero.** The restart isn't "when I see a negative
  number", it's "when the *running sum* is negative". A -1 inside a run
  of big positives should be absorbed, not trigger a restart:
  `[5, -1, 5] → 9`.
- **Trying to track where the run starts too early.** Sum first. Indices
  are a variation, and bolting them on before the core works doubles the
  bug surface.

## 5. The solution, step by step

```js
export function maxSubarraySum(nums) {
  let endingHere = nums[0];   // best run that ends exactly here
  let best = nums[0];         // best run seen anywhere

  for (let i = 1; i < nums.length; i++) {
    endingHere = Math.max(nums[i], endingHere + nums[i]);
    best = Math.max(best, endingHere);
  }

  return best;
}
```

Walk `[5, -100, 6]` by hand:

| i | nums[i] | endingHere | best |
|---|---------|-----------|------|
| 0 | 5 | 5 | 5 |
| 1 | -100 | max(-100, -95) = -95 | 5 |
| 2 | 6 | max(6, -89) = **6** (restart) | 6 |

The -95 at step 1 is the algorithm honestly saying "the best run ending
on the -100 is terrible". It never pollutes `best`, and the moment a
fresh start beats extending, the dead weight is dropped.

Now walk `[-3, -1, -2]` yourself with a pencil. You should get
`endingHere` = -3, -1, -2 and `best` = -3, **-1**, -1.

## 6. Complexity, gently

- **Brute force is O(n²)**: ~n²/2 (start, end) pairs even with a running
  sum. Doubling the array quadruples the work.
- **Kadane is O(n) time**: one visit per element, constant work per
  visit. Doubling the array doubles the work. On a million elements
  that's the difference between ~500 billion operations and 1 million.
- **O(1) space**: two variables. Notice something profound: everything
  relevant about the *entire past* of the array compresses into one
  number, `endingHere`. When a summary like that exists, O(n²) problems
  collapse to O(n). Hunting for such a summary is a reusable strategy —
  it's the same move you'll make in problem 09.

## 7. Words you learned

- **Subarray** — contiguous slice of an array.
- **Kadane's algorithm** — one-pass max-subarray via "extend or restart".
- **Running best / best-so-far** — a variable summarizing all past input.
- **Recurrence** — defining a value at step i via the value at step i-1.
- **Dynamic programming (preview)** — building answers from smaller
  subanswers instead of recomputing.
- **O(1) space** — memory use that doesn't grow with input size.

## 8. Variations to try

1. **maxSubarray(nums)** — return the actual subarray, not the sum:
   `[-2,1,-3,4,-1,2,1,-5,4]` → `[4,-1,2,1]`. Track a start index that
   resets whenever you restart, and save `[start, i]` whenever `best`
   updates.
2. **minSubarraySum(nums)** — smallest sum instead: flip every
   `Math.max` to `Math.min`. `[2, -1, -3, 4]` → `-4`.
3. **maxSubarrayLen(nums, k)** — does any contiguous run sum to exactly
   `k`? Brute force is fine (two loops); return true/false.
   `([1, 2, 3], 5)` → `true` (`[2,3]`).
4. **bestTrade(prices)** — you solved js#09 (best-stock-trade)? Re-solve
   it, then notice: profit differences `prices[i+1] - prices[i]` turn it
   into *exactly this problem*. Verify on `[7,1,5,3,6,4]` → 5.
