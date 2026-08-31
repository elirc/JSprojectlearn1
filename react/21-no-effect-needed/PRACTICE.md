# 🏋️ Practice: You Might Not Need an Effect

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Free shipping at $100 (warm-up)

Add a line under the total: `Free shipping!` when `total` is at least 100, otherwise `Add $X more for free shipping.` with the exact missing amount. No new state, no effect — extend the chain of `const`s.

**Practices:** deriving from a derived value — formulas stack, effects chain.
**Hint:** two more `const`s: a boolean and a remainder.
**Expected:** at quantity 2 ($80): "Add $20 more..."; click + (total $120): "Free shipping!"; type SAVE10 at quantity 3 ($108): still free shipping — the message always agrees with the displayed total, same render.

### ⭐⭐ 2. Effect-ectomy (core)

A teammate added an item-count label to the refactor like this:

```jsx
const [itemLabel, setItemLabel] = useState('1 item');
useEffect(() => {
  setItemLabel(quantity === 1 ? '1 item' : `${quantity} items`);
}, [quantity]);
```

Run it through the decision rule: say "keep ___ synchronized with ___" and check the second blank. Then rewrite the feature the right way, and name one *behavioral* difference the rewrite fixes (not just style).

**Practices:** recognizing state-shuttling effects and deleting them.
**Hint:** both blanks name React's own data — that's the tell.
**Expected:** identical label on screen, but one render per + click instead of two, and no frame where quantity says 2 while the label still says "1 item".

### ⭐⭐ 3. The alert that fires from the wrong place (core)

Another addition — a bulk-order warning:

```jsx
useEffect(() => {
  if (quantity > 5) alert('bulk order — contact sales for pricing!');
}, [quantity]);
```

It "works," but it's in the wrong toolbox: this is a *reaction to a user action*, not synchronization. Prove it's buggy with this scenario: change the initial state to `useState(6)` and reload. Then move the logic where it belongs.

**Practices:** the third category — event-handler logic mistakenly dressed as an effect.
**Hint:** who should own "the user just crossed the threshold"? The click, not the render.
**Expected:** effect version: the alert fires on page load with no user action (and would fire after *any* code sets quantity past 5). Handler version: it fires exactly when a click moves quantity from 5 to 6.

### ⭐⭐ 4. Predict: the doubly stale log (core)

This is the *original's* architecture (subtotal as state, synced by an effect) plus a log line. Quantity is 1, subtotal shows $40. The user clicks + once. Predict the exact console output, and how many layers of staleness produced it.

```jsx
const [subtotal, setSubtotal] = useState(PRICE);
useEffect(() => { setSubtotal(quantity * PRICE); }, [quantity]);

function handlePlus() {
  setQuantity(quantity + 1);
  console.log('subtotal is now', subtotal);
}
```

**Practices:** predicting what a handler sees when derived data lives in lagging state.
**Hint:** layer 1 is project 11's snapshot; layer 2 is that the effect hasn't even run yet.
**Expected:** the logged number, plus a sentence naming both layers; then say what the same log line prints in the refactor's architecture and why it's only *one* layer off there.

### ⭐⭐⭐ 5. A coupon table with live feedback (challenge)

Support several coupons — `SAVE10` (10%) and `SAVE20` (20%) — case-insensitively and ignoring stray spaces, and show feedback under the input: nothing when the box is empty, `coupon applied: N% off` when valid, `invalid coupon` otherwise. All derived; the component still must not import `useEffect`.

**Practices:** content-as-data (a lookup table) plus a derived three-way status.
**Hint:** normalize once (`coupon.trim().toUpperCase()`), look up in a `COUPONS` object, and derive a status string from the two.
**Expected:** typing `save20` shows "coupon applied: 20% off" and Total drops to $64 at quantity 2; `savax` shows "invalid coupon" and 0% discount; clearing the box shows no message; every value on screen agrees within a single render.

## Solutions

### 1. Free shipping at $100

```jsx
const freeShipping = total >= 100;
const missing = Math.ceil(total >= 100 ? 0 : 100 - total);
// under the total:
<p>{freeShipping ? 'Free shipping!' : `Add $${missing} more for free shipping.`}</p>
```

**Why:** `freeShipping` derives from `total`, which derives from `subtotal` and `discount` — a four-deep chain that costs nothing to think about, because all four are computed top-to-bottom in the same render from the same snapshot. The effect-chain version of this feature would be a fourth state and a fourth synchronizer wired after `total`'s effect; here it's two lines that cannot be out of date.

### 2. Effect-ectomy

```jsx
const itemLabel = quantity === 1 ? '1 item' : `${quantity} items`;
```

**Why:** the sentence comes out "keep *itemLabel state* synchronized with *quantity state*" — the second blank names React's own data, so this is a computation, not synchronization. The behavioral fix: the effect version renders twice per click (state change → render → effect writes label → render), and the *first* of those renders shows quantity 2 beside the stale "1 item" — a real, paintable inconsistent frame. The `const` version is recomputed with the quantity in the same render; a mismatched frame is impossible, and one state plus one effect simply ceases to exist.

### 3. The alert that fires from the wrong place

```jsx
function handlePlus() {
  const next = quantity + 1;
  if (next > 5) alert('bulk order — contact sales for pricing!');
  setQuantity(next);
}
// button: <button onClick={handlePlus}>+</button>
```

**Why:** effects answer "the render happened, sync the world"; they can't tell a click from a reload — hence the alert on mount with `useState(6)`, where nobody ordered anything. The meaning of this feature is "when the *user* pushes past 5, warn them," and only the event handler knows a user did something. Computing `next` first also sidesteps the snapshot trap (checking `quantity > 5` after `setQuantity` would test the old value).

### 4. Predict: the doubly stale log

It prints `subtotal is now 40`. The correct answer at that moment is 80, and the log is wrong for two stacked reasons: (1) `subtotal` in the handler is the current render's snapshot — even *committed* state wouldn't show up in this closure; (2) the new subtotal isn't even committed yet — the effect that computes it runs only after the next render paints, a full cycle later. In the refactor's architecture (`const subtotal = quantity * PRICE`) the same log prints 40 too — but only for reason (1), and the fix is local and obvious: `console.log('subtotal is now', (quantity + 1) * PRICE)`. Formulas you can re-run in place; lagging state you can only wait for.

### 5. A coupon table with live feedback

```jsx
const COUPONS = { SAVE10: 0.1, SAVE20: 0.2 };

const code = coupon.trim().toUpperCase();
const discount = COUPONS[code] || 0;
const subtotal = quantity * PRICE;
const total = subtotal * (1 - discount);
const couponStatus =
  code === '' ? 'none' : discount > 0 ? 'valid' : 'invalid';

// under the input:
{couponStatus === 'valid' && <p style={{ color: 'green' }}>coupon applied: {discount * 100}% off</p>}
{couponStatus === 'invalid' && <p style={{ color: 'red' }}>invalid coupon</p>}
```

**Why:** the coupon list became data (adding `SAVE30` is a table row, project 12's `FIELDS` move), and the three-way `couponStatus` is a tiny phase value (project 16) — derived, never stored, so it can't disagree with the discount that's applied. Everything recomputes from `quantity` and `coupon`, the only facts the user controls; there is still nothing to reset, nothing to wire, and `useEffect` remains unimported. Normalizing into `code` once keeps every downstream line reading one clean value.
