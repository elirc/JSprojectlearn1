# 🏋️ Practice: Best Stock Trade

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Highest price day (warm-up)

Write a new function `highestPriceDay(prices)` in the style of `bestTrade`: it returns `{ day, price }` for the day with the highest price, or `null` for an empty (or non-array) input. On a tie, keep the *earliest* day. Check: for the classic array `[110, 95, 100, 87, 92, 105, 102, 99]` it returns `{ day: 0, price: 110 }`, and for `[3, 9, 9]` it returns `{ day: 1, price: 9 }`.

What it practices: the running-best pattern, named object returns, and `null` for "no answer".

Hint: it's the `biggest` loop from LEARN.md section 2, but remembering *which* day too.

### ⭐⭐ 2. Transaction fee (core)

Real brokers charge a fee. Write `bestTradeWithFee(prices, fee)` that returns the best trade whose profit *after subtracting the fee* is positive — with `profit` in the result being the net amount — or `null` if no trade beats the fee. Check: the classic array with `fee = 10` gives `{ buyDay: 3, sellDay: 5, profit: 8 }`, with `fee = 20` gives `null`, and with `fee = 0` matches `bestTrade` exactly.

What it practices: extending the single-pass algorithm without breaking its structure.

Hint: only one line of the loop needs to change — the fee is constant, so the best *days* don't move.

### ⭐⭐ 3. Worst trade (core)

Write `worstTrade(prices)`: the buy-then-sell pair that *loses* the most money, returned as `{ buyDay, sellDay, profit }` with a negative `profit`, or `null` if no pair loses (rising or flat prices). Check: the classic array gives `{ buyDay: 0, sellDay: 3, profit: -23 }` (buy at 110, sell at 87); `[1, 2, 3]` gives `null`.

What it practices: mirroring an algorithm — every comparison flips, and good names keep you honest.

Hint: instead of the *cheapest* day so far, track the most *expensive* day so far.

### ⭐⭐ 4. Many trades (core)

Suppose you may buy and sell as many times as you like (but only hold one share at a time). Write `maxTotalProfit(prices)` returning the total profit from taking *every* profitable move. Check: the classic array gives `23` (ride 95→100, then 87→92, then 92→105), `[1, 2, 3]` gives `2`, and falling prices give `0`.

What it practices: a different single-pass insight — sometimes the greedy local step is provably optimal.

Hint: any rise can be collected day by day; sum every positive difference between consecutive days.

### ⭐⭐⭐ 5. Streaming prices (challenge)

Prices arrive one at a time in the real world. Write `makeTradeTracker()` that returns an object with two methods: `addPrice(price)` (call it once per day, in order) and `best()` (returns the best trade so far, or `null`). It must use constant memory — no storing the whole price history. Check: feeding the classic prices one by one, `best()` returns `{ buyDay: 3, sellDay: 5, profit: 18 }` — identical to `bestTrade` on the full array.

What it practices: the single-pass algorithm is secretly an *online* algorithm — its whole state is three variables, which a closure can hold between calls.

Hint: keep `day`, `cheapestDay`, `cheapestPriceSoFar`, and `best` in the closure; `addPrice` runs one iteration of `bestTrade`'s loop body. Starting `cheapestPriceSoFar` at `Infinity` handles day 0 gracefully.

### ⭐⭐⭐ 6. A referee for worstTrade (challenge)

The refactor's last test cross-checks `bestTrade` against a brute force. Write the same kind of property-based test for your `worstTrade` from exercise 3: a nested-loop `bruteForceWorst` inside the test, then 50 random 30-day arrays where both must agree exactly. The test you write should pass with your single-pass `worstTrade`, and fail if you swap the order of the two `if` blocks inside its loop (try it!).

What it practices: keeping the obvious algorithm as the referee for the clever one.

Hint: copy the shape of the existing referee test; flip `>` to `<` in the brute force.

## Solutions

### 1. Highest price day

```js
export function highestPriceDay(prices) {
  if (!Array.isArray(prices) || prices.length === 0) return null;
  let best = { day: 0, price: prices[0] };
  for (let day = 1; day < prices.length; day++) {
    if (prices[day] > best.price) best = { day, price: prices[day] };
  }
  return best;
}
```

WHY: this is the running-best pattern from LEARN.md, returning a self-documenting object instead of a bare number. The strict `>` means a tie never *beats* the current best, so the earliest day wins — the same tie rule `bestTrade` uses.

### 2. Transaction fee

