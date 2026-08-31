# 🏋️ Practice: Stale Closures & Updater Functions

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. A −1 button with a floor (warm-up)

Add a `−1` button next to `+3` in the refactor. It should decrement the count, but never let it go below 0 — even if the user mashes the button. Use the updater form, and put the "never below 0" rule inside the updater itself.

**Practices:** the updater form for next-state-from-current-state, with a clamp.
**Hint:** `Math.max(0, ...)` inside the updater function.
**Expected:** clicking `−1` lowers the big number by one; once it reaches 0, further clicks leave it at 0 (the ticker will keep raising it — pause your reasoning at each click).

### ⭐⭐ 2. Pause and resume the ticker (core)

Add a button that toggles the ticker between running and paused. Keep a second piece of state, `running` (start it at `true`), and make the effect set up the interval only while `running` is true. The button label should read `Pause` while running and `Resume` while paused.

**Practices:** honest dependency arrays — the effect now uses a render-scope value, so it must list it.
**Hint:** `if (!running) return;` as the effect's first line, and `[running]` as its deps; cleanup stays the same.
**Expected:** clicking `Pause` freezes the number exactly where it is; `Resume` continues ticking from that value (not from 0), one per second. `+3` still works while paused.

### ⭐⭐ 3. Fix the ×4 button (core)

A learner added this "quadruple" button to the refactor and reports it only doubles:

```jsx
function timesFour() {
  setCount(count * 2);
  setCount(count * 2);
}
```

First say precisely why it doubles instead of quadrupling, then fix it so it really multiplies by 4 — in two chained steps, not by writing `count * 4`.

**Practices:** spotting the stale-snapshot read and converting it to updaters.
**Hint:** both lines read the same frozen `count`; the second schedules the same value the first did.
**Expected:** from a count of 3, the broken version lands on 6; your fixed version lands on 12.

### ⭐⭐ 4. Predict: the alert from the past (core)

Read this addition to the refactor (ticker running, updater form intact) — do not run it yet. Suppose the user clicks `show later` at the exact moment the count is 4, then waits.

```jsx
<button onClick={() => setTimeout(() => alert('count is ' + count), 3000)}>
  show later
</button>
```

Predict: what does the alert say three seconds later, and roughly what does the `<h2>` show at that moment? Explain both using the render-is-a-snapshot model.

**Practices:** predicting closure capture — the same mechanics as the frozen ticker, at click speed.
**Hint:** which render created the arrow function that the click handed to `setTimeout`?
**Expected:** your written prediction states both numbers and names the render that `count` was captured from; check it against the solution.

### ⭐⭐⭐ 5. Adjustable step (challenge)

Add a number input so the user chooses how much each tick adds: state `step` starting at 1, an `<input type="number">` bound to it, and an interval that adds the *current* step every second. The trap: `setCount((c) => c + step)` inside an effect with `[]` deps closes over the first render's `step` forever — the input would do nothing. Make it actually follow the input.

**Practices:** the updater form fixes stale *count*, but honest deps are still needed for other captured values.
**Hint:** the effect uses `step`, so `step` belongs in its deps — the cleanup/re-create churn now happens only when the step changes, not every tick.
**Expected:** with step 1 the ticker adds 1 per second; type 5 into the input and each tick now adds 5; the count never resets when you change the step.

### ⭐⭐⭐ 6. Predict: the mixed update queue (challenge)

Without running anything, predict the final count after one click of this button, starting from a count of 5 — then explain the rule that decides it:

```jsx
<button onClick={() => {
  setCount((c) => c + 1);
  setCount(10);
  setCount((c) => c * 2);
}}>mystery</button>
```

**Practices:** how React processes a queue that mixes value-form and updater-form calls.
**Hint:** React replays the queue in order: an updater receives the result so far; a plain value discards the result so far.
**Expected:** one number written down, with a three-step trace (start → after line 1 → after line 2 → after line 3) matching the solution.

## Solutions

### 1. A −1 button with a floor

```jsx
<button onClick={() => setCount((current) => Math.max(0, current - 1))}>
  −1
</button>
```

**Why:** next-state depends on current-state, so this must be the updater form — `setCount(Math.max(0, count - 1))` would read the render's snapshot and misbehave when clicks land between renders. Putting the clamp *inside* the updater means it applies to the live value React hands in, so even rapid clicks queued in one batch can never drive the result below 0.

### 2. Pause and resume the ticker

```jsx
const [running, setRunning] = useState(true);

useEffect(() => {
  if (!running) return;
  const id = setInterval(() => setCount((current) => current + 1), 1000);
  return () => clearInterval(id);
}, [running]);

<button onClick={() => setRunning((r) => !r)}>
  {running ? 'Pause' : 'Resume'}
</button>
```

**Why:** the effect now reads `running`, so `[running]` is the honest deps list — when it flips, React runs the old effect's cleanup (clearing the interval) and then the new effect. While paused, the effect returns early, creating no interval and no cleanup (returning nothing is legal). The count survives pausing because pausing only removes the interval; the state is untouched.

### 3. Fix the ×4 button

```jsx
function timesFour() {
  setCount((current) => current * 2);
  setCount((current) => current * 2);
}
```

**Why:** in the broken version both lines evaluate `count * 2` from the same frozen snapshot — from 3, both schedule "make it 6", and the second is a no-op on top of the first. `setCount` never changes the local `count` mid-function; it schedules a future render. Updaters chain instead: React feeds the first one 3 → 6, then feeds the second the 6 → 12.

### 4. Predict: the alert from the past

The alert says **`count is 4`**. The `<h2>` shows **about 7** (4 plus roughly three ticks of the still-running interval, ±1 depending on tick timing).

**Why:** the click ran during the render where `count` was 4, and the arrow function passed to `setTimeout` closed over that render's snapshot. Three seconds of ticking later, newer renders exist with newer `count` values — but the timed function is not from those renders; it still holds 4. Same mechanism as the original's frozen ticker, just triggered once instead of every second.

### 5. Adjustable step

```jsx
const [step, setStep] = useState(1);

useEffect(() => {
  const id = setInterval(() => setCount((current) => current + step), 1000);
  return () => clearInterval(id);
}, [step]);

<input
  type="number"
  value={step}
  onChange={(e) => setStep(Number(e.target.value))}
/>
```

**Why:** the updater form keeps `count` live, but `step` is still an ordinary captured variable — with `[]` deps the interval would add the first render's `step` (1) forever. Listing `[step]` makes React clear the old interval and start a fresh one whenever the step changes, so the new closure captures the new value. This is the *good* version of the "deps fix" the README warns about: the churn happens only on step changes (rare), not every tick.

### 6. Predict: the mixed update queue

Final count: **20**. Trace from 5: `(c) => c + 1` receives 5 → 6; `setCount(10)` discards the 6 and makes the result-so-far 10; `(c) => c * 2` receives 10 → 20.

**Why:** React stores every call from the click in a queue and replays it in order when rendering. An updater function is called with the accumulated result; a plain value *replaces* the accumulated result (that's LEARN.md's "stomp" behavior, mid-queue). All three calls are batched into one render, so the screen never shows 6 or 10 — it jumps straight from 5 to 20.
