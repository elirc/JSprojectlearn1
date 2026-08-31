# 📘 Learning Guide: Coin Change

Answer every small question once, write it down, and the big one answers itself.

## 1. The problem in plain words

You have coins in a few denominations — say 1s, 3s and 4s — and an unlimited
pile of each. Somebody names an amount. Hand over that exact amount using as
**few coins as possible**, and say how many that took. If the amount simply
cannot be made, say `-1`.

`coinChange([1, 3, 4], 6)` is `2` — 3 + 3 does it and nothing does it in one.
`coinChange([2], 3)` is `-1`, because every pile of 2s is even. And
`coinChange([1, 2, 5], 0)` is `0`, because zero coins already add up to
nothing — an edge case that trips people every single time.

## 2. Concepts you need first

This is the track's first dynamic programming problem, so here is the whole
idea, built from nothing.

**A subproblem.** "Fewest coins for 11?" and "fewest coins for 9?" are the
*same question with a smaller input*. That sounds trivial, and it is the
entire prerequisite for DP: if a problem breaks into smaller copies of
itself, you can solve the small ones first.

**The recurrence, derived rather than announced.** Think about the optimal
pile for amount `a`, whatever it is. It holds at least one coin; pick one and
call it the last coin placed, worth `c`. Remove it and what's left adds up to
`a - c`, using one fewer coin.

Now the crucial step: that remaining pile must itself be *optimal* for
`a - c`. If a cheaper way to make `a - c` existed you could swap it in and
beat the pile you just called optimal — a contradiction. So:

```
best(a) = 1 + best(a - c),  where c was the last coin
```

The catch: you don't know which coin `c` was. Fine — try every coin that
isn't too big and keep the smallest result:

```
best(a) = 1 + min over all coins c <= a of best(a - c)
```

**The base case.** `best(0) = 0`. Zero coins make zero. Every DP needs one
input small enough that you can write the answer down without thinking, and
this is it — exactly like the `arr.length <= 1` in dsa/21's merge sort.

**The table.** Here's the shift in mindset. That recurrence is a recursive
definition and you *could* run it recursively — but notice it only ever asks
about amounts 0, 1, 2, … `amount`: that's `amount + 1` distinct questions and
no more. So make an array with exactly that many slots, let `dp[a]` hold the
answer for amount `a`, and fill it in. The answer you want is the last slot.

**Fill small to large.** This is what makes the table work. Computing `dp[a]`
only ever reads `dp[a - c]` for a *positive* coin `c`, so every slot you read
sits to the left of the one you're writing and was finished earlier. Reverse
the loop and you read empty slots — the classic DP bug, and it fails silently.

**Overlapping subproblems.** This is *why* the table beats recursion. Run the
plain recursion on `([1, 2, 5], 11)` and count the calls: **527 of them**, to
answer a question with 12 distinct sub-answers. `best(6)` is computed 9
separate times, `best(1)` 128 times, `best(0)` 218 times. The waste
compounds: on `[186, 419, 83, 408]` each extra 500 in the amount multiplies
the call count by about 27 (715 at amount 1,000; 533,177 at 2,000; 14,732,701
at 2,500), so the 6,249 in the tests sits near 10¹⁸ calls.

The fix has two names for one idea — write each answer down once.
**Memoization** recurses as normal but checks a cache first; **tabulation**
skips the recursion and fills the table bottom-up. This problem tabulates.
dsa/23's backtracking brute-forced an exponential space too, but there every
arrangement was genuinely different; DP is for spaces full of *repeats*.

**Why greedy fails.** Greedy repeatedly takes the biggest coin that fits.
With `[1, 3, 4]` and amount 6: take 4, leaving 2; 3 is too big now, so take
1 and 1 — three coins, where 3 + 3 is two. Greedy lost because grabbing 4
left a remainder no big coin fit into, and by then it had committed.

The trap is convincing because greedy genuinely *does* work on real money:
`[25, 10, 5, 1]` for 63 cents gives the optimal 25 + 25 + 10 + 1 + 1 + 1.
Currencies are designed so greedy works. Arbitrary coin sets are not, and a
problem handing you `[1, 3, 4]` is telling you exactly that.

**Kadane, revisited (dsa/03).** You have already written a tiny DP. Kadane
carried "best subarray ending here" forward instead of re-scanning from
scratch — one variable holding one sub-answer. Coin change is that idea
scaled up to a whole *table*, because here you look back further than a step.

## 3. How to think about it

Take `coins = [1, 3, 4]`, `amount = 6` and just fill the table left to right.
Start with `dp[0] = 0` and mark everything else "unknown". For each amount,
try each coin as the last one placed and keep the best.

| a | candidates tried (`dp[a-c] + 1`) | `dp[a]` | last coin | that means |
|---|----------------------------------|---------|-----------|------------|
| 0 | — (base case) | **0** | — | (none) |
| 1 | 1: `dp[0]+1 = 1` | **1** | 1 | 1 |
| 2 | 1: `dp[1]+1 = 2` | **2** | 1 | 1+1 |
| 3 | 1: `dp[2]+1 = 3` · 3: `dp[0]+1 = 1` | **1** | 3 | 3 |
| 4 | 1: `dp[3]+1 = 2` · 3: `dp[1]+1 = 2` · 4: `dp[0]+1 = 1` | **1** | 4 | 4 |
| 5 | 1: `dp[4]+1 = 2` · 3: `dp[2]+1 = 3` · 4: `dp[1]+1 = 2` | **2** | 1 | 1+4 |
| 6 | 1: `dp[5]+1 = 3` · 3: `dp[3]+1 = 2` · 4: `dp[2]+1 = 3` | **2** | 3 | 3+3 |

