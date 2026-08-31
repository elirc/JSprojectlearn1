# 🏋️ Practice: List from Data

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (You can write and check everything by reading the code; running the page just needs internet once, since React loads from a CDN.)

All exercises modify `refactored/index.html` unless they say otherwise.

## Exercises

### ⭐ 1. A "Mark all done" button (warm-up)

The refactor has "Reset all" — one line that replaces the done-bag with an empty one. Add its opposite: a "Mark all done" button that crosses out every step at once. Like reset, it should be one setter call that works no matter how many rows `STEPS` grows to.

**Practices:** replacing collection state wholesale, and building a `Set` from an array.

**Hint:** `new Set(someArray)` builds a set from an array — and `STEPS.map(...)` can hand you the array of ids.

**Expected:** clicking the button crosses out all four steps and the progress line reads "4 of 4 done"; clicking "Reset all" afterwards un-crosses everything.

### ⭐⭐ 2. Say how many steps are left (core)

Add a second line under the progress line that reads "3 steps left" — and says "1 step left" (singular!) when exactly one remains. Rule: no new `useState`; both the number and the word must be computed during render.

**Practices:** derived values plus a ternary for singular/plural wording.

**Hint:** the remaining count is `STEPS.length - doneIds.size`; a ternary picks between `'step'` and `'steps'`.

**Expected:** on load "4 steps left"; check three steps and it reads "1 step left"; check the last and it reads "0 steps left".

### ⭐⭐ 3. Fix the toggle that forgets the past (core)

A teammate rewrote `toggle` and now the checklist misbehaves: you can only ever have **one** step crossed out — clicking a second step un-crosses the first — and clicking an already-crossed step refuses to un-cross it. Here is their code:

```jsx
function toggle(id) {
  setDoneIds((current) => {
    const next = new Set();
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
}
```

Explain *both* symptoms from the code, then fix it.

**Practices:** the copy-then-change discipline — and what the copy must be a copy *of*.

**Hint:** compare line 3 with the original. What does `next.has(id)` return when `next` was born empty a microsecond ago?

**Expected:** after the fix you can cross out several steps, un-cross any of them, and the count tracks correctly.

### ⭐⭐ 4. Predict what renders (core)

Without running anything, predict the output of this component. Assume `STEPS` is the four-step array from `refactored/index.html`, and the `done` CSS class draws a strikethrough.

```jsx
function MiniChecklist() {
  const doneIds = new Set(['tests', 'changelog', 'tests']);
  return (
    <div>
      <p>{doneIds.size} of {STEPS.length} done</p>
      <ul>
        {STEPS.map((step) => (
          <li key={step.id} className={doneIds.has(step.id) ? 'done' : ''}>
            {step.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

What does the progress line say, and exactly which items are crossed out? Why?

**Practices:** how a `Set` treats duplicates, and how derived values follow from state.

**Hint:** say out loud what a `Set` promises about each value it holds.

**Expected:** your written answer matches the solution — the progress number is the part that catches people.

### ⭐⭐⭐ 5. A "Hide done steps" checkbox (challenge)

Add a checkbox labeled "Hide done steps". While it's ticked, crossed-out steps disappear from the list entirely; untick it and they come back, still crossed out. The progress line must keep counting *all* steps ("1 of 4 done"), even while some rows are hidden. You'll need one new piece of state — a boolean — plus a derived list to map over.

**Practices:** a controlled checkbox (`checked` + `onChange`) driving a derived, filtered list.

**Hint:** `const visibleSteps = hideDone ? STEPS.filter(...) : STEPS;` — the checkbox reads `e.target.checked`, not `e.target.value`.

**Expected:** cross out "Run the tests", tick the box: three rows remain, progress still says "1 of 4 done"; untick: all four rows return with the first still crossed out.

## Solutions

### 1. A "Mark all done" button

```jsx
<button onClick={() => setDoneIds(new Set(STEPS.map((step) => step.id)))}>
  Mark all done
