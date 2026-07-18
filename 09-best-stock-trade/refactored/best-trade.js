/**
 * Best buy/sell days to maximize profit. Single pass.
 *
 * The insight: the best sell for any given day pairs with the CHEAPEST
 * day seen so far. So walk forward once, remembering that cheapest day,
 * and check "what if I sold today?" at each step.
 *
 * Returns { buyDay, sellDay, profit } or null when no profitable trade
 * exists (prices only fall). Returning null forces callers to handle
 * the no-trade case explicitly — no magic -1s to forget about.
 */
export function bestTrade(prices) {
  if (!Array.isArray(prices) || prices.length < 2) return null;

  let cheapestDay = 0;
  let cheapestPriceSoFar = prices[0];
  let best = null;

  for (let today = 1; today < prices.length; today++) {
    const profitIfSoldToday = prices[today] - cheapestPriceSoFar;

    if (profitIfSoldToday > (best?.profit ?? 0)) {
      best = { buyDay: cheapestDay, sellDay: today, profit: profitIfSoldToday };
    }

    if (prices[today] < cheapestPriceSoFar) {
      cheapestPriceSoFar = prices[today];
      cheapestDay = today;
    }
  }

  return best;
}
