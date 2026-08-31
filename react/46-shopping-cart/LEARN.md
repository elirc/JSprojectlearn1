# 📘 Learning Guide: Shopping Cart

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A tiny coffee shop. Three "add" buttons — Coffee beans ($10.35),
Filters ($0.10), Mug ($14.95). Clicking adds the item to a cart list
below ("Coffee beans x3"). Under the list: a subtotal, a discount
(10% off when the subtotal passes $30), and a total.

- **Original:** add 3× coffee and 2× filters, then look at the
  subtotal: `$31.249999999999996`. Fifteen decimal places of garbage,
  and the discount inherits it.
- **Refactored:** the same clicks show exactly `$31.25`, formatted
  properly, and each cart line also gets a remove button and its own
  line total.

## 2. Concepts you need first

### Why 0.1 + 0.2 isn't 0.3 (floating-point money)

Computers store numbers in binary (base 2). Just like 1/3 can't be
written exactly in decimal (0.3333... forever), 1/10 can't be written
exactly in binary. So the computer stores the *nearest possible*
value, and tiny errors — think of them as dust — hide in almost every
decimal number:

```js
0.1 + 0.2          // 0.30000000000000004
10.35 * 3          // 31.049999999999997
```

One operation's dust is invisible. But arithmetic *accumulates* it:
multiply, add five lines, take 10% — and the dust surfaces as
`$31.249999999999996` on a customer's receipt.

### The fix: integer cents

Whole numbers (integers) up to very large sizes ARE exact in binary.
So the money rule: **store and compute money as integer cents**, and
only convert to dollars at the moment of display.

```js
const priceCents = 1035;        // $10.35, exactly, forever
const total = priceCents * 3;   // 3105 — no dust possible
```

$10.35 becomes `1035`. Sums, multiplications, and comparisons all stay
in integers, where math is exact by construction.

### Why toFixed(2) is a trap

`(31.249999999999996).toFixed(2)` gives the *string* `"31.25"` — looks
fixed! But it only launders the display. The underlying number is
still wrong, and that wrong number is what your code would send to a
payment API, store in a database, or compare against a threshold.
Fixing the screen while shipping the bug is worse than showing it.

### Intl.NumberFormat (formatting at the edge)

`Intl` is the browser's built-in internationalization toolkit. Its
`NumberFormat` turns numbers into properly formatted currency strings:

```js
new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
  .format(31.25);   // "$31.25"
```

The pattern is called **formatting at the edge**: the entire app
thinks in cents; only the final render step converts `3125` →
`"$31.25"`. Data stays exact; display stays pretty.

### Rounding a discount explicitly

10% of 3125 cents is 312.5 cents — half a cent doesn't exist. Someone
must decide which way it goes. `Math.round((cents * percent) / 100)`
makes that decision explicit and keeps the result an integer. Hidden
rounding is where money bugs breed; visible rounding is a design
decision.

### Mutation vs immutable updates (quick recap)

React decides "did state change?" by comparing object **references**
(is it the same object in memory?). If you modify an object in place
(**mutation**), the reference stays the same and React may not notice.
Project 10 covers this fully. The safe habit: build new objects.

```js
// mutation (bad in React state):
line.qty += 1;
// immutable update (good):
cart.map((l) => l.id === id ? { ...l, qty: l.qty + 1 } : l)
```

### Reducers (quick recap)

A **reducer** is a pure function `(state, action) => newState`;
`useReducer` wires one to a component and gives you `dispatch` to send
actions like `{ type: 'added', product }`. Project 13's LEARN.md
teaches it fully. Carts fit reducers perfectly: a short rulebook of
ways the cart may change.

### reduce (the array method — different thing!)

Confusingly named but unrelated to reducers-in-React:
`array.reduce((sum, item) => ..., start)` folds an array into one
value. Here it totals the cart:

```js
cart.reduce((sum, line) => sum + line.priceCents * line.qty, 0)
```

## 3. Walking through the original code

The products store dollars as floats:

```js
const PRODUCTS = [
  { id: 'coffee', name: 'Coffee beans', price: 10.35 },
  { id: 'filter', name: 'Filters', price: 0.10 },
  { id: 'mug', name: 'Mug', price: 14.95 },
];
```

