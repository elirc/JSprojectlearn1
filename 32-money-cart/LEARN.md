# 📘 Learning Guide: Money & Shopping Cart

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A shopping cart that adds up prices and applies discounts — *exactly*. No missing pennies.

```js
const cart = [
  { name: 'coffee', priceCents: 1035, quantity: 3 },
  { name: 'filter', priceCents: 10,   quantity: 2 },
];
cartTotalCents(cart)            // 3125  (exactly $31.25)
applyDiscountCents(3125, 10)    // 2812  (10% off)
formatCents(3125)               // "$31.25"
```

Running `node original.js` shows the same cart computed in floating-point dollars: the total comes out as `31.249999999999996`, and a customer misses a free-shipping threshold by 0.000000000000004 dollars.

## 2. Concepts you need first

### How computers store decimal numbers (floating point)

JavaScript numbers are **binary floating point**: they're stored in base 2 (powers of ½: 0.5, 0.25, 0.125...). Most decimal fractions — 0.1, 0.2, 0.35 — *cannot* be written exactly in base 2, just like ⅓ can't be written exactly in decimal (0.3333... forever). So the computer stores the closest binary value it can, which is very slightly off:

```js
console.log(0.1 + 0.2);         // 0.30000000000000004
console.log(0.1 + 0.2 === 0.3); // false
```

This is not a JavaScript bug — Python, Java, and C do the same. It's the price of base-2 hardware.

### Error accumulation ("dust")

Each individual value is off by maybe a quadrillionth. But every add and multiply combines the dust, and a cart with many items snowballs it into something visible:

```js
let total = 0;
for (let i = 0; i < 10; i++) total += 0.1;
console.log(total);        // 0.9999999999999999 — ten dimes ≠ a dollar!
console.log(total === 1);  // false
```

### `toFixed` — display rounding, not data repair

`num.toFixed(2)` returns a *string* rounded to 2 decimal places. It changes what the user sees, not what the variable holds:

```js
const total = 31.249999999999996;
console.log(total.toFixed(2));  // "31.25" — looks fine
console.log(total * 0.9);       // 28.124999999999996 — dust still in the data
console.log((1.005).toFixed(2)); // "1.00" (!) — 1.005 already isn't 1.005 in binary
```

### The fix: integers

Whole-number arithmetic in JavaScript is **exact** up to `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991 — about $90 trillion if the units are cents). `1035 * 3` is exactly `3105`, every time. So the rule: **store money as integer cents** (`1035`), never as decimal dollars (`10.35`). Real payment systems (like Stripe's API) work exactly this way.

### Boundaries and edges

The trick isn't "never use floats" — users type `"10.35"` and screens display `$10.35`. The trick is confining floats to two **edges**:
- **In**: convert to cents once, with one `Math.round`, immediately.
- **Out**: divide by 100 only when formatting for display.
Everything between the edges is exact integer math.

### `Math.round` and rounding policy

`Math.round(x)` gives the nearest whole number; `.5` rounds up ("half up"):

```js
console.log(Math.round(312.5)); // 313
console.log(Math.round(312.4)); // 312
```

For money, *which way* you round halves is a business decision (who gets the half-penny — you or the customer?). Good code writes the choice down instead of letting it happen by accident.

### `reduce` — folding a list into one value

`array.reduce(fn, start)` walks the array carrying an accumulator:

```js
const nums = [1, 2, 3];
const sum = nums.reduce((acc, n) => acc + n, 0);
console.log(sum); // 6   (0+1 → 1+2 → 3+3)
```

It's the natural shape for "total up a cart". The `(total, { priceCents, quantity })` in the refactor also uses **destructuring** — unpacking an object's fields right in the parameter list.

### `Intl.NumberFormat` — the built-in currency formatter

Node and browsers ship an internationalization toolkit. It knows currency symbols, thousands separators, and regional formats — so you never hand-glue `"$" + n.toFixed(2)`:

```js
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
console.log(usd.format(1234567.89)); // $1,234,567.89
const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
console.log(eur.format(31.25));      // 31,25 €
```

A **locale** (like `'en-US'` or `'de-DE'`) names a language + region's formatting habits.

### Guard clauses with `RangeError`

Checking inputs at the door and throwing a built-in error when they're nonsense: `Number.isFinite(x)` is false for `NaN` and `Infinity`, so one check rejects `"ten dollars"` and `Infinity` alike.

## 3. Walking through the original code

The cart and the total:

```js
var cart = [
  { name: "coffee", price: 10.35, quantity: 3 },
  { name: "filter", price: 0.10, quantity: 2 },
];

