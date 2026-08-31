# 🏋️ Practice: Shopping Cart

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Everything here is checkable by reading and reasoning about your code, or by running Node; the pages themselves load React from a CDN, so save those for when you're online.)

All exercises modify `refactored/index.html` unless they say otherwise.

## Exercises

### ⭐ 1. Count the basket (warm-up)

Add a line above the list that reads "5 items" — the total quantity, not the number of lines, so 3× coffee + 2× filters is 5, not 2. Use singular "item" when the count is 1. Rule: no new state; this is another derivation off `cart`, exactly like `subtotalCents`.

**Practices:** deriving a second value from the same array with `reduce`.

**Hint:** the subtotal folds `priceCents * qty`; this one folds just `qty`.

**Expected:** empty cart shows "0 items"; one click on Filters shows "1 item"; 3× coffee + 2× filters shows "5 items", and it drops to 3 the moment you remove the filters line.

### ⭐⭐ 2. A minus button that knows when to quit (core)

Add a `−` button on each cart line, next to the `x`, driven by a new `'decremented'` reducer action. Subtracting from a line with `qty` 2 or more lowers it by one; subtracting from a line at `qty` 1 removes the line entirely (nobody wants "Filters x0" on a receipt). Keep it immutable — no `line.qty -= 1` anywhere — and make an unknown id a no-op that returns the *same* cart array.

**Practices:** extending a reducer with a rule that has two branches, plus the "return state unchanged" no-op convention.

**Hint:** you already own both moves: `map` + spread for the bump-down, `filter` for the removal. Which one you need depends on `line.qty === 1`.

**Expected:** with Filters x2, one `−` gives "Filters x1 — $0.10", a second `−` deletes the line; the subtotal, discount, total, and your item count from exercise 1 all follow automatically because they're derived.

### ⭐⭐ 3. Predict the receipt (core)

A teammate "tidied" the discount, reasoning that 10% is 0.1:

```jsx
const discountedCents = subtotalCents > 3000
  ? applyDiscountCents(subtotalCents, 0.1)
  : subtotalCents;
```

`applyDiscountCents` is unchanged. Without running anything, write down all five money lines the page shows after clicking coffee three times and filters twice — both cart line totals, subtotal, discount, total — then explain the discount figure and fix the call.

**Practices:** reading a unit through a function — "percent" and "fraction" are different units wearing the same word.

**Hint:** substitute by hand: `3125 - Math.round((3125 * 0.1) / 100)`. What is `Math.round(3.125)`?

**Expected:** your five strings match the solution exactly. Note that nothing looks broken — no dust, no long decimals, no error — which is what makes this class of bug expensive.

### ⭐⭐ 4. Extract the cart line (core)

Pull each `<li>` into a `CartLine` component that takes the line and reports clicks upward through callback props (`onRemove`, and `onDecrement` from exercise 2). `App` keeps owning the reducer; `CartLine` never sees `dispatch`. Keep `formatCents` inside `CartLine` — the display edge is wherever the number becomes text.

**Practices:** component extraction with callback props; keeping rules in the parent and formatting at the leaf.

**Hint:** the parent supplies `onRemove={() => dispatch({ type: 'removed', id: line.id })}` and the child just calls `onRemove()` — the child doesn't need to know the action shape.

**Expected:** the page is pixel-identical to before. The win is structural: `CartLine` could be dropped into any cart, because it knows a line's shape and nothing about your reducer's vocabulary.

### ⭐⭐⭐ 5. Lift the reducer into Node tests (challenge)

The README claims the reducer "could lift into Node tests unchanged" — cash that claim. Create `refactored/cart-reducer.js` exporting `cartReducer`, `formatCents`, and `applyDiscountCents`, plus `refactored/cart-reducer.test.js` using `node:test`, and run `node --test react/46-shopping-cart/refactored/` from the repo root. Test at least: adding a new product, adding an existing one *without mutating the previous state*, decrementing to zero, and the half-cent rounding. Project 40 already ships this pair of files if you want the shape.

