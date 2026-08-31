# 📘 Learning Guide: Wizard Phases

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

A checkout wizard — the multi-step flow every online shop has. The screen shows one step at a time: **1. Cart** → **2. Shipping** → **3. Payment** → **4. Confirm** → "✅ Order placed!". Each step is a bordered box with a "continue" button (and sometimes a "back" button). You click through the steps in order.

In the original, clicking "review order" on the Payment step shows... nothing. A blank screen, no error, right when the user was about to pay. The refactor makes that bug impossible to even write, and adds a breadcrumb progress indicator for free.

## 2. Concepts you need first

### Booleans and why they multiply

A boolean is a value that is either `true` or `false`. One boolean has 2 possible values. Two booleans have 2 × 2 = 4 combinations. Five booleans have 2⁵ = 32. If your wizard has 5 real screens but you track them with 5 booleans, your code can *represent* 32 situations — 27 of which are nonsense (two screens at once, or no screen at all). Nonsense that can be represented will eventually happen.

### Exclusive states and state machines

Screens in a wizard are *exclusive*: you're on exactly one at a time. When states are exclusive, the right data shape is **one value naming which state you're in**:

```js
const [step, setStep] = useState('cart'); // 'cart' | 'shipping' | 'payment' | ...
```

This idea is called a *state machine*: a fixed set of named states, plus rules about which state you can move to from each. With one `step` variable, "two screens at once" isn't a bug you avoid — it's a sentence you cannot even say.

### Conditional rendering with `&&`

```jsx
{showCart && <div>cart screen</div>}
```

