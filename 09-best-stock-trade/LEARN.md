# 📘 Learning Guide: Best Stock Trade

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

You're given a list of stock prices, one per day. You get to buy once and sell once — and you must buy *before* you sell. The program finds the pair of days that makes the most money.

Input: `[110, 95, 100, 87, 92, 105, 102, 99]` — the price was 110 on day 0, 95 on day 1, and so on (programmers count days from 0).

Output:

```
buy day 3, sell day 5, profit 18
```

Buy at 87 (day 3), sell at 105 (day 5): profit 18. No other buy-then-sell pair beats it. And if prices only ever fall — say `[100, 90, 80]` — there is *no* profitable trade, and the program should say so clearly.

## 2. Concepts you need first

**Arrays and indexes.** An array is an ordered list. Positions (*indexes*) start at 0, so "day 3" is the *fourth* price. `.length` is how many items there are.

```js
const prices = [110, 95, 100];
console.log(prices[0]);       // prints: 110
console.log(prices.length);   // prints: 3
```

**A `for` loop** visits each index in turn:

```js
const p = [5, 8, 6];
for (let i = 0; i < p.length; i++) {
  console.log(i, p[i]);
}
// prints: 0 5   then   1 8   then   2 6
```

**Nested loops = every pair.** A loop inside a loop, where the inner one starts at `i + 1`, visits every *pair* of positions with the second after the first. That's exactly "every buy day paired with every later sell day."

```js
const p = [3, 9, 5];
for (let i = 0; i < p.length; i++) {
  for (let j = i + 1; j < p.length; j++) {
    console.log(p[i], "->", p[j]);
  }
}
// prints: 3 -> 9,  3 -> 5,  9 -> 5
```

The cost: for n items that's about n²/2 pairs. 8 days → 28 pairs, fine. A million data points → ~500 *billion* pairs, not fine. Programmers call this **O(n²)** ("order n squared"): double the input, quadruple the work. A **single-pass** (O(n)) algorithm looks at each item once.

**The running-best pattern.** Loop over items, keeping a variable that remembers the best thing seen *so far*, updating it whenever something beats it:

```js
const nums = [4, 9, 2, 7];
let biggest = nums[0];
for (const n of nums) {
  if (n > biggest) biggest = n;
}
console.log(biggest);   // prints: 9
```

The refactor is this pattern run twice at once: cheapest price so far, and best trade so far.

**Objects with named fields.** An object bundles values under labels, so results explain themselves:

```js
const trade = { buyDay: 3, sellDay: 5, profit: 18 };
console.log(trade.profit);   // prints: 18
```

Compare getting `[3, 5, 18]` back — quick, what's `r[1]`? A day? A price? With an object, `trade.sellDay` answers that at the call site.

**`null` — "there is no answer."** `null` is a real JavaScript value meaning "nothing here, on purpose." Returning `null` for "no profitable trade" beats returning `-1`, because `-1` *looks* like a normal number and slips silently into math, while `null` forces the caller to notice.

**`?.` (optional chaining).** `a?.b` means: if `a` is `null` (or `undefined`), just give `undefined` instead of crashing. Without the `?`, reading a field of `null` throws an error.

```js
let best = null;
console.log(best?.profit);   // prints: undefined  (no crash!)
```

**`??` (nullish coalescing).** `x ?? fallback` means: use `x`, unless it's `null`/`undefined` — then use the fallback.

```js
let best = null;
console.log(best?.profit ?? 0);   // prints: 0
```

Together, `profitIfSoldToday > (best?.profit ?? 0)` reads: "does today's profit beat the best profit so far — or beat 0, if there's no best yet?"

**`const` vs `let` vs `var`.** `const` names a value that won't be reassigned; `let` one that will; `var` is the old-style keyword you'll see in the original (it works, but has looser rules, so modern code avoids it).

**`export` / `import` and tests.** Marking a function `export` lets other files `import` it — including a test file. A **test** calls the function with known inputs and *asserts* the expected output; `assert.deepEqual(a, b)` compares objects field by field. Node runs tests with `node --test`.

**`Math.random()` and building random arrays.** `Math.random()` gives a random decimal from 0 up to (not including) 1. `Math.floor` chops off decimals. `Array.from({ length: 30 }, () => ...)` builds a 30-item array by calling the little function 30 times. Together they make random test data:

