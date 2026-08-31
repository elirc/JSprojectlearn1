# 🏋️ Practice: Lifting State

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Everything here can be written and checked by reasoning offline; the page only needs internet on first load for the CDN.)

## Exercises

### ⭐ 1. Add a reset button (warm-up)

Add a "reset" button to the refactored `App`, next to the two boxes, that puts the converter back to its starting amount. Notice how many state slots you have to reset to make BOTH boxes jump back.

**Practices:** single source of truth; state updates repaint every derived view.

**Hint:** There is exactly one `useState` in the whole app — resetting means one setter call.

**Expected:** Type anything into either box, click "reset": USD shows 10 and EUR shows 9.2 again, in one click, because only one thing was ever stored.

### ⭐⭐ 2. Predict what renders (core)

A teammate edits `App`'s return to this (everything else unchanged). Predict: what does the EUR box show on first load, and what do both boxes show after typing `50` into the EUR box? Explain what feature silently disappeared.

```jsx
<CurrencyBox label="USD" amount={dollars} onAmountChange={setDollars} />
<CurrencyBox label="EUR" amount={dollars} onAmountChange={setDollars} />
```

**Practices:** reading data flow from props; spotting where derivation happens (and doesn't).

**Hint:** Both boxes now display the same variable. Where was `euros` supposed to enter the picture?

**Expected:** Your three answers (load, after typing, missing feature) match the solution exactly.

### ⭐⭐ 3. Make the rate editable (core)

Promote `RATE` from a constant to real state: add a third input (a plain text input above the boxes is fine) where the user can edit the rate, starting at `'0.92'`. Both conversion directions must respect the current rate. Ask yourself first: is the rate genuinely state, or derivable? (It's genuinely state — only the user knows it.)

**Practices:** deciding what is state vs derived; threading one value through both directions.

**Hint:** `const [rate, setRate] = useState('0.92')`; use `Number(rate)` in the `euros` formula *and* in `handleEurosChange`.

**Expected:** With dollars at 10, changing the rate to 2 makes EUR instantly show 20; then typing 50 into EUR makes USD show 25.

### ⭐⭐ 4. Fix the "smoother typing" sabotage (core)

A teammate gave `CurrencyBox` its own memory "so typing feels smoother" — and the converter broke. Predict what happens when you type `100` into the USD box, explain why, and fix it.

```jsx
function CurrencyBox({ label, amount, onAmountChange }) {
  const [text, setText] = useState(amount);
  return (
    <div className="box">
      <h3>{label}</h3>
      <input
        value={text}
        onChange={(e) => { setText(e.target.value); onAmountChange(e.target.value); }}
      />
    </div>
  );
}
```

**Practices:** why lifted state must stay lifted; `useState(initialValue)` only reads its argument once.

**Hint:** `useState(amount)` seeds `text` on the FIRST render only — later `amount` props are ignored by it.

**Expected:** You can explain why the EUR box freezes at 9.2 no matter what you type in USD (and vice versa), and your fix restores two-way sync by deleting something, not adding.

### ⭐⭐⭐ 5. Add a third editable currency (challenge)

Add a full GBP box — not a read-only line, a real `CurrencyBox` you can type into — using `const RATE_GBP = 0.79`. All three boxes must stay in sync in every direction, and you may not add any new `useState`. That last rule is the whole exercise.

**Practices:** one source of truth serving N views; writing the inverse translator.

**Hint:** `pounds` is derived like `euros`; its change handler converts back to dollars: `setDollars(format(Number(newPounds) / RATE_GBP))`.

**Expected:** On load the boxes read 10 / 9.2 / 7.9. Typing 79 into GBP makes USD show 100 and EUR show 92 — three views, still one stored amount.

## Solutions

### 1. Add a reset button

```jsx
<button onClick={() => setDollars('10')}>reset</button>
```

**Why:** The app stores exactly one value — `dollars` — so resetting the whole converter is one setter call. The EUR box needs nothing: `euros` is a formula over `dollars`, recomputed during the render that the state change triggers, so it shows `format(10 * 0.92)` = "9.2" automatically. If euros were a second state, reset would need two calls and could get them inconsistent; with one source of truth that bug can't be written.

### 2. Predict what renders

- **On first load:** the EUR box shows **10** — wrong money, because it now displays `dollars` directly instead of the derived `euros` ("9.2").
- **After typing 50 into EUR:** *both* boxes show exactly **50**. The EUR box's handler is `setDollars`, so the raw string "50" becomes the one state, and both boxes display that same state.
- **The missing feature:** conversion. `euros` (the `dollars * RATE` formula) is no longer rendered anywhere, and `handleEurosChange` (the `/ RATE` inverse) is no longer called, so the app degrades into two synchronized copies of one number.

**Why:** Lifting state makes both boxes *views* of `App`'s data — but a view only converts if you pass the converted value down and translate edits on the way up. With `amount={dollars}` and `onAmountChange={setDollars}` on both, the wiring is consistent (that's why nothing crashes and they stay in sync) — it just implements "same number twice" instead of "same money twice".

### 3. Make the rate editable

```jsx
const [dollars, setDollars] = useState('10');
const [rate, setRate] = useState('0.92');

const euros = format(Number(dollars) * Number(rate));

function handleEurosChange(newEuros) {
  setDollars(format(Number(newEuros) / Number(rate)));
}

// above the boxes:
<p>
  Rate: <input value={rate} onChange={(e) => setRate(e.target.value)} />
</p>
```

**Why:** The rate passes the "is it really state?" test: it can't be computed from anything — only the user knows it — so it earns a `useState`. Both the derivation (`* Number(rate)`) and the inverse translator (`/ Number(rate)`) read the same current rate, so the two directions can never disagree about it. Editing the rate re-renders `App`, `euros` recomputes, and the EUR box updates with zero extra wiring (verified: 10 × 2 → "20", 50 ÷ 2 → "25").

### 4. Fix the "smoother typing" sabotage

Prediction: typing `100` into USD *looks* fine in that box (its local `text` updates) and `setDollars` really does run — but the EUR box stays at 9.2 forever. `App` re-renders and passes a fresh `amount` down, but the EUR box's input displays `text`, and `useState(amount)` used `amount` only to seed `text` on the first render; prop changes never touch it afterward. Each box has quietly become its own second source of truth — the exact disease this project cured. The fix is deletion:

```jsx
function CurrencyBox({ label, amount, onAmountChange }) {
  return (
    <div className="box">
      <h3>{label}</h3>
      <input value={amount} onChange={(e) => onAmountChange(e.target.value)} />
    </div>
  );
}
```

**Why:** `useState`'s argument is an *initial* value, read once at mount — it is not a live link to the prop. Copying a prop into state creates a snapshot that drifts from the truth the moment either changes. The stateless version has nothing to drift: it displays exactly what the owner passed and reports edits straight up, which is the controlled-component contract that made the sync work in the first place.

### 5. Add a third editable currency

```jsx
const RATE = 0.92;      // USD -> EUR
const RATE_GBP = 0.79;  // USD -> GBP

// inside App:
const [dollars, setDollars] = useState('10');
const euros = format(Number(dollars) * RATE);
const pounds = format(Number(dollars) * RATE_GBP);

function handleEurosChange(newEuros) {
  setDollars(format(Number(newEuros) / RATE));
}
function handlePoundsChange(newPounds) {
  setDollars(format(Number(newPounds) / RATE_GBP));
}

<CurrencyBox label="USD" amount={dollars} onAmountChange={setDollars} />
<CurrencyBox label="EUR" amount={euros} onAmountChange={handleEurosChange} />
<CurrencyBox label="GBP" amount={pounds} onAmountChange={handlePoundsChange} />
```

**Why:** A third currency is one derived `const` plus one translator function — no new state, so no new syncing, so no new ways to disagree. Every edit, in any box, routes to `setDollars`; the next render recomputes both formulas from the one truth, and all three boxes repaint consistent (verified with the real `format`: load shows 10 / 9.2 / 7.9, and typing 79 into GBP yields USD 100, EUR 92). Compare the alternative with three private states: three values, six pairwise sync paths, and a bug the first time any one is missed.
