# 🏋️ Practice: Controlled Component APIs

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

(Once for this file: everything is writable and predictable offline; running the page needs the CDN or a cached load.)

## Exercises

### ⭐ 1. Predict: the no-op onChange (warm-up)

Two versions of the widget receive a parent handler that ignores everything: `onChange={() => {}}`. Version A is the refactor's controlled `StarRating` (no internal state). Version B is the original's hybrid (`useState(initialValue)` inside). The parent shows `rating` (3) in a label next to each. Predict what the *stars* and the *label* show in each version after the user clicks star 5 — and which version is lying to someone.

*Practices:* reading ownership straight off the render source.
*Hint:* whose variable do the stars render in each version?
*Expected:* your four readouts (stars/label × A/B) match the solution.

### ⭐⭐ 2. Hover preview (core)

Make stars light up as the mouse moves across them, then revert to the committed value when the mouse leaves; clicking still commits through `onChange`. First answer in one sentence: where must the hover state live, and does adding it break the "controlled" contract?

*Practices:* the nuance that controlled ≠ stateless — ephemeral view-state may stay inside.
*Hint:* `onMouseEnter` per star, `onMouseLeave` on the wrapper; display `n <= (hover ?? value)`.
*Expected:* sweeping the mouse previews 1-5 stars live without the parent's label changing; leaving reverts to the real rating; a click updates the label everywhere as before.

### ⭐⭐ 3. A second controlled widget: QuantityStepper (core)

Build `QuantityStepper({ value, onChange })` rendering `[−] 3 [+]`, reporting wishes `value - 1` / `value + 1`. In the parent: state `qty` starting at 1, the policy "never below 0" enforced *without* the widget knowing, and the same `qty` shown by a second stepper plus a "reset to 1" button.

*Practices:* writing a fresh controlled widget from scratch; policy at the owner.
*Hint:* the widget has no `Math.max` in it — the clamp lives in the parent's `onChange`.
*Expected:* at 0, clicking − changes nothing (the wish is refused); both steppers always agree; reset snaps both to 1.

### ⭐⭐ 4. Click-again-to-clear (core)

New behavior: clicking the star that is already the current rating clears the rating to 0. Implement it with **zero changes to `StarRating`**, then answer: under what circumstances would you instead move this behavior *into* the widget, and what exactly would that line look like there?

*Practices:* sorting interaction rules between owner-policy and widget-semantics.
*Hint:* the parent knows both the wish (`n`) and the current truth (`rating`).
*Expected:* click star 3 → 3 stars; click star 3 again → 0 stars, label "your rating: 0"; any other star behaves normally.

### ⭐⭐⭐ 5. Dual-mode StarRating (challenge)

Make the widget work like a native input: controlled when a `value` prop is passed, uncontrolled (internal state seeded by `defaultValue`) when it isn't; `onChange` reports in both modes. Verify both usages side by side:

```jsx
<StarRating value={rating} onChange={setRating} />      // controlled, as before
<StarRating defaultValue={2} onChange={(n) => console.log('picked', n)} />  // standalone
```

*Practices:* building the legitimate uncontrolled mode as sugar over a controlled core — never the initialized-then-independent hybrid.
*Hint:* `const isControlled = value !== undefined;` — pick which number to *render*, and write internal state only when uncontrolled.
*Expected:* the controlled widgets still reset/sync perfectly; the standalone one works with no parent state and logs picks; passing *both* props means `value` wins.

## Solutions

### 1. Predict: the no-op onChange

Version A (controlled): stars render `value`, which is the parent's `rating` = 3 — the click calls `onChange(5)`, the parent discards it, nothing re-renders. **Stars: 3, label: 3.** Consistent — the screen truthfully shows that the wish was refused. Version B (hybrid): the click runs `setValue(5)` on the private copy before reporting. **Stars: 5, label: 3.** The widget is lying to the user — the screen shows two answers to one question, and no code can tell which is "real."