</button>
<button onClick={() => setDoneIds(new Set())}>Reset all</button>
```

**Why:** state is "the set of done ids", so "everything is done" is just "a set containing every id". `STEPS.map((step) => step.id)` produces `['tests', 'changelog', 'tag', 'announce']`, and `new Set(...)` turns it into the done-bag. Add a fifth step next month and this button needs zero edits — exactly the property "Reset all" already has, and exactly what four numbered setters could never give you.

### 2. Say how many steps are left

```jsx
function App() {
  const [doneIds, setDoneIds] = useState(new Set());
  const remaining = STEPS.length - doneIds.size;
  // ...
```

```jsx
<p>{doneIds.size} of {STEPS.length} done</p>
<p>{remaining} {remaining === 1 ? 'step' : 'steps'} left</p>
```

**Why:** `remaining` is recomputed on every render from two things that are already true — the step list and the done-bag — so it can never disagree with either. Storing it in state would create a second copy of the truth to keep in sync by hand. The ternary picks the right word: `1 === 1` gives `'step'`, everything else gives `'steps'`.

### 3. Fix the toggle that forgets the past

```jsx
function toggle(id) {
  setDoneIds((current) => {
    const next = new Set(current);   // copy of CURRENT, not a blank set
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
}
```

**Why:** the buggy `new Set()` built a *blank* bag on every click, throwing away every previous answer — that's why crossing a second step un-crossed the first (the returned set only ever held the id just clicked). And since a newborn empty set contains nothing, `next.has(id)` was always `false`, so the ternary always took the `add` branch — that's why a crossed step could never be un-crossed. Copying `current` keeps history, makes `has` meaningful, and still hands React a brand-new object so the re-render fires.

### 4. Predict what renders

The progress line says **"2 of 4 done"** — not 3 — and exactly two items are crossed out: **"Run the tests"** and **"Update the changelog"**. The other two render normally.

**Why:** a `Set` holds each value at most once, so `new Set(['tests', 'changelog', 'tests'])` silently collapses the duplicate — `doneIds.size` is `2`. Each `<li>` then asks `doneIds.has(step.id)`: true for `'tests'` and `'changelog'` (they get the `done` class and its strikethrough), false for `'tag'` and `'announce'`. The count and the crossed rows agree automatically, because both are derived from the same set.

### 5. A "Hide done steps" checkbox

```jsx
function App() {
  const [doneIds, setDoneIds] = useState(new Set());
  const [hideDone, setHideDone] = useState(false);

  const visibleSteps = hideDone
    ? STEPS.filter((step) => !doneIds.has(step.id))
    : STEPS;
  // ... toggle unchanged ...

  return (
    <div>
      <h1>Release checklist</h1>
      <p>{doneIds.size} of {STEPS.length} done</p>
      <label>
        <input
          type="checkbox"
          checked={hideDone}
          onChange={(e) => setHideDone(e.target.checked)}
        />
        {' '}Hide done steps
      </label>
      <ul>
        {visibleSteps.map((step) => (
          <li
            key={step.id}
            className={doneIds.has(step.id) ? 'done' : ''}
            onClick={() => toggle(step.id)}
          >
            {step.label}
          </li>
        ))}
      </ul>
      <button onClick={() => setDoneIds(new Set())}>Reset all</button>
    </div>
  );
}
```

**Why:** `hideDone` is genuine state (the user's choice), but the shorter list is *not* — `visibleSteps` is derived fresh each render, so nothing is ever deleted from `STEPS` and unticking the box costs nothing. The progress line still reads `doneIds.size` and `STEPS.length`, so it counts hidden rows too, as required. Checkboxes report themselves through `e.target.checked` (a boolean); `e.target.value` on a checkbox is not what you want. Keeping `key={step.id}` means the surviving rows keep their identity when the list shrinks and regrows.
