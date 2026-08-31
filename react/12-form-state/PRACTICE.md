# 🏋️ Practice: Form State

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Disable save until it makes sense (warm-up)

In the refactor, the `save` button happily saves a completely empty form. Disable it until both `firstName` and `lastName` contain non-blank text. Compute the answer during render — no new state.

**Practices:** deriving a value from the form object instead of storing a flag.
**Hint:** `form.firstName.trim() !== ''` — combine two of these and feed the result to `disabled`.
**Expected:** on load, `save` is greyed out; type a first and last name and it becomes clickable; `reset` greys it out again instantly.

### ⭐⭐ 2. Fix the frozen form (core)

A learner "simplified" `handleChange` and now typing does nothing on screen:

```jsx
function handleChange(event) {
  form[event.target.name] = event.target.value;
  setForm(form);
}
```

Explain precisely why React refuses to re-render here (the data *did* change!), then fix it — keeping it one generic handler.

**Practices:** replace-don't-mutate, and how React decides whether state "changed".
**Hint:** `setForm` compares the new value to the old with `Object.is` — same object, no re-render.
**Expected:** broken version: typing shows nothing, but clicking `save` reveals the text was silently recorded. Fixed version: typing appears immediately.

### ⭐⭐ 3. A checkbox joins the form (core)

Add a "gift wrap" checkbox that lives in the same form object (`giftWrap: false` in `EMPTY_FORM`) and is handled by the *same* `handleChange`. The catch: a checkbox's answer is in `event.target.checked`, not `.value`, so the generic handler needs to learn the difference.

**Practices:** extending the one-generic-handler idiom to a second input type.
**Hint:** destructure `type` and `checked` too; pick `checked` when `type === 'checkbox'`.
**Expected:** ticking the box then `save` prints `"giftWrap":true` in the JSON; `reset` unticks it; text fields still work unchanged.

### ⭐⭐ 4. Predict: reset & save in one click (core)

Read this button, added to the refactor. The user clicks `prefill from profile`, then clicks this. Predict what the six inputs show *and* what the `<pre>` shows afterwards — and why they disagree.

```jsx
<button onClick={() => {
  setForm(EMPTY_FORM);
  setSaved(JSON.stringify(form));
}}>reset & save</button>
```

**Practices:** predicting renders — the handler's `form` is the current render's snapshot.
**Hint:** `setForm` schedules a future render; it does not change the local `form` variable mid-handler.
**Expected:** a written prediction for both the inputs and the `<pre>` contents; check it against the solution.

### ⭐⭐⭐ 5. Undo the last keystroke (challenge)

Add an `undo` button that steps the form back one change at a time. Keep a `history` array in state; every `handleChange` first pushes the *current* form object onto it, then applies the change. `undo` restores the most recent snapshot and removes it from history; disable the button when history is empty. This feature is only a few lines *because* the whole form is one value — that's the point.

**Practices:** whole-state-as-a-value — snapshots become storable, restorable things.
**Hint:** push with `[...h, form]`, restore `history[history.length - 1]`, drop it with `.slice(0, -1)`.
**Expected:** type "Ada" into first name (3 keystrokes), click `undo` once → "Ad"; twice more → empty; the button then greys out. Prefill/reset are not recorded (only typing is) — that's acceptable for this exercise.

## Solutions

### 1. Disable save until it makes sense

```jsx
const canSave = form.firstName.trim() !== '' && form.lastName.trim() !== '';

<button disabled={!canSave} onClick={() => setSaved(JSON.stringify(form))}>
  save
</button>
```

**Why:** `canSave` is a derived value — recomputed on every render straight from `form`, so it can never fall out of sync the way a stored `isValid` flag could. Every keystroke calls `setForm`, which re-renders `App`, which re-evaluates `canSave`; the button's `disabled` state simply follows. No effect, no extra state, nothing to reset.

### 2. Fix the frozen form

```jsx
function handleChange(event) {
  const { name, value } = event.target;
  setForm((current) => ({ ...current, [name]: value }));
}
```

**Why:** the broken version writes into the existing object and then hands `setForm` *the same object it already had*. React compares old and new state with `Object.is`; identical reference means "nothing changed," so it skips the re-render — while the underlying data mutated silently, which is why `save` exposes the ghost text. The fix builds a **new** object with spread, so the reference differs and React re-renders. (This is project 10's rule, now caught in a form.)

### 3. A checkbox joins the form

```jsx
const EMPTY_FORM = {
  firstName: '', lastName: '', street: '', city: '', zip: '',
  country: 'US', giftWrap: false,
};

function handleChange(event) {
  const { name, type, value, checked } = event.target;
  setForm((current) => ({
    ...current,
    [name]: type === 'checkbox' ? checked : value,
  }));
}

<label>
  <input
    type="checkbox"
    name="giftWrap"
    checked={form.giftWrap}
    onChange={handleChange}
  />
  gift wrap
</label>
```

**Why:** checkboxes report their state through `checked` (a boolean), not `value` (which is a constant string like `"on"`), and they're controlled via the `checked` prop rather than `value`. One `type` check inside the handler keeps the routing generic: the `name` attribute still picks the key, the computed property still writes it, and every future field of either kind costs zero new handlers.

### 4. Predict: reset & save in one click

The inputs go **empty**, but the `<pre>` shows the **full Ada Lovelace address JSON**.

**Why:** inside the handler, `form` is the snapshot from the render where the click happened — the prefilled address. `setForm(EMPTY_FORM)` schedules a future render; it doesn't rewrite the local variable, so `JSON.stringify(form)` on the next line still serializes Ada. React batches both `set` calls into one re-render, where the inputs read the new empty form and `<pre>` reads the just-saved old one. To save the *new* form you'd save `EMPTY_FORM` itself — the value you actually have in hand.

### 5. Undo the last keystroke

```jsx
const [history, setHistory] = useState([]);

function handleChange(event) {
  const { name, value } = event.target;
  setHistory((h) => [...h, form]);            // snapshot BEFORE the change
  setForm((current) => ({ ...current, [name]: value }));
}

function undo() {
  if (history.length === 0) return;
  setForm(history[history.length - 1]);
  setHistory((h) => h.slice(0, -1));
}

<button onClick={undo} disabled={history.length === 0}>undo</button>
```

**Why:** because the form is a single immutable-ly updated object, "the form as it was three keystrokes ago" is just an object sitting in an array — spread built a new object each change, so old snapshots were never overwritten. Try designing this feature on the original's six separate `useState`s: you'd need six parallel histories or a hand-assembled snapshot of all six fields per keystroke. Storing whole values makes time travel cheap; that's the README's "whole-form operations become one-liners" taken one step further.