The cart is `useState([])`, holding lines like
`{ id, name, price, qty }`. Adding an item:

```js
function add(product) {
  const existing = cart.find((line) => line.id === product.id);
  if (existing) {
    existing.qty += 1;     // MUTATION — "mostly works"
    setCart([...cart]);    // ...because of this shallow-copy kludge
  } else {
    setCart([...cart, { ...product, qty: 1 }]);
  }
}
```

If the item's already in the cart, it **mutates** the line object
(`existing.qty += 1`), then hands React a shallow copy of the array so
the screen updates anyway. More on why that's a landmine below.

The money is computed (derivation itself is fine!) — but in floats:

```js
const subtotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
const discount = subtotal > 30 ? subtotal * 0.1 : 0;
const total = subtotal - discount;
```

And rendered raw: `<p>subtotal: ${subtotal}</p>` — whatever digits the
float has, the customer sees.

## 4. What's wrong with it (in beginner terms)

**Flaw 1 — float money, on screen.** Click "add Coffee beans" three
times and "add Filters" twice. Do the math on paper:
3 × $10.35 + 2 × $0.10 = $31.25. The screen says:
`subtotal: $31.249999999999996`. Why? `10.35` was never exactly 10.35
in binary; multiplying and summing amplified the dust. Then
`subtotal * 0.1` computes a discount from the dusty number — the error
*compounds*. A real shop would be showing this on a receipt.

The tempting patch is `toFixed(2)`, and it's the trap the README
flags: the display would say $31.25 while the actual number in memory
— the one a payment API would receive — stays wrong. Screens lie
easily; data shouldn't.

**Flaw 2 — the mutation with a kludge.** `existing.qty += 1` edits a
line object that's *inside current state* — project 10's forbidden
move. The `setCart([...cart])` next to it copies the array so React
re-renders, which makes it "work" today. But the line objects
themselves are shared and mutated, so the first time you:
- wrap a cart row in `React.memo` (project 28) — the row won't update
  (same object reference, "nothing changed");
- add undo/redo (project 40) — history entries all point at the same
  mutated objects, so "the past" silently rewrites itself.
Code that works only until you use a normal feature is broken code on
a delay.

## 5. Try it yourself first!

1. **Vague:** the bug isn't in React. What *unit* should money be in
   so the math can't produce dust?
2. **Warmer:** change `price: 10.35` to `priceCents: 1035` (and the
   others to 10 and 1495). Keep every calculation in cents. Where's
   the only place cents should become dollars?
3. **Formatting:** write `formatCents(cents)` using
   `Intl.NumberFormat` with `style: 'currency'`. Use it in the render
   only.
4. **The discount:** 10% of an odd number of cents is a half-cent.
   Write `applyDiscountCents(cents, percent)` with an explicit
   `Math.round`. And careful — the $30 threshold is now `3000`.
5. **The mutation:** replace `add`'s in-place bump with an immutable
   `map` + spread. Better yet, move the add/remove rules into a
   `cartReducer` and switch to `useReducer` — you wrote this exact
   reducer in project 41.

## 6. Understanding the refactored solution

**The money module — two functions, zero React:**

```js
function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
    .format(cents / 100);
}
function applyDiscountCents(cents, percent) {
  return cents - Math.round((cents * percent) / 100);
}
```

`formatCents` is the *only* place cents meet dollars — the display
edge. The `/ 100` here is safe because it feeds a formatter, not
further math. `applyDiscountCents` subtracts a rounded discount, so
the result is always an integer and the rounding rule is visible in
code review. This is the JS track's project 32 module, unchanged —
good pure functions don't care what framework calls them.

**Prices stored as cents:** `priceCents: 1035`. Floats never enter the
data at all — exactness by construction, not by care.

**The cart is a reducer:**

```js
case 'added': {
  const existing = cart.find((line) => line.id === action.product.id);
  if (existing) {
    return cart.map((line) =>
      line.id === action.product.id ? { ...line, qty: line.qty + 1 } : line);
  }
  return [...cart, { ...action.product, qty: 1 }];
}
```