**Practices:** proving purity with assertions — including the immutability claim, which is the one a reader can't verify by eye.

**Hint:** capture the cart before and after an add and assert three things: the new qty is 2, the old line's qty is *still* 1, and `after[0] !== before[0]`. Keep the page working by leaving a copy of the reducer inline in `index.html` (a `file://` page can't import modules — project 40 leaves the same note).

**Expected:** `node --test` prints all-pass with no browser involved. Then re-introduce `existing.qty += 1` in the module and watch the immutability test fail — the test catches the bug the *screen* was happy to hide.

### ⭐⭐⭐ 6. Sales tax, without letting a float in (challenge)

Add 8.75% sales tax, charged on the discounted amount, shown as its own line above the total. The trap: 8.75 isn't expressible as a whole percent, and `cents * 0.0875` invites the exact dust js#32 spent a project killing. Express the rate in **basis points** (hundredths of a percent, so 8.75% = `875`) and keep every intermediate an integer.

**Practices:** picking an integer unit fine enough for the domain — the same move as cents, one level down.

**Hint:** `Math.round((cents * basisPoints) / 10000)`; the multiplication happens first, on integers, and the single division feeds a single explicit rounding.

**Expected:** 3× coffee + 2× filters reads subtotal $31.25, discount $3.13, tax $2.46, total $30.58. One mug alone (under the discount threshold) reads subtotal $14.95, discount $0.00, tax $1.31, total $16.26.

## Solutions

### 1. Count the basket

```jsx
const itemCount = cart.reduce((n, line) => n + line.qty, 0);

// above the <ul>:
<p>{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
```

**Why:** `cart` already knows the answer, so storing a count would be a second copy of the truth that could drift from the first — project 09's rule, and the same reason `subtotalCents` isn't state either. Folding `qty` rather than `line`s is the whole distinction between "how many things" and "how many rows," which is exactly the sort of thing a stored counter gets wrong after a `removed` action.

### 2. A minus button that knows when to quit

```jsx
case 'decremented': {
  const line = cart.find((l) => l.id === action.id);
  if (!line) return cart;
  if (line.qty === 1) return cart.filter((l) => l.id !== action.id);
  return cart.map((l) => (l.id === action.id ? { ...l, qty: l.qty - 1 } : l));
}
```

```jsx
{' '}<button onClick={() => dispatch({ type: 'decremented', id: line.id })}>−</button>
```

**Why:** the two branches are the two immutable moves you already had — `filter` to drop a line, `map` + spread to replace one. Returning `cart` itself for an unknown id is the reducer convention for "this action means nothing here": because the array reference is unchanged, React compares with `Object.is`, sees the same object, and skips the re-render entirely. Every derived money value updates for free, since none of them are stored.

### 3. Predict the receipt

The page shows:

```
Coffee beans x3 — $31.05
Filters x2 — $0.20
subtotal: $31.25
discount: $0.03
total: $31.22
```

The fix is `applyDiscountCents(subtotalCents, 10)`.

**Why:** `applyDiscountCents(cents, percent)` divides by 100 itself, so it wants `10`, not `0.1`. Passing the fraction computes `Math.round((3125 * 0.1) / 100)` = `Math.round(3.125)` = `3` cents off — a discount of three cents where the shop promised $3.13. Notice what this bug is *not*: there's no float dust, no fifteen-decimal total, nothing on screen that looks wrong. Integer cents guaranteed exactness, and exactness is not correctness — it just means when you're wrong, you're wrong to the penny, and the only defence is a unit named in the function signature and asserted in a test.

### 4. Extract the cart line

```jsx
function CartLine({ line, onDecrement, onRemove }) {
  return (
    <li>
      {line.name} x{line.qty} — {formatCents(line.priceCents * line.qty)}
      {' '}<button onClick={onDecrement}>−</button>
      {' '}<button onClick={onRemove}>x</button>
    </li>
  );
}

// in App:
{cart.map((line) => (
  <CartLine
    key={line.id}
    line={line}
    onDecrement={() => dispatch({ type: 'decremented', id: line.id })}
    onRemove={() => dispatch({ type: 'removed', id: line.id })}
  />
))}
```

