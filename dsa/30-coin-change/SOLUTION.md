# Solution walkthrough — Coin Change

## The naive approach and its cost

There are two naive approaches, and they fail in completely different ways.

**Greedy: always take the biggest coin that fits.** Fast, obvious, *wrong*.
With `coins = [1, 3, 4]` and `amount = 6` it grabs 4, has 2 left, and must
pay 1 + 1 — three coins. The answer is 3 + 3, two coins. Greedy loses because
the biggest coin can leave a remainder nothing large divides nicely, and by
then it has already committed.

The trap is convincing because greedy genuinely *does* work for real currency
systems: `[25, 10, 5, 1]` for 63 cents gives the optimal 25 + 25 + 10 + 1 + 1
+ 1. Denominations are designed that way. Arbitrary coin sets are not.

**Brute-force recursion: try every coin as the last one.**

```js
function best(a) {
  if (a === 0) return 0;
  let min = Infinity;
  for (const c of coins) if (c <= a) min = Math.min(min, best(a - c) + 1);
  return min;
}
```

This one is *correct*, and it is the right idea — but it re-answers the same
questions endlessly. On `([1, 2, 5], 11)` it makes 527 calls to answer a
question with only 12 distinct sub-answers: `best(6)` is computed 9 separate
times, `best(1)` 128 times, `best(0)` 218 times. Measured on
`[186, 419, 83, 408]`, every extra 500 in the amount multiplies the call
count by about 27 — 715 calls at amount 1,000, 19,913 at 1,500, 533,177 at
2,000, 14,732,701 at 2,500. Extrapolate to the 6,249 test case and you are
near 10¹⁸ calls: about thirty years at a billion calls a second. The DP
answers it in under a millisecond.

## The insight

Two observations, and the second one is the whole of dynamic programming.

**First: the last coin.** Whatever the optimal pile for amount `a` looks
like, it contains *some* coin — call it the last one placed. Remove it and
you're holding an optimal pile for `a - c`. (It must be optimal: if there
were a cheaper way to make `a - c`, you could swap it in and beat a pile you
called optimal.) You don't know which `c` it was, so try every coin and keep
the smallest result:

```
best(a) = 1 + min over all coins c <= a of best(a - c)
best(0) = 0
```

**Second: there are only `amount + 1` distinct questions.** The recursion
asks about amounts 0, 1, 2, … `amount` and nothing else, ever — the explosion
is entirely re-asking. So stop recursing and start *tabulating*: walk `a`
from 0 upward, compute each answer once, store it. Every value you need is
already there, because `a - c < a`.

That flip from "recurse down and hope" to "fill a table upward" is the same
move dsa/03's Kadane made by carrying a best-so-far instead of re-scanning;
DP is that idea with a whole table instead of a single variable.

## The approach, step by step

1. **Allocate the table.** `const dp = new Array(amount + 1).fill(Infinity);`
   — one slot per amount from 0 to `amount` inclusive, hence the `+ 1`.
2. **Use `Infinity`, not `-1` or `null`, for "unreachable".** `Infinity + 1`
   is still `Infinity`, so a candidate built on an unreachable sub-amount can
   never win a `<` comparison — that deletes a branch from the inner loop.
3. **Set the base case.** `dp[0] = 0;` Zero coins make zero. This one
   assignment is what everything else is built out of.
4. **Loop amounts small to large.** `for (let a = 1; a <= amount; a++)`.
   Computing `dp[a]` reads only `dp[a - c]` for positive `c`, so every slot
   you read is already final.
5. **Loop the coins inside.** Skip any `coin > a` — it cannot be the last
   coin placed. Otherwise the candidate is `dp[a - coin] + 1`; keep it if it
   beats `dp[a]`.
6. **Read off the answer.** `return dp[amount] === Infinity ? -1 : dp[amount];`

Note what you *don't* do: no sorting, no mutating `coins`, no recursion, and
no special case for `amount === 0` — the loop simply doesn't run and `dp[0]`
is already 0.

## Complexity

- **Time O(amount × coins.length).** The outer loop runs `amount` times, the
  inner once per coin, the body is constant. For the 6,249 test with 4 coins
  that's ~25,000 operations, versus the naive recursion's ~10¹⁸.
- **Space O(amount)** for the table, and you cannot drop below it here since
  `dp[a]` may reach back as far as `a - 1`. Note the cost is
  *pseudo-polynomial*: it scales with the numeric **value** of `amount`, not
  with how many numbers you were handed. Doubling `amount` doubles the work,
  yet writing `amount` down costs one more bit. That distinction reappears in
  every knapsack-style problem.

## Common mistakes

- **Going greedy.** Covered above. The `[1, 3, 4]` test exists to catch it.
- **Sizing the array `amount` instead of `amount + 1`.** Then `dp[amount]` is
  `undefined`, `undefined + 1` is `NaN`, and every `NaN` comparison is false.
  Silent nonsense rather than a crash.
- **Forgetting `dp[0] = 0`.** With the whole table at `Infinity`, nothing can
  ever beat anything and you return `-1` for every input.
- **Using `-1` as the unreachable marker.** Then `dp[a - c] + 1` is `0`,
  which looks like a fantastic answer and wins every comparison. Guard
  explicitly, or just use `Infinity` and keep the loop three lines long.
- **Looping coins outside and amounts inside.** For *this* problem it happens
  to still work, because a minimum doesn't care about order — don't learn the
  wrong lesson. In the count-the-ways variant that order decides whether you
  count combinations or permutations.
- **Returning `dp[amount]` without the `Infinity` check.** The contract says
  `-1`, and `assert.equal` will tell you so.
- **Sorting `coins` "to help".** It doesn't, and sorting in place modifies
  the caller's array — the last test catches that.