Read the last row slowly, because it is the whole lesson. At `a = 6` the coin
4 offers `dp[2] + 1 = 3` — exactly greedy's answer. The coin 3 offers
`dp[3] + 1 = 2`, and wins. The table beat greedy because it *had already
worked out* that 3 is cheap to make (`dp[3] = 1`) while 2 is expensive
(`dp[2] = 2`). Greedy never looks that up; the table always does.

Notice too that no row ever looks to its right — everything a row needs is
already to its left, final and unchangeable. That is why one left-to-right
pass is enough.

## 4. Common wrong turns

- **Trusting greedy.** The `[1, 3, 4]` test exists for exactly this. If your
  solution commits to a coin without comparing the alternatives, it's wrong.
- **Plain recursion with no table.** Correct, and unusably slow — the 6,249
  test will hang your terminal. If you wrote it that way first, good: adding
  a `Map` cache in front of it is a two-line fix and teaches memoization.
- **`new Array(amount)` instead of `new Array(amount + 1)`.** You need slots
  `0` *through* `amount`. Off by one here makes `dp[amount]` `undefined`,
  `undefined + 1` `NaN`, and `NaN < anything` false — quiet garbage, no error.
- **Forgetting `dp[0] = 0`.** Every slot stays `Infinity` forever, nothing
  beats anything, and you return `-1` for everything.
- **Marking "unreachable" with `-1` or `0`.** With `-1`, the candidate
  `dp[a - c] + 1` computes to `0`, which looks brilliant and wins every
  comparison. `Infinity` is right precisely because `Infinity + 1` is still
  `Infinity` and can never win. Then remember to convert it back to `-1` on
  the way out — the contract asks for `-1`, not `Infinity`.
- **Special-casing `amount === 0` or sorting `coins` first.** Neither is
  needed: the outer loop starts at 1 and simply doesn't run, and `.sort()`
  would mutate the array you were handed.

## 5. The solution, step by step

**Step 1 — allocate the table, and write down the base case.**

```js
const dp = new Array(amount + 1).fill(Infinity);
dp[0] = 0;
```

One slot per amount from 0 to `amount` *inclusive*. `Infinity` means "no way
known yet to make this amount"; `dp[0] = 0` is the one answer you can write
down without thinking.

**Step 2 — walk the amounts upward.** `for (let a = 1; a <= amount; a++)`.
Small to large, so everything you read is already final.

**Step 3 — try every coin as the last one placed.** Inside that loop, iterate
the coins. Skip any coin bigger than `a` — it can't be the last coin of a
smaller pile. Otherwise the candidate is `dp[a - coin] + 1`: one coin, plus
the best known way to make the rest. Keep it if it beats `dp[a]`.

**Step 4 — read off the answer.**

```js
return dp[amount] === Infinity ? -1 : dp[amount];
```

Run the tests: `node --test dsa/30-coin-change/attempt.test.js`.

## 6. Complexity, gently

**Time O(amount × coins.length).** The outer loop runs `amount` times and the
inner once per coin, with constant work inside. For the test with 4 coins and
amount 6,249 that's roughly 25,000 operations — a fraction of a millisecond,
against the naive recursion's ~10¹⁸ calls. **Space O(amount)** for the table.

One honest wrinkle worth meeting now: this is **pseudo-polynomial** time. The
cost scales with the *numeric value* of `amount`, not with how much input you
were handed. Doubling `amount` doubles the work — but writing a number twice
as large takes one more digit, so an input you can type in a second can still
be slow. Every knapsack-shaped problem has this property.

## 7. Words you learned

- **Dynamic programming (DP)** — solving a problem by solving its smaller
  subproblems once each and reusing the answers.
- **Subproblem** — the same question on a smaller input; here, "fewest coins
  for `a - c`".
- **Recurrence** — the formula building a big answer from smaller ones:
  `best(a) = 1 + min over c of best(a - c)`.
- **Base case** — the input whose answer you write down directly, `best(0) = 0`.
- **Overlapping subproblems** — the same subproblem asked many times; the
  signal that DP will pay off.
- **Tabulation (bottom-up)** — filling an array of answers small to large,
  which is what you wrote. **Memoization (top-down)** recurses normally but
  caches each answer: same savings, different shape.
- **Greedy** — always taking the locally best-looking option. Fast, and
  wrong for this problem.
- **Pseudo-polynomial** — cost that scales with a number's value rather than
  the input's size.

## 8. Variations to try

1. **Return the actual coins**, not just the count. Keep a second array
   `from[a]` recording which coin won at each amount, then walk backwards
   from `amount`, subtracting as you go — `[1, 3, 4]` and 6 gives `[3, 3]`.
2. **Write the top-down memoized version**: the plain recursion plus a `Map`
   caching each amount's answer. Same complexity as your table version, and
   you'll feel which one you'd rather debug.
3. **Count the number of ways** to make the amount instead of the minimum.
   Careful: loop order now matters. Coins on the *outside*, amounts inside,
   counts **combinations**; the other way round counts permutations.
4. **0/1 knapsack**: each coin usable at most once. The table needs a second
   dimension (or one clever backwards inner loop) — the classic next problem.
5. **Time them.** `console.time` the naive recursion against the DP on
   `([186, 419, 83, 408], 6249)` — but put a call counter with a cutoff in
   the recursion first, or you'll wait a very long time.

That's problem 30 of 30. Dynamic programming is the door to a whole family
beyond this one — edit distance, longest common subsequence, knapsack — and
they all open with the two questions you just answered: what is the
subproblem, and what is the base case?