**Why:** a controlled widget can't disagree with its owner because it has nothing of its own to disagree *with*. The hybrid's bug isn't the no-op handler — it's that two writable copies exist, so any refused/modified/delayed parent write leaves them split. That's the whole case for single ownership, visible in one click.

### 2. Hover preview

Hover state lives **inside the widget**, and no, it doesn't break the contract: the *rating* still has one owner (the parent); the hover is ephemeral view-state that no caller could meaningfully own or want reported.

```jsx
function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(null);
  const shown = hover ?? value;
  return (
    <span onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="star"
              onMouseEnter={() => setHover(n)}
              onClick={() => onChange(n)}>
          {n <= shown ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}
```

**Why:** "controlled" constrains who owns the *domain value*, not whether the widget may have private UI mechanics (hover, focus, open/closed dropdown). The dividing question: *would any caller ever need to read or set this?* Rating — yes, so it's a prop. Hover — no, so it's internal. `hover ?? value` keeps the committed truth untouched while previewing on top of it.

### 3. QuantityStepper

```jsx
function QuantityStepper({ value, onChange }) {
  return (
    <span>
      <button onClick={() => onChange(value - 1)}>−</button>
      {' '}{value}{' '}
      <button onClick={() => onChange(value + 1)}>+</button>
    </span>
  );
}

function App() {
  const [qty, setQty] = useState(1);
  const handleQty = (n) => setQty(Math.max(0, n)); // policy: owner's clamp
  return (
    <div>
      <p>cart: <QuantityStepper value={qty} onChange={handleQty} /></p>
      <p>summary: <QuantityStepper value={qty} onChange={handleQty} /></p>
      <button onClick={() => setQty(1)}>reset to 1</button>
    </div>
  );
}
```

**Why:** the widget reports arithmetic wishes and renders whatever it's told — it never learns the floor exists. At 0, clicking − produces `onChange(-1)`, the parent stores `Math.max(0, -1)` = 0, and since the state didn't change, React bails out — visibly, the wish is refused. Sync and reset cost nothing because both steppers are views of one `qty`. Tomorrow's "max 10 per customer" rule is one more character in the parent, not a widget release.

### 4. Click-again-to-clear

Parent-side, no widget changes:

```jsx
<StarRating value={rating} onChange={(n) => setRating(n === rating ? 0 : n)} />
```

Move it into the widget only if the toggle is meant to be part of the widget's *universal interaction semantics* — something every caller should get, like a checkbox toggling. There it would read `onClick={() => onChange(n === value ? 0 : n)}` — note the widget still stores nothing; it just makes a smarter *report*, comparing the wish against the `value` prop it was given.

**Why:** both placements preserve single ownership, so both are correct — the design question is *who should decide*. A product rule for this page (free users can't clear?) belongs in the parent; a behavior you'd document in the widget's README belongs in the widget's report. Notice the widget version never touches state: even widget-owned *semantics* can live purely in how the wish is computed.

### 5. Dual-mode StarRating

```jsx
function StarRating({ value, defaultValue = 0, onChange }) {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = value !== undefined;
  const shown = isControlled ? value : internal;

  function pick(n) {
    if (!isControlled) setInternal(n);  // only the uncontrolled mode stores
    if (onChange) onChange(n);          // both modes report
  }

  return (
    <span>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="star" onClick={() => pick(n)}>
          {n <= shown ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}
```

**Why:** the mode is decided by *which prop the caller passed*, mirroring native `value` vs `defaultValue` — and crucially, when controlled, the internal state is never written or rendered, so there's no second source of truth to drift (the hybrid's fatal move was writing both). `defaultValue` keeps its honest read-once name. One real-world caveat this inherits from the platform: a component shouldn't *switch* modes mid-life (passing `value` sometimes and `undefined` other times), which is why libraries warn about it — the two modes are two contracts, chosen at mount.