```js
const prices = Array.from({ length: 5 }, () => Math.floor(Math.random() * 100));
console.log(prices);   // prints something like: [42, 7, 88, 13, 60]
```

## 3. Walking through the original code

```js
function best(p) {
  var m = 0;
  var a = -1;
  var b = -1;
```

A function named `best` taking `p` (the prices). Three trackers: `m` (best profit so far, "max"), `a` (buy day), `b` (sell day). The `-1`s mean "no trade found yet." None of this is written down — you just have to figure it out, like I just did.

```js
  for (var i = 0; i < p.length; i++) {
    for (var j = i + 1; j < p.length; j++) {
      if (p[j] - p[i] > m) {
        m = p[j] - p[i];
        a = i;
        b = j;
      }
    }
  }
```

The nested-loop pattern from section 2: `i` is every possible buy day, `j` every later sell day. `p[j] - p[i]` is the profit for that pair. If it beats the best so far, remember the profit and both days. This is *brute force* — try everything, keep the winner. It is completely correct.

```js
  return [a, b, m];
}

var r = best(prices);
console.log("buy day " + r[0] + ", sell day " + r[1] + ", profit " + r[2]);
```

The three answers come back as an array in a specific order, and the caller must know that `r[0]` is the buy day, `r[1]` the sell day, `r[2]` the profit. Get the order wrong and nothing crashes — you just print wrong labels.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: the names say nothing.** `m`, `a`, `b`, `p`, `i`, `j`. To understand this function you must *run it in your head* and reverse-engineer what the author meant. Bites-you-later story: three weeks from now you reopen this file to add fees. Is `m` "max profit" or "minimum price"? You guess wrong, subtract the fee from the wrong thing, and the bug ships. With `bestProfit`, there'd be nothing to guess.

**Flaw 2: positional return.** `return [a, b, m]` makes every caller memorize an order. Someone writes `r[2]` thinking it's the sell day, prints "sell day 18," and no error ever fires — the code just lies. `{ buyDay, sellDay, profit }` makes that mistake impossible to type.

**Flaw 3: magic `-1`.** When prices only fall, you get `[-1, -1, 0]`. The caller must *know* that convention and check for it. Forget the check, and `-1` flows into your next calculation as a perfectly normal-looking number — `prices[-1]` is `undefined`, math with it becomes `NaN` ("not a number"), and the mess surfaces three functions away from the cause. `null` refuses to blend in: forget to handle it and you find out immediately, right where the mistake is.

**Flaw 4: O(n²).** Every pair means ~n²/2 comparisons. 8 days: trivial. Ten years of minute-by-minute data (~2 million points): about 2 *trillion* comparisons. The program that was instant in the demo takes hours in production. Nothing is *wrong* — it's just unusably slow at real sizes.

## 5. Try it yourself first!

Cover the refactored file and try it. Hints, vaguest first:

1. First the easy wins: rename every variable to say what it holds, return an object, return `null` when no trade wins. No algorithm change needed yet.
2. For speed: suppose you're standing on day 5 deciding whether to sell today. Out of days 0–4, which buy day is the only one worth considering?
3. Right — the *cheapest* earlier day. So while walking forward, what one number do you need to keep updated?
4. One loop: track `cheapestPriceSoFar` (and which day it was). Each day, compute `prices[today] - cheapestPriceSoFar` — profit if you sold today. Keep the best.
5. Ordering matters: check "should I sell today?" *before* updating cheapest with today's price — otherwise you'd allow buying and selling on the same day.
6. To trust it: also keep the old nested-loop version, feed both the same random arrays, and confirm they always agree.

## 6. Understanding the refactored solution

```js
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
```

Design choices:

- **Guard clause.** Not an array, or fewer than 2 prices? You can't trade — `null`, immediately. The rest of the function assumes sane input.
- **The single-pass insight.** For any sell day, the only buy worth considering is the cheapest day *so far*. So one forward walk: each `today`, ask "what if I sold now?" against the remembered cheapest. "Buy before sell" is guaranteed *by construction* — cheapest-so-far is always in the past. n comparisons instead of n²/2.
- **The two names ARE the algorithm.** `cheapestPriceSoFar` and `profitIfSoldToday` — read just those and you know the whole strategy. The README's rule: when a line feels dense, don't add a comment; extract a well-named variable.
- **`best` starts as `null`** and only becomes an object when a trade with profit > 0 shows up (`best?.profit ?? 0` makes the first comparison work against 0). Falling or flat prices never create a trade, so `null` comes back naturally — no magic values.
- **Update order.** Sell-check happens *before* the cheapest-update. Swap them and a day could buy and sell at the same price instant — profit 0 trades everywhere.