**Why:** the `key` stays on `CartLine` at the call site, where the list is — a child can't key itself. Handing down `onRemove` instead of `dispatch` means the child knows *that* it can be removed, not *how* removal is spelled in your action vocabulary; swap the reducer for project 41's store and `CartLine` doesn't change. The line total still runs through `formatCents` here, which is fine and in fact the point: formatting at the edge means at the leaf that renders text, not in some central "convert everything" step.

### 5. Lift the reducer into Node tests

`refactored/cart-reducer.js`:

```js
export function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
    .format(cents / 100);
}
export function applyDiscountCents(cents, percent) {
  return cents - Math.round((cents * percent) / 100);
}
export function cartReducer(cart, action) { /* ...exactly as in index.html... */ }
```

`refactored/cart-reducer.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cartReducer, applyDiscountCents, formatCents } from './cart-reducer.js';

const coffee = { id: 'coffee', name: 'Coffee beans', priceCents: 1035 };
const add = (product) => ({ type: 'added', product });
const replay = (actions) => actions.reduce(cartReducer, []);

test('adding an existing product bumps qty WITHOUT mutating the old state', () => {
  const before = replay([add(coffee)]);
  const after = cartReducer(before, add(coffee));
  assert.equal(after[0].qty, 2);
  assert.equal(before[0].qty, 1);       // the old state is untouched
  assert.notEqual(after[0], before[0]); // a NEW line object
});

test('decrementing to zero drops the line', () => {
  const cart = replay([add(coffee), { type: 'decremented', id: 'coffee' }]);
  assert.deepEqual(cart, []);
});

test('money stays exact and the half-cent is rounded on purpose', () => {
  const cart = replay([add(coffee), add(coffee), add(coffee)]);
  const subtotal = cart.reduce((s, l) => s + l.priceCents * l.qty, 0);
  assert.equal(subtotal, 3105);
  assert.equal(applyDiscountCents(3125, 10), 2812); // 312.5 off -> 313
  assert.equal(formatCents(2812), '$28.12');
});
```

**Why:** a pure `(state, action) => newState` needs no DOM, no React, and no browser, so `node --test` runs it in milliseconds — that's what "framework-free" buys you. The immutability assertions are the valuable ones: mutation is invisible on screen (the `[...cart]` kludge hides it) but obvious to `assert.equal(before[0].qty, 1)`, which is the whole argument for testing rules rather than pixels. Keep the inline copy in the page because a `file://` page can't `import` — the duplication is the price of running with no build step, and project 40 pays it too.

### 6. Sales tax, without letting a float in

```jsx
const TAX_BASIS_POINTS = 875; // 8.75%, in hundredths of a percent

function taxCents(cents, basisPoints) {
  return Math.round((cents * basisPoints) / 10000);
}

// in App, after discountedCents:
const salesTaxCents = taxCents(discountedCents, TAX_BASIS_POINTS);
const totalCents = discountedCents + salesTaxCents;

<p>subtotal: {formatCents(subtotalCents)}</p>
<p>discount: {formatCents(discountCents)}</p>
<p>tax: {formatCents(salesTaxCents)}</p>
<h3>total: {formatCents(totalCents)}</h3>
```

**Why:** basis points are the same trick as cents applied one decimal place further — pick a unit small enough that every rate in your domain is a whole number of them, and the multiplication `2812 * 875 = 2460500` is exact by construction. The single `/ 10000` immediately meets an explicit `Math.round`, so the float exists for one expression and never gets stored or compared. Order matters as much as units: taxing the discounted amount rather than the subtotal is a *business* rule, and writing it as `taxCents(discountedCents, ...)` puts that decision where a reviewer can see it, which is the same reason the half-cent `Math.round` was worth making visible in the first place.
