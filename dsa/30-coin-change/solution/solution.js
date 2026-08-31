/**
 * Coin change: fewest coins summing to exactly `amount`, or -1.
 *
 * Bottom-up dynamic programming ("tabulation"). Instead of asking one big
 * question and recursing, answer EVERY small question once, in order, and
 * write each answer into a table. The big answer is the last slot.
 *
 * 1. `dp[a]` means "the fewest coins that add up to exactly `a`".
 * 2. Base case: `dp[0] = 0` — zero coins already make nothing.
 * 3. Every other slot starts at Infinity, meaning "not reachable yet".
 * 4. For each amount `a` from 1 upward, try every coin `c <= a` as the LAST
 *    coin placed. That leaves `a - c` to make, which is already solved, so
 *    the candidate is `dp[a - c] + 1`. Keep the smallest candidate.
 * 5. If the final slot is still Infinity, no combination reaches `amount`.
 *
 * Time  O(amount * coins.length): one inner loop over the coins per amount.
 * Space O(amount) for the table. The input array is only read, never sorted
 *       or written, so the caller's array is safe.
 *
 * @param {number[]} coins - denominations (positive integers, any order)
 * @param {number} amount - the exact total to make
 * @returns {number} the fewest coins summing to `amount`, or -1 if impossible
 */
export function coinChange(coins, amount) {
  // One slot per amount from 0 to `amount` inclusive — hence `amount + 1`.
  //
  // Infinity is the right "unreachable" marker rather than -1 or null,
  // because it survives the arithmetic below: Infinity + 1 is still
  // Infinity, so a candidate built on an unreachable sub-amount can never
  // win the comparison. No special-casing needed inside the loop.
  const dp = new Array(amount + 1).fill(Infinity);

  // The base case, and the only slot we can fill without thinking.
  dp[0] = 0;

  // Small to large. This ordering is what makes the whole thing work: when
  // we compute dp[a] we only ever read dp[a - c] for a positive coin c, so
  // every slot we read was finished on an earlier iteration and will never
  // change again.
  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) {
      // A coin bigger than the amount can't be the last one placed.
      if (coin > a) continue;

      // Pretend `coin` is the last coin in the pile. The rest of the pile
      // has to make `a - coin`, and we cannot do better than the best known
      // way of making that — otherwise we could swap in the better one.
      const candidate = dp[a - coin] + 1;

      if (candidate < dp[a]) dp[a] = candidate;
    }
  }

  // Still Infinity means no combination of these coins reaches `amount`.
  return dp[amount] === Infinity ? -1 : dp[amount];
}
