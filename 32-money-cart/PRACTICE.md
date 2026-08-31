# 🏋️ Practice: Money & Shopping Cart

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Refunds: pin down negative amounts (warm-up)

Nothing in the tests says what happens with negative money. Decide the policy — refunds are legal ledger entries — and pin it: `toCents('-5.25')` returns `-525`, `formatCents(-525)` returns `'-$5.25'`, and a cart holding a $10.00 item plus a −$5.25 refund line totals exactly `475` cents.

**Practices:** making an unstated behavior a written-down, tested decision.

**Hint:** all three already work — the exercise is proving it and pinning it so a future "fix" can't break refunds.

### ⭐⭐ 2. `parsePrice` — accept human-formatted input (core)

Users paste `'$1,234.56'` into price fields. Write `parsePrice(text)` that strips `$`, commas, and spaces, then delegates to `toCents` — one parser built on the existing edge function, not a second conversion path. Expected: `'$1,234.56'` → `123456`, `'19.99'` → `1999`, `' $0.05 '` → `5`; `'ten dollars'` and `''` throw `RangeError`.

**Practices:** keeping ONE boundary where floats/strings become cents.

**Hint:** `String(text).replace(/[$,\s]/g, '')` — but reject the empty string yourself, because `Number('')` is `0`, not an error.

### ⭐⭐ 3. `splitBill` — divide with zero lost pennies (core)

Write `splitBill(cents, people)` returning an array of integer shares that sum *exactly* to `cents`, differing by at most one penny, extra pennies to the earliest people. Expected: `splitBill(1000, 3)` → `[334, 333, 333]`, `splitBill(101, 2)` → `[51, 50]`; for any inputs, `shares.reduce((a,b) => a+b) === cents`. `people` of `0` or `1.5` throws `RangeError` (chunk's loud-guard lesson).

**Practices:** integer arithmetic where division would create dust.

**Hint:** `base = Math.floor(cents / people)`; the remainder `cents - base * people` tells you how many people pay one cent extra.

### ⭐⭐ 4. `addTaxCents` — a second explicit rounding policy (core)

Write `addTaxCents(cents, ratePercent)` supporting real-world fractional rates: one `Math.round` on the tax, documented as half-up. Expected: `addTaxCents(1999, 8.875)` → `2176` (tax 177.41… rounds to 177), `addTaxCents(100, 7.5)` → `108` (7.5 rounds up to 8), rate `0` returns the input unchanged, negative rates throw `RangeError`.

**Practices:** the applyDiscountCents pattern — rounding as a chosen, named policy.

**Hint:** `cents + Math.round((cents * ratePercent) / 100)` — the multiply happens in cents, so only the final rounding touches a fraction.

### ⭐⭐⭐ 5. `allocate` — split by ratio, ledger-exact (challenge)

Generalize splitBill: `allocate(cents, ratios)` divides money proportionally — `allocate(975, [3, 7])` splits 30%/70%. Floor each share, then hand the leftover pennies to the earliest shares (a policy — write it down). Expected: `allocate(100, [1,1,1])` → `[34, 33, 33]`, `allocate(975, [3,7])` → `[293, 682]`, `allocate(1035, [50,30,20])` → `[518, 310, 207]`, every result sums exactly to the input, and all-zero ratios throw `RangeError`. (This is the algorithm real accounting libraries call "allocate".)

**Practices:** the deepest form of the lesson — proportional math where every intermediate value stays an exact integer.

**Hint:** `Math.floor((cents * r) / totalRatio)` per share; then `leftover = cents - sumOfShares` is always `0 ≤ leftover < ratios.length`.

## Solutions

### 1. Refund tests

```js
test('refunds: negative amounts flow through exactly', () => {
  assert.equal(toCents('-5.25'), -525);
  assert.equal(formatCents(-525), '-$5.25');
  assert.equal(cartTotalCents([
    { priceCents: toCents('10.00'), quantity: 1 },
    { priceCents: toCents('-5.25'), quantity: 1 },
  ]), 475);
});
```

**Why:** integer cents are exact for negatives too — `Math.round` and integer addition don't care about sign. The value of the test is the *decision*: refunds are in-scope, and anyone who later adds a `cents < 0` guard to `toCents` will hear about it from the suite. Verified with node, including Intl's `-$5.25` rendering.

### 2. `parsePrice`

```js
export function parsePrice(text) {
  const cleaned = String(text).replace(/[$,\s]/g, '');
  if (cleaned === '') throw new RangeError(`Not an amount: ${text}`);
  return toCents(cleaned);
}
```

**Why:** display formatting is noise added at the *out* edge, so the *in* edge strips it and reuses `toCents` — one rounding, one validator, one door for all money entering the system. The empty-string guard matters because `Number('')` is silently `0`; without it, a blank field becomes a free item.

### 3. `splitBill`

```js
export function splitBill(cents, people) {
  if (!Number.isInteger(people) || people < 1) {
    throw new RangeError(`People must be a positive integer, got ${people}`);
  }
  const base = Math.floor(cents / people);
  let remainder = cents - base * people;
  return Array.from({ length: people }, () => base + (remainder-- > 0 ? 1 : 0));
}
```

**Why:** dividing floats (`1000 / 3 = 333.33…`) would force per-share rounding and the pennies would drift; flooring in integers and distributing the *known* remainder makes "shares sum to the total" a mathematical certainty, not a hope. Verified with node across several totals, including `splitBill(1, 5)` → `[1, 0, 0, 0, 0]`.

### 4. `addTaxCents`

```js
export function addTaxCents(cents, ratePercent) {
  if (!Number.isFinite(ratePercent) || ratePercent < 0) {
    throw new RangeError(`Tax rate must be a non-negative percent, got ${ratePercent}`);
  }
  // POLICY: tax rounds half-up, once.
  return cents + Math.round((cents * ratePercent) / 100);
}
```

**Why:** same shape as `applyDiscountCents` on purpose — every place money meets a percentage gets exactly one rounding, with the policy in a comment and a test (`8.875%` of $19.99 is 177.41 cents → 177). The float appears only inside the `Math.round` call and never escapes into stored data.

### 5. `allocate`

```js
export function allocate(cents, ratios) {
  const totalRatio = ratios.reduce((a, b) => a + b, 0);
  if (totalRatio <= 0) throw new RangeError('Ratios must sum to a positive number');
  const shares = ratios.map((r) => Math.floor((cents * r) / totalRatio));
  let leftover = cents - shares.reduce((a, b) => a + b, 0);
  // POLICY: leftover pennies go to the earliest shares.
  for (let i = 0; leftover > 0; i++, leftover--) shares[i] += 1;
  return shares;
}
```

**Why:** the naive `cents * (r / totalRatio)` computes a float ratio first and inherits dust; `(cents * r) / totalRatio` keeps the multiply exact in integers so only the final floor loses anything — and what it loses is *counted* (`leftover`) and handed back out penny by penny. The ledger invariant "outputs sum to input" is asserted for every case; verified with node, including `allocate(7, [1,1,1,1,1])` → `[2, 2, 1, 1, 1]`.
