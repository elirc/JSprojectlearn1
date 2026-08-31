# 🏋️ Practice: Wizard Phases

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. "Step 2 of 4" (warm-up)

Add a line under the breadcrumbs reading `Step N of M`, where N is the current position and M counts the real screens (`done` doesn't count). Derive both numbers from `step` and `STEPS` during render — no new state.

**Practices:** deriving position facts from the single `step` value.
**Hint:** `STEPS.indexOf(step) + 1`, and `STEPS.length - 1` for the total.
**Expected:** cart shows `Step 1 of 4`, shipping `Step 2 of 4`, confirm `Step 4 of 4`; the line disappears entirely on the done screen (the early return skips it).

### ⭐⭐ 2. A terms checkbox that gates the order (core)

On the confirm screen only, show a checkbox labeled "I agree to the terms", and disable the `place order` button until it's checked. The other screens' `continue` buttons must be unaffected.

**Practices:** per-step UI and per-step rules, hung off the one `step` value.
**Hint:** one `agreed` boolean state; the button's `disabled` needs to care only when `step === 'confirm'`.
**Expected:** cart/shipping/payment behave as before; on confirm, `place order` is greyed out until the box is ticked, then works.

### ⭐⭐ 3. The cancel button that time-travels (core)

A learner added order cancellation with a boolean — and a "start over" button on the cancelled screen:

```jsx
const [cancelled, setCancelled] = useState(false);
if (cancelled) return (
  <div><h3>Order cancelled.</h3>
  <button onClick={() => setCancelled(false)}>start over</button></div>
);
// ...and inside the step box:
<button onClick={() => setCancelled(true)}>cancel order</button>
```

Find the bug by tracing: cancel from the payment screen, then click "start over". Where does the user land, and why is that wrong? Fix it by making cancellation a *phase*, not a boolean.

**Practices:** spotting a parallel boolean that hides an invalid state combination.
**Hint:** after cancelling, what does `step` still hold? Two variables now describe one fact.
**Expected:** broken: start-over drops the user back onto *payment*, mid-checkout of a cancelled order. Fixed: cancelling shows the cancelled screen, and start-over lands on a fresh cart.

### ⭐⭐ 4. Predict: the fast-forward button (core)

Without running it, predict where each button lands starting from `cart` — and explain the difference:

```jsx
<button onClick={() => {
  setStep(SCREENS[step].next);
  setStep(SCREENS[step].next);
}}>A: skip two?</button>

<button onClick={() => {
  setStep((s) => SCREENS[s].next);
  setStep((s) => SCREENS[s].next);
}}>B: skip two?</button>
```

**Practices:** predicting renders — snapshot reads vs updater chaining (project 11, inside the wizard).
**Hint:** in A, both lines read the same `step`; in B, the second updater receives the first one's result.
**Expected:** two written landing spots with a one-line reason each; check against the solution.

### ⭐⭐⭐ 5. Breadcrumbs that remember how far you got (challenge)

Make breadcrumbs clickable — but only for steps the user has already reached: you can always jump back, and you can jump *forward* only into territory you've visited before (e.g. after backing up from payment to cart, the payment crumb stays clickable). Track the furthest index reached in one extra piece of state, and grey out unreachable crumbs.

**Practices:** turning "where we are" plus "where we've been" into two small values.
**Hint:** route every navigation through one `go(name)` helper that does `setMaxReached((m) => Math.max(m, STEPS.indexOf(name)))`.
**Expected:** fresh load: only the cart crumb is dark/clickable. Continue to payment, click the cart crumb to jump back — shipping and payment crumbs remain clickable; confirm stays grey until first reached the normal way.

## Solutions

### 1. "Step 2 of 4"

```jsx
const stepNumber = STEPS.indexOf(step) + 1;
const totalSteps = STEPS.length - 1;   // 'done' is not a screen
// under the crumbs:
<p>Step {stepNumber} of {totalSteps}</p>
```

**Why:** because "where we are" is a single value in a known ordering, its position is `indexOf` — one derivation, correct on every render. In the original's five-boolean version this needs an if-chain to reconstruct a fact the state never stored. The done screen's early `return` runs before this JSX, so the terminal state needs no special case.

### 2. A terms checkbox that gates the order

```jsx
const [agreed, setAgreed] = useState(false);

// inside the .step div:
{step === 'confirm' && (
  <label>
    <input type="checkbox" checked={agreed}
           onChange={(e) => setAgreed(e.target.checked)} />
    I agree to the terms
  </label>
)}
<button disabled={step === 'confirm' && !agreed}
        onClick={() => setStep(screen.next)}>
  {step === 'confirm' ? 'place order' : 'continue'}
</button>
```

**Why:** the checkbox renders only when `step === 'confirm'` — one conditional hung off the phase value, no `showTerms` boolean to desynchronize. The `disabled` expression reads as the rule it implements: "on confirm without agreement, no order." A polish worth considering: reset `agreed` when leaving confirm (call `setAgreed(false)` in the back handler) so backing out and returning re-asks.

### 3. The cancel button that time-travels

The bug: `cancelled` and `step` are two variables describing one fact. Cancelling from payment leaves `step === 'payment'` frozen underneath; "start over" merely flips the boolean, and the stale `step` reappears — the user resumes a checkout they cancelled. Fix — cancellation becomes a phase:

```jsx
if (step === 'cancelled') return (
  <div>
    <h3>Order cancelled.</h3>
    <button onClick={() => setStep('cart')}>start over</button>
  </div>
);
// inside the step box:
<button onClick={() => setStep('cancelled')}>cancel order</button>
```

**Why:** with one `step` value there is nothing to leave stale — "start over" *says where to go* (`'cart'`) instead of un-hiding wherever we happened to be. The boolean version had 2 × 5 representable combinations, most of them lies (`cancelled && step === 'done'` renders "cancelled" after a placed order, since that `if` comes first). Exclusive screens want one value from a named set; that's the whole project.

### 4. Predict: the fast-forward button

**A lands on `shipping`** (one step). Both lines read the same render snapshot where `step` is `'cart'`, so both compute `SCREENS['cart'].next` — `'shipping'` — and the second call just sets the same value again. **B lands on `payment`** (two steps): the first updater gets `'cart'` and returns `'shipping'`; React feeds `'shipping'` into the second, which returns `'payment'`.

**Why:** `setStep` never changes the local `step` mid-handler; only updaters see intermediate results. One caution before shipping button B: two hops from `confirm` would compute `SCREENS['done'].next` — but `'done'` has no table row, so it would crash on reading `.next` of `undefined`. Table-driven navigation is honest about edges: guard with `SCREENS[s] ? SCREENS[s].next : s`.

### 5. Breadcrumbs that remember how far you got

```jsx
const [maxReached, setMaxReached] = useState(0);

function go(name) {
  setStep(name);
  setMaxReached((m) => Math.max(m, STEPS.indexOf(name)));
}
// use go(...) everywhere: go(screen.next), go(screen.back), and in the crumbs:
{STEPS.slice(0, -1).map((s) => {
  const reachable = STEPS.indexOf(s) <= maxReached;
  return (
    <span key={s}
          className={s === step ? 'here' : ''}
          style={{ cursor: reachable ? 'pointer' : 'default',
                   color: reachable ? undefined : '#ddd' }}
          onClick={reachable ? () => go(s) : undefined}>
      {SCREENS[s].title}
    </span>
  );
})}
```

**Why:** "how far did we ever get" is a genuinely separate fact from "where are we," so it earns its own state — but it stays one number, because step order already lives in `STEPS`. Routing every move through `go` means the invariant (`maxReached` only grows — `Math.max` in updater form) is enforced in one place; jumping backward via a crumb calls `go` too and can't shrink it. Each crumb then derives `reachable` by comparing indexes: state stays minimal, everything else is computed.