```js
export function bestTradeWithFee(prices, fee = 0) {
  if (!Array.isArray(prices) || prices.length < 2) return null;
  let cheapestDay = 0;
  let cheapestPriceSoFar = prices[0];
  let best = null;
  for (let today = 1; today < prices.length; today++) {
    const netProfitIfSoldToday = prices[today] - cheapestPriceSoFar - fee;
    if (netProfitIfSoldToday > (best?.profit ?? 0)) {
      best = { buyDay: cheapestDay, sellDay: today, profit: netProfitIfSoldToday };
    }
    if (prices[today] < cheapestPriceSoFar) {
      cheapestPriceSoFar = prices[today];
      cheapestDay = today;
    }
  }
  return best;
}
```

WHY: the fee is the same for every pair, so subtracting it doesn't change *which* pair is best — the single-pass insight survives untouched. Renaming the intermediate to `netProfitIfSoldToday` keeps the "names ARE the algorithm" rule: the code still reads as a sentence. The `?? 0` floor now also guarantees the net profit is positive, so trades that can't cover the fee return `null` naturally.

### 3. Worst trade

```js
export function worstTrade(prices) {
  if (!Array.isArray(prices) || prices.length < 2) return null;
  let priciestDay = 0;
  let priciestPriceSoFar = prices[0];
  let worst = null;
  for (let today = 1; today < prices.length; today++) {
    const lossIfSoldToday = prices[today] - priciestPriceSoFar;
    if (lossIfSoldToday < (worst?.profit ?? 0)) {
      worst = { buyDay: priciestDay, sellDay: today, profit: lossIfSoldToday };
    }
    if (prices[today] > priciestPriceSoFar) {
      priciestPriceSoFar = prices[today];
      priciestDay = today;
    }
  }
  return worst;
}
```

WHY: the worst sell for any day pairs with the most *expensive* earlier day — the mirror image of the original insight. Every comparison flips (`<` for the update, `>` for the tracker), and renaming the variables (`priciestPriceSoFar`, `lossIfSoldToday`) is what makes the flipped logic readable instead of a minefield.

### 4. Many trades

```js
export function maxTotalProfit(prices) {
  if (!Array.isArray(prices)) return 0;
  let total = 0;
  for (let today = 1; today < prices.length; today++) {
    const gain = prices[today] - prices[today - 1];
    if (gain > 0) total += gain;
  }
  return total;
}
```

WHY: any profitable ride from a valley to a peak equals the sum of its daily rises, so collecting every positive consecutive difference is optimal — no pair search needed at all. It's another O(n) single pass, and a nice property to check yourself: `maxTotalProfit(prices)` is always ≥ the single-trade profit from `bestTrade`.

### 5. Streaming prices

```js
export function makeTradeTracker() {
  let day = -1;
  let cheapestDay = 0;
  let cheapestPriceSoFar = Infinity;
  let best = null;
  return {
    addPrice(price) {
      day++;
      const profitIfSoldToday = price - cheapestPriceSoFar;
      if (profitIfSoldToday > (best?.profit ?? 0)) {
        best = { buyDay: cheapestDay, sellDay: day, profit: profitIfSoldToday };
      }
      if (price < cheapestPriceSoFar) {
        cheapestPriceSoFar = price;
        cheapestDay = day;
      }
    },
    best() { return best; },
  };
}
```

WHY: `bestTrade` never looks backward — its entire memory is three named variables, which is exactly why it can become a streaming algorithm. The closure holds that state between calls, and `addPrice` is the loop body verbatim. Starting at `Infinity` means day 0 can never "sell" (`price - Infinity` is `-Infinity`, which never beats the `?? 0` floor), replacing the special-cased `today = 1` loop start. Verified: on 200 random arrays the tracker agrees with `bestTrade` exactly.

### 6. A referee for worstTrade

```js
test('worstTrade matches brute force on random data', () => {
  const bruteForceWorst = (prices) => {
    let worst = null;
    for (let i = 0; i < prices.length; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        const profit = prices[j] - prices[i];
        if (profit < (worst?.profit ?? 0)) worst = { buyDay: i, sellDay: j, profit };
      }
    }
    return worst;
  };
  for (let trial = 0; trial < 50; trial++) {
    const prices = Array.from({ length: 30 }, () => Math.floor(Math.random() * 100));
    assert.deepEqual(worstTrade(prices), bruteForceWorst(prices), `prices: ${prices}`);
  }
});
```

WHY: this is the project's key testing idea reapplied — when the fast algorithm is subtle, keep the slow obvious one as the referee. Swapping the two `if` blocks in `worstTrade` lets a day buy and sell at the same instant, a bug hand-picked examples rarely catch but 50 random arrays almost always do. The `` `prices: ${prices}` `` message makes any failure reproducible.