function cartTotal(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  return total;
}
```

A plain loop: price × quantity, summed. Perfectly reasonable-looking code. But `10.35` and `0.10` are already slightly-off binary approximations, and each multiply and add compounds it:

```js
console.log(total); // 31.249999999999996  ...not 31.25
```

The file then shows the root cause (`0.1 + 0.2` printing `0.30000000000000004`) and the patch attempt:

```js
console.log("Total: $" + total.toFixed(2)); // "$31.25" — looks fixed!
```

...followed by the proof it isn't fixed:

```js
var discounted = total * 0.9;
console.log("free shipping over $28.125?", discounted >= 28.125); // false!?
```

The discount math inherited the dust: `discounted` is `28.124999999999996`, a hair *below* the threshold. The customer loses free shipping over four femto-dollars. Last line: `(1.005).toFixed(2)` is `"1.00"` — even the display band-aid rounds surprisingly, because `1.005` is stored as slightly *less* than 1.005.

## 4. What's wrong with it (in beginner terms)

**Floats can't hold most prices.** `10.35` in the source code is already a lie — the stored number is `10.3499999999999996...`-ish. Nothing you do afterwards can recover the exactness that was lost on line one.

**Dust compounds.** One item, you'd never notice. A cart of 30 items, a marketplace summing 10,000 orders a day, a year-end report — the errors don't cancel out reliably; they drift. Here's the accountant story: the ledger says the day's sales were $8,442.61; the payment processor says $8,442.62. A human now spends an afternoon hunting a penny that no line of code visibly created. Next month it happens again.

**`toFixed` launders the display and leaves the data dirty.** The total *prints* as $31.25, so everyone believes the data is fine. Then any *comparison* — `discounted >= 28.125`, `total === expectedTotal`, "is the refund equal to the charge?" — silently fails. Threshold bugs like the free-shipping one are brutal to debug because both printed numbers look identical.

**Comparisons are the killer.** Displays can round; `if` statements can't. Money code is full of `>=` and `===` (thresholds, reconciliation, "paid in full?"), and floats turn each one into a coin flip at the 15th decimal.

## 5. Try it yourself first!

Try fixing the cart before reading on. Hints, vague → specific:

1. What unit could you store prices in so that every value is a whole number?
2. Cents. `$10.35` becomes `1035`. Rewrite the cart with `priceCents` fields and re-total — integer math is exact.
3. Users still type `"10.35"`. Write `toCents(dollars)` converting once at the edge. Careful: `10.35 * 100` is `1034.9999999999999` — you need one `Math.round` in there.
4. Validate in `toCents`: reject anything that isn't a finite number (throw a `RangeError`).
5. Write `formatCents(cents)` for display. Bonus: use `Intl.NumberFormat` instead of string-gluing `$`.
6. Discounts: `cents - Math.round(cents * percent / 100)` — and notice you just *chose* a rounding rule. Write a comment saying so.

## 6. Understanding the refactored solution

**The rule, stated up front** in `refactored/money.js`: money is integer cents; floats appear only at the edges.

**Edge one — in:**

```js
export function toCents(dollars) {
  const value = Number(dollars);
  if (!Number.isFinite(value)) {
    throw new RangeError(`Not an amount: ${dollars}`);
  }
  const cents = Math.round(value * 100);
  return cents;
}
```

Accepts `"10.35"` or `10.35`, rejects garbage loudly, and does exactly **one** rounding to absorb the input's float dust. The test pins the subtle case: `toCents(10.35)` is `1035`, even though `10.35 * 100` is `1034.9999…` — without the round, the bug would sneak in through the conversion itself.

**The exact middle:**

```js
export function cartTotalCents(items) {
  return items.reduce(
    (total, { priceCents, quantity }) => total + priceCents * quantity,
    0,
  );
}
```

A `reduce` fold over integer cents. `1035 * 3 + 10 * 2` is exactly `3125`, always.

**Policy made visible:**

```js
export function applyDiscountCents(cents, percent) {
  if (percent < 0 || percent > 100) {
    throw new RangeError(`Discount must be 0-100%, got ${percent}`);
  }
  return cents - Math.round((cents * percent) / 100);
}
```

10% of 3125 is 312.5 cents — a half-penny with no physical coin. `Math.round` rounds it half-up to 313 off, and the doc comment *says* that's a policy choice. When rounding is implicit, nobody chose it — and someday an auditor asks who did.

**Edge two — out:**

```js
export function formatCents(cents, { locale = 'en-US', currency = 'USD' } = {}) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency })
    .format(cents / 100);
}
```

The only division by 100 in the file, feeding `Intl`, which handles the `$`, the commas in `$1,234,567.89`, and — as the last test shows — euros and German formatting as mere *parameters*.

**The tests** replay the crime scene: the original's exact cart now totals `3125`, exactly; ten dimes make exactly a dollar; `toCents` absorbs dust and rejects `'ten dollars'` and `Infinity`; the discount lands on `2812` and threshold comparisons are exact again; formatting handles small, large, and foreign amounts.

## 7. Words you learned (glossary)

- **Floating point**: how computers store non-whole numbers, in base 2, approximately.
- **Binary (base 2)**: counting with only 0 and 1; can't represent most decimal fractions exactly.
- **Float dust / rounding error**: the tiny inaccuracy in each stored decimal fraction.
- **Error accumulation**: dust compounding across many operations until it's visible.
- **`toFixed(n)`**: format a number as a string with n decimals — display only, data unchanged.
- **`Number.MAX_SAFE_INTEGER`**: largest integer JS handles exactly (~9 quadrillion).
- **Integer cents**: storing money as whole cents (`1035`), the exact-math trick.
- **Edge / boundary**: where data enters or leaves your core logic — the only place conversions belong.
- **`Math.round`**: nearest whole number; halves go up.
- **Rounding policy**: the deliberate choice of what happens to half-cents.
- **`reduce` / fold**: combine a whole array into one value with an accumulator.
- **Accumulator**: the running result carried through a `reduce`.
- **Destructuring**: unpacking fields in place: `({ priceCents, quantity }) => ...`.
- **`Intl.NumberFormat`**: built-in formatter for currencies and numbers by locale.
- **Locale**: a language+region formatting convention like `'en-US'` or `'de-DE'`.
- **`Number.isFinite`**: true only for real, usable numbers — false for `NaN`/`Infinity`.
- **`RangeError`**: built-in error for values outside the acceptable range.
- **Measurement vs ledger entry**: numbers that may be approximate (temperature) vs numbers that must be exact (money).

## 8. Experiments to try on the plane (no internet needed)

1. **See the dust with your own eyes.** Scratch file: `let t = 0; for (let i = 0; i < 100; i++) t += 0.01; console.log(t, t === 1);`. Expected: `1.0000000000000007 false` — a hundred pennies, floating-point style.
2. **Delete the one rounding that matters.** In `refactored/money.js`, change `Math.round(value * 100)` to just `value * 100` and run `node --test 32-money-cart/`. Expected: the "toCents absorbs input float dust" test fails — `toCents(10.35)` returns `1034.9999999999999`. One line was carrying the whole system.
3. **Choose a different rounding policy.** Swap `Math.round` for `Math.floor` in `applyDiscountCents` and run the tests. Expected: the discount test fails — `2813` instead of `2812` (only 312 comes off instead of 313). Half-pennies are policy; the test is the written-down decision.
4. **Break the safe-integer ceiling on purpose.** Scratch file: `console.log(Number.MAX_SAFE_INTEGER, 9007199254740992 === 9007199254740993);`. Expected: `9007199254740991 true` (!) — beyond the ceiling, adjacent integers become indistinguishable. Integer cents are exact *because* real prices sit far below this line.
5. **Format the world.** Add a test (or scratch lines) with `formatCents(3125, { locale: 'ja-JP', currency: 'JPY' })` and `formatCents(3125, { locale: 'en-GB', currency: 'GBP' })`. Expected: yen shows `￥31` territory (JPY has no cents — note the interesting wrinkle!) and pounds show `£31.25`. Currencies are parameters, not rewrites.