**The tests** (`best-trade.test.js`): the classic case pins `{ buyDay: 3, sellDay: 5, profit: 18 }` exactly — `deepEqual` compares every field. `[10, 30, 5]` proves buy-before-sell: the *lowest* price is last, but you can't buy there and sell earlier, so the right answer is buy 0, sell 1. Falling, flat, and too-short inputs all → `null`.

The last test is the gem: it re-implements the original's dumb nested-loop version *inside the test* as `bruteForce`, then throws 50 random 30-day price arrays at both and demands identical answers. When you replace an obvious-but-slow algorithm with a clever-but-subtle one, keep the obvious one as the *referee* — it will catch off-by-one errors (like the update-order swap above) that hand-picked examples miss. The `` `prices: ${prices}` `` argument means a failure prints the exact random array that broke it, so you can reproduce the bug.

## 7. Words you learned (glossary)

- **Index** — a position in an array; counting starts at 0.
- **Nested loops** — a loop inside a loop; with `j = i + 1` it visits every ordered pair.
- **Brute force** — trying every possibility and keeping the best; simple, correct, often slow.
- **O(n²) / O(n)** — rough cost labels: work grows with the square of input size vs. in step with it.
- **Single pass** — an algorithm that walks the data exactly once.
- **Running best** — a loop variable holding the best value seen so far.
- **Magic value** — an ordinary-looking value (like `-1`) secretly carrying special meaning.
- **`null`** — the deliberate "no value" value; unignorable, unlike a magic number.
- **`?.` (optional chaining)** — read a field safely: gives `undefined` instead of crashing on `null`.
- **`??` (nullish coalescing)** — "use this value, or the fallback if it's `null`/`undefined`."
- **Guard clause** — an early return/throw handling bad input before the real work.
- **`const` / `let` / `var`** — variable declarations; `const` never reassigned, `var` is the legacy form.
- **`export` / `import`** — how one file shares functions with another (including tests).
- **`assert.deepEqual`** — test check comparing objects/arrays field by field.
- **Property-based test** — testing with many random inputs against a trusted reference, instead of hand-picked cases.
- **`NaN`** — "not a number," the poison value math produces after using `undefined`.

## 8. Experiments to try on the plane (no internet needed)

1. **Break the update order.** In `bestTrade`, move the `if (prices[today] < cheapestPriceSoFar)` block *above* the profit check. Run `node --test`. Expected: hand-picked tests may still pass, but the 50-random-arrays referee test will (almost certainly) fail — exactly the class of bug it exists to catch.
2. **Make the magic value bite.** In `original.js`, change `prices` to `[100, 90, 80]`, then add `console.log("You should buy at price " + prices[r[0]]);`. Expected: "You should buy at price undefined" — the `-1` slid straight into an array lookup with no error.
3. **Off-by-one hunt.** In the refactored loop, start at `let today = 0` instead of 1. Expected: day 0 computes `prices[0] - prices[0]`, a profit of 0 — harmless-looking, but confirm the tests still pass and explain to yourself *why* (0 never beats the `?? 0` floor).
4. **Ties: earliest or latest?** Feed both versions `[5, 10, 1, 6]` — two ways to make profit 5 (buy day 0/sell day 1, or buy day 2/sell day 3). Expected: both return `{ buyDay: 0, sellDay: 1, profit: 5 }`, because both use a strict `>` — a tie never *beats* the current best, so the earliest winner sticks. Change the `>` to `>=` in one of them and predict what happens to the referee test.
5. **Feel O(n²) vs O(n).** Build a big array in a scratch file: `const big = Array.from({ length: 200000 }, () => Math.floor(Math.random() * 1000));` Call `bestTrade(big)` — instant. Now paste the test file's `bruteForce` and call it on the same array. Expected: a *long* pause (20 billion pair-checks). Press Ctrl+C when you believe.
