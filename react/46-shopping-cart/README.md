# React 46 — Shopping cart

**Lesson: js#32's integer-cents rule survives the trip into React unchanged —
and the cart is a reducer, not a mutation.**

## Run it

Open `original.html`, add 3× coffee + 2× filters: subtotal
`$31.249999999999996`, and the discount inherits the dust. Refactor: exactly
`$31.25`, formatted by `Intl`.

## What's wrong with the original?

Two JS-track lessons, unlearned in a new costume:

1. **Money as floats** (js#32): `10.35 * 3` accumulates binary dust; the
   percentage discount compounds it; the customer sees 15 decimal places.
   The tempting patch — `toFixed(2)` — would launder the *display* while the
   wrong number flows to the payment API. Frameworks change; float math
   doesn't.
2. **In-place mutation** (react#10): `existing.qty += 1` followed by the
   shallow-copy kludge `setCart([...cart])`. It "works" — the copy triggers
   the render — but the line objects are shared mutable state, and the first
   memo'd row component or history feature (40) will surface it as a bug.

## What changed in the refactor

- **js#32's money module, verbatim**: prices *stored* as integer cents
  (`priceCents: 1035`), all arithmetic on integers, `formatCents` (Intl) at
  the display edge only, discount rounding explicit. Exact to the cent by
  construction — the first render proves it.
- **The cart became a reducer** (react#13): `added`/`removed` rules, immutable
  updates (`map` + spread for the qty bump — no in-place writes, no kludge).
  Pure and framework-free, so it lifts unchanged into Node tests or project
  41's store — which is exactly where a real cart ends up.
- **Money values are derived** (project 09): `subtotalCents`,
  `discountedCents` are consts computed from the cart — no stored totals to
  desync (the JS track's cart never even met that bug, because it derived
  too).
- The threshold check (`> 3000` cents = $30) reads oddly for one second and
  then correctly forever — sums, thresholds, and comparisons all live in the
  same integer unit.

## Key takeaway

Domain rules — money in cents, immutable updates, pure state transitions —
are not JavaScript lessons or React lessons; they're *software* lessons. The
fastest way to write a correct React cart is to have already written the
correct plain-JS one, and import it.