Compare with the original's `add`: the qty bump is now `map` + spread —
a *new* line object replaces the old one; nothing is edited in place;
no kludge needed. `removed` is a `filter`. Unknown actions throw —
fail loudly. Because the reducer is pure and framework-free, it could
lift straight into Node unit tests or project 41's context store —
which is where a real app's cart ends up.

**Money is derived, in cents, every render:**

```js
const subtotalCents = cart.reduce(
  (sum, line) => sum + line.priceCents * line.qty, 0);
const discountedCents = subtotalCents > 3000
  ? applyDiscountCents(subtotalCents, 10)
  : subtotalCents;
const discountCents = subtotalCents - discountedCents;
```

No stored totals — nothing to desync (project 09). Note
`> 3000`: the $30 threshold expressed in cents. The README admits it
"reads oddly for one second and then correctly forever" — every sum,
threshold, and comparison lives in the same integer unit, so no line
of code ever mixes units.

**The render formats at the edge:** every money value on screen goes
through `formatCents` — buttons, line totals, subtotal, discount,
total. 3× coffee + 2× filters shows **exactly $31.25** on the first
try, not because anything rounds the display, but because the math
never had an error to hide.

## 7. Words you learned (glossary)

- **Floating point:** how computers store decimal numbers — in
  binary, where most decimals are slightly inexact.
- **Binary dust:** the tiny representation errors that accumulate
  through arithmetic.
- **Integer cents:** storing money as whole cents (`1035` = $10.35)
  so all math is exact.
- **toFixed(2):** rounds a number to a 2-decimal *string* — display
  laundering, not a fix.
- **Intl.NumberFormat:** the browser's built-in currency/number
  formatter.
- **Formatting at the edge:** keep exact units internally; convert to
  human format only at render.
- **Explicit rounding:** a visible `Math.round` where fractions of a
  cent must be decided.
- **Mutation:** editing an object/array in place.
- **Immutable update:** replacing changed objects with new copies
  (`map` + spread).
- **Shallow copy:** copying an array/object one level deep — the
  items inside are still the same shared objects.
- **Kludge:** a patch that makes symptoms disappear without fixing
  the cause.
- **Reducer:** a pure function `(state, action) => newState`.
- **dispatch:** the function that sends actions to a reducer.
- **Derived value:** computed from state during render, never stored.
- **reduce (array method):** fold an array into a single value.
- **Pure function:** output depends only on inputs; no side effects;
  trivially testable.

## 8. Experiments to try on the plane (no internet needed)

You can edit and reason offline; the pages load React from a CDN
(shared library servers), so actually running them needs internet on
first load.

1. **Find more dust.** In the original, try other combos: 2× mug +
   1× filter, or 7× filters. Expected: some totals come out clean,
   others sprout long decimals — float errors are unpredictable,
   which is exactly why "it looked fine in testing" doesn't save you.
2. **Prove the half-cent decision matters.** In the refactor, add a
   product priced at `priceCents: 5` and get the subtotal to an odd
   number over 3000. Expected: the discount is exact to the cent,
   and you can point at the `Math.round` that decided the half-cent.
   Change it to `Math.floor` — the shop now always keeps the
   half-cent. That one-word change is a business decision, visible.
3. **Re-introduce the mutation, then hunt it.** In the refactor's
   reducer, change the `map` branch back to
   `existing.qty += 1; return [...cart];`. Expected: the app still
   *looks* fine (the kludge strikes again) — then reason through what
   breaks the day a row becomes `React.memo`'d or the cart gets
   project 40's undo. Mutation bugs hide until composition reveals
   them.
4. **Add a 'clear cart' action.** One reducer case
   (`case 'cleared': return [];`) and one button. Expected: subtotal,
   discount, and total all fall to $0.00 with no extra code — they're
   derived, so they can't be forgotten.
5. **Change the currency.** In `formatCents`, switch `'en-US'`/`'USD'`
   to `'de-DE'`/`'EUR'`. Expected: `31,25 €` — different separators,
   symbol, and placement. One line changed, because formatting lives
   at exactly one edge.
