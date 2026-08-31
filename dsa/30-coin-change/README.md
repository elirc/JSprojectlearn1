# 30 — Coin Change

You have an unlimited supply of coins in a few denominations and an exact
amount to hit. What is the **fewest** coins that add up to it? If no
combination works at all, return `-1`.

The obvious move — always grab the biggest coin that still fits — is wrong,
and this problem exists to prove it to you. The right tool is **dynamic
programming**: answer every smaller amount once, write the answer down, and
build the big answer out of the small ones.

## Signature

```js
/**
 * @param {number[]} coins - available denominations (positive integers,
 *   unlimited supply of each, in no particular order)
 * @param {number} amount - the exact total to make
 * @returns {number} the fewest coins summing to `amount`, or -1 if impossible
 */
export function coinChange(coins, amount) { ... }
```

## Worked examples

| Input | Output | Why |
|-------|--------|-----|
| `coinChange([1, 2, 5], 11)` | `3` | 5 + 5 + 1 |
| `coinChange([1, 3, 4], 6)` | `2` | 3 + 3 — but greedy grabs 4 first and needs 4 + 1 + 1 |
| `coinChange([2], 3)` | `-1` | every pile of 2s is even, so 3 is unreachable |
| `coinChange([1, 2, 5], 0)` | `0` | it takes zero coins to make nothing |

That second row is the whole problem in miniature. Greedy is not merely
inelegant here — it returns 3 when the answer is 2. Any approach that commits
to one coin without considering the others is wrong.

## Constraints & edge cases

- **`amount === 0` returns `0`.** Zero coins already add up to nothing. This
  surprises people every time; the tests check it.
- `coins` may be empty: with `amount > 0` that's `-1`, with `amount === 0`
  it's still `0`.
- Coins are positive integers with unlimited supply. Duplicate denominations
  are harmless — `[1, 1, 2]` behaves exactly like `[1, 2]`.
- A coin larger than `amount` is simply unusable. Skip it; don't crash.
- `coins` must not be modified.
- Target complexity: O(amount × coins.length) time, O(amount) space.

## Hints (take them one at a time!)

1. Work `coins = [1, 3, 4]`, `amount = 6` by hand with the greedy rule, then
   find the two-coin answer yourself. Watching greedy lose is the fastest way
   to see that you have to consider *every* coin at *every* step.
2. Whatever the best pile for amount `a` looks like, it has a **last coin**.
   If you knew that coin was `c`, the rest of the pile would have to be the
   best possible pile for `a - c` — otherwise you could swap in a better one.
   You don't know which `c` it is, so try them all and keep the smallest
   result. Notice that "best pile for `a - c`" is the same question again,
   just smaller.
3. Make an array `dp` of length `amount + 1`, where `dp[a]` means "fewest
   coins for `a`". Fill it with `Infinity` (meaning "not reachable yet") and
   set `dp[0] = 0`. Then loop `a` from 1 up to `amount`, and for each coin
   `c <= a`, consider `dp[a - c] + 1`. Because you go small to large, every
   `dp[a - c]` you read is already final. At the end, an `Infinity` in the
   last slot means impossible — return `-1`.

## Run it

```
node --test dsa/30-coin-change/attempt.test.js
```