Renders the div only when `showCart` is true (project 15's LEARN.md covers this). The original uses five of these in a row — one per boolean. If all five are false, the page body renders nothing at all.

### Objects as lookup tables

A JavaScript object maps names to values. You can use one as a table you look things up in, instead of writing if/else chains:

```js
const SCREENS = {
  cart:     { title: '1. Cart', next: 'shipping' },
  shipping: { title: '2. Shipping', next: 'payment', back: 'cart' },
};
const screen = SCREENS['cart'];  // or SCREENS[step]
screen.next; // 'shipping'
```

`SCREENS[step]` means "the entry whose name is whatever `step` currently holds." Storing your app's *flow* as data like this is powerful: navigation code shrinks to one line, and adding a step means adding a row, not writing a function.

### Early return (guard clause)

A component can bail out early for special cases:

```jsx
if (step === 'done') return <h3>✅ Order placed!</h3>;
// ...normal rendering continues below
```

The terminal "done" state has no next/back buttons, so it's handled first and the rest of the code never worries about it. This pattern is called a *guard clause*.

### `map`, `slice`, and template rendering

`STEPS.slice(0, -1)` returns a copy of the array without the last item (negative index counts from the end). `.map(...)` turns each remaining step name into a JSX span. That's how the refactor draws the breadcrumbs.

### Basics assumed here

`useState`, event handlers, and why `onClick={() => setStep(x)}` needs the arrow — explained fully in project 14's LEARN.md.

## 3. Walking through the original code

**Five booleans for five screens:**

```jsx
const [showCart, setShowCart] = useState(true);
const [showShipping, setShowShipping] = useState(false);
const [showPayment, setShowPayment] = useState(false);
const [showConfirm, setShowConfirm] = useState(false);
const [isDone, setIsDone] = useState(false);
```

Each screen gets its own on/off switch. Only one is supposed to be on at a time — but nothing *enforces* that. It's pure discipline.

**Navigation flips pairs by hand:**

```jsx
function goToShipping() {
  setShowCart(false);
  setShowShipping(true);
}
```

Every move must turn the current screen off AND the next screen on. Two lines, both mandatory, in every navigation function. Forget either line and you get two screens... or zero.

**The bug:**

```jsx
function goToConfirm() {
  setShowPayment(false);
  // BUG: whoever added the confirm screen forgot setShowConfirm(true)
}
```

Half the pair. Payment turns off, nothing turns on. All five booleans are now false.

**The rendering — five independent `&&` blocks:**

```jsx
{showCart && ( <div className="step"> ... </div> )}
{showShipping && ( ... )}
{showPayment && ( ... )}
{showConfirm && ( ... )}
{isDone && <h3>✅ Order placed!</h3>}
```

With every boolean false, all five blocks render nothing. The page shows just the "Checkout" heading. There's also a comment noting that a progress indicator is impossible to write cleanly: "which step are we on?" doesn't exist as a value anywhere — you'd have to reconstruct it by checking booleans one by one.

## 4. What's wrong with it (in beginner terms)

1. **The blank-screen bug.** On screen: Cart → continue → Shipping → continue → Payment → "review order" → *nothing*. No error in the console, no crash. Every boolean is false, so every `&&` block skips. The user is stranded at the worst possible moment. The scary part: the code *ran perfectly* — the bug is in what the state can express.
2. **The structure demands perfect memory.** Every navigation function must flip exactly the right pair. That's fine with 2 screens, survivable with 3, and guaranteed to break the day someone adds screen number 6 on a Friday afternoon. The bug isn't a typo; it's a structure that manufactures typos.
3. **Two screens at once is one missing line away.** Change `goToShipping` to forget `setShowCart(false)` and you'd see Cart AND Shipping stacked on the page — 27 of the 32 representable combinations are broken pixels waiting to happen.
4. **"Where are we?" isn't a value.** A progress bar, a step counter, analytics ("user reached payment") — all need to ask "which step?", and there's nothing to ask.

## 5. Try it yourself first!

1. **Vague hint:** the wizard is only ever on ONE step. How many state variables should that take?
2. **First move:** replace all five booleans with one `useState('cart')` holding a step name. Update the rendering: `{step === 'cart' && ...}` per block. The blank-screen bug is already dead — one value can't be "half flipped".
3. **Level up:** notice each navigation function is now just `setStep('somename')`. Can you delete the functions entirely and inline them?
4. **Level up more:** put the flow into a table — an object where each step lists its `title`, `next`, and optional `back`. Render only `SCREENS[step]` and wire the buttons to `setStep(screen.next)` / `setStep(screen.back)`.
5. **Bonus:** with `step` as a value and `STEPS` as an array, render breadcrumbs: map over the step names and bold the one equal to `step`.

## 6. Understanding the refactored solution

**The flow as data:**

```jsx
const STEPS = ['cart', 'shipping', 'payment', 'confirm', 'done'];

const SCREENS = {
  cart:     { title: '1. Cart', next: 'shipping' },
  shipping: { title: '2. Shipping', next: 'payment', back: 'cart' },
  payment:  { title: '3. Payment', next: 'confirm', back: 'shipping' },
  confirm:  { title: '4. Confirm', next: 'done', back: 'payment' },
};
```

The whole wizard, readable at a glance — even by a non-programmer. Want a new step? Add a row and fix two `next`/`back` pointers. No function to write, no pair to flip.

**One state value + a guard clause:**

```jsx
const [step, setStep] = useState('cart');
if (step === 'done') return <h3>✅ Order placed!</h3>;
const screen = SCREENS[step];
```

`step` is the *only* state. The `done` state exits early (it has no table entry — it needs no buttons). For everything else, `screen` is the current row of the table.

**Navigation is one line, driven by the table:**

```jsx
{screen.back && (
  <button onClick={() => setStep(screen.back)}>back</button>
)}
<button onClick={() => setStep(screen.next)}>
  {step === 'confirm' ? 'place order' : 'continue'}
</button>
```

`{screen.back && ...}` shows a back button only for steps that *have* a `back` entry (cart doesn't). The forward button's label is a ternary: "place order" on the confirm step, "continue" elsewhere. The original's bug has no home here — there are no boolean pairs to half-flip; `next` comes from the table.

**The free progress indicator:**

```jsx
{STEPS.slice(0, -1).map((s) => (
  <span key={s} className={s === step ? 'here' : ''}>
    {SCREENS[s].title}
  </span>
))}
```

Map over all steps except `done`, bold the current one via a CSS class. This was *impossible* in the original (no "current step" value existed); here it's four lines of derivation.

## 7. Words you learned (glossary)

- **Boolean** — a true/false value.
- **Boolean explosion** — N booleans representing 2^N combinations when only a few are valid.
- **Exclusive states** — situations where exactly one option is active at a time.
- **State machine** — a design with a fixed set of named states and allowed moves between them.
- **Phase / step value** — one variable naming the current state (`'cart'`, `'payment'`...).
- **Unrepresentable state** — a wrong situation the data shape cannot even express — the strongest kind of bug prevention.
- **Lookup table** — an object used to look up values by name instead of if/else chains.
- **Guard clause / early return** — handling a special case at the top and returning immediately.
- **Ternary** — the inline if/else expression `condition ? a : b`.
- **`slice(0, -1)`** — array copy without the last element.
- **Breadcrumbs** — the little "step 1 › step 2 › step 3" trail showing where you are.
- **Terminal state** — a state with no way out (here, `done`).
- **Deriving** — computing display info (like the breadcrumbs) from state rather than storing it.

## 8. Experiments to try on the plane (no internet needed)

Note (once): these pages pull React from a CDN, so they need internet the first time they load. Offline, do the edits and write down your predicted outcome; check later (or use pages your browser already cached).

1. **Fix the original the small way.** Add the missing `setShowConfirm(true)` to `goToConfirm`. Prediction: the wizard works end to end. Then ask yourself: what stops the *next* person from making the same mistake in a `goToNewStep`? (Nothing. That's the lesson.)
2. **Create the two-screens bug.** In `original.html`, delete `setShowCart(false)` from `goToShipping`. Prediction: after "continue", Cart and Shipping boxes both show, stacked.
3. **Add a "gift wrap" step to the refactor** between shipping and payment: add `'giftwrap'` to `STEPS`, a row `giftwrap: { title: '2b. Gift wrap', next: 'payment', back: 'shipping' }`, and change shipping's `next` and payment's `back` to `'giftwrap'`. Prediction: the new step appears in the flow AND in the breadcrumbs with no other edits.
4. **Try to write the blank-screen bug in the refactor.** Seriously — try. You'd have to set `step` to a name not in the table (e.g. `setStep('oops')`). Prediction: `SCREENS['oops']` is `undefined` and the page crashes loudly on `screen.title` instead of failing silently. Even the failure mode is more honest.
5. **Make the breadcrumbs clickable.** Add `onClick={() => setStep(s)}` to the breadcrumb span. Prediction: you can jump to any step by clicking its crumb. Then think: should users be able to jump *forward* past payment? How would you allow only backward jumps? (Hint: compare `STEPS.indexOf(s)` with `STEPS.indexOf(step)`.)
