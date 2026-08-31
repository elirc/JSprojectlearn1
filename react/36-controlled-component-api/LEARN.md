# 📘 Learning Guide: Controlled Component APIs (Project 36)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A product-review page with a **star rating widget**: five stars (★★★☆☆) you click to rate something. The page shows:

- one star widget next to "your rating: 3",
- a "reset rating" button,
- a *second* copy of the star widget lower on the page, supposedly showing the same rating (like a summary view and a detail view of one product),
- (refactor only) a third widget capped at 4 stars "for free users".

In the original, two features are visibly broken: click **reset** and the label says "your rating: 0" while the stars stubbornly keep showing your old pick; and the two "synced" widgets don't sync — click 5 stars on one, the other doesn't move. In the refactor everything agrees, always. The fix is deciding, in the widget's API, **who owns the rating**.

## 2. Concepts you need first

### Controlled vs uncontrolled: who owns the state?

A widget is **controlled** when its *caller* owns the state: the widget displays a `value` prop and reports every wish for change through an `onChange` callback, keeping no copy of its own. A native `<input>` works this way (project 07):

```jsx
<input value={text} onChange={(e) => setText(e.target.value)} />
```

A widget is **uncontrolled** when it owns its state internally, and the caller can at most set a starting point (`defaultValue`).

Both are legitimate. The disaster is the hybrid this project dissects: *take a prop, copy it into state, then ignore the prop forever*.

### Single source of truth

A design rule: each fact should live in exactly **one** place; everything else displays or derives it. When the same fact lives in two places (parent's `rating` *and* widget's internal `value`), they will disagree eventually, and the screen will show two answers to one question. Projects 07/08 taught this for DOM vs state and for sibling components; this project raises it to the level of a *component API*.

### Why "initialValue" is a red flag

Recall from project 31's LEARN.md: `useState(initialValue)`'s argument is read **once, at mount**, then ignored on every later render. So this line:

```jsx
function StarRating({ initialValue }) {
  const [value, setValue] = useState(initialValue);
```

creates a copy that agrees with the parent *at mount only*. Every parent update afterwards bounces off. The README's phrase: "the word *initial* is the confession."

### Data down, events up

The controlled contract in one slogan: data flows **down** (parent passes `value`), events flow **up** (widget calls `onChange(wish)`). The widget never decides anything; it displays and reports. The parent decides what actually happens — which is where product rules ("cap at 4 for free users") naturally belong.

```jsx
function Toggle({ on, onChange }) {
  return <button onClick={() => onChange(!on)}>{on ? 'ON' : 'off'}</button>;
}
```

Note `Toggle` never stores anything: `onChange(!on)` says "the user wishes it flipped" — the parent may agree, modify, or refuse.

### The dual-mode pattern (for later)

Native inputs support both styles: pass `value` → controlled; pass `defaultValue` → uncontrolled. Libraries mimic that: use internal state *only when no `value` prop is given*. Build the controlled core first; uncontrolled is sugar over it. Know it exists; you rarely need it for app code.

## 3. Walking through the original code

```jsx
// A star-rating widget that OWNS its own state... but also takes
// an initial value, and reports changes. Who owns the rating?
// Answer: both. Which is to say: neither.
function StarRating({ initialValue, onChange }) {
  const [value, setValue] = useState(initialValue);
```

The widget's own comment states the crime. It accepts a starting value, keeps a private copy, *and* promises to report changes — a three-way ambiguity about ownership.

```jsx
function pick(n) {
  setValue(n);
  if (onChange) onChange(n);
}
```

On click: update *my* copy, then tell the parent. Both copies advance together on widget clicks — which is why the bug hides until the *parent* initiates a change.

```jsx
{[1, 2, 3, 4, 5].map((n) => (
  <span key={n} className="star" onClick={() => pick(n)}>
    {n <= value ? '★' : '☆'}
  </span>
))}
```

Display: five spans; star `n` is filled when `n <= value`. Note it renders the *internal* `value` — the parent's opinion is never consulted after mount.

```jsx
const [rating, setRating] = useState(3);
...
<StarRating initialValue={rating} onChange={setRating} />
{' '}your rating: {rating}
...
<button onClick={() => setRating(0)}>reset rating</button>
...
<StarRating initialValue={rating} onChange={setRating} />
```

The parent holds `rating`, wires *both* widgets to it, and adds a reset button that writes it. It all looks reasonable — the API invited this usage, and the API can't deliver it.

## 4. What's wrong with it (in beginner terms)

Two on-screen failures, one cause.

**Failure 1 — reset doesn't reset.** Click stars to 5. Click "reset rating". The text says "your rating: 0" but the stars still show ★★★★★. Why: `setRating(0)` updates the parent's state, the parent re-renders, and passes `initialValue={0}`... which `useState` ignores, because the widget instance already mounted. The widget's private `value` is still 5. Two sources of truth, on screen simultaneously, disagreeing.

**Failure 2 — "synced" widgets drift.** Click 5 stars on the top widget. It updates its own copy (5) and calls `onChange(5)`, so the parent's `rating` is 5... but the bottom widget has *its own* private copy, still 3, and ignores the new `initialValue`. Two widgets, allegedly one rating, showing different numbers of stars.

Both failures have one diagnosis: **the rating lives in three places** (parent, widget 1's state, widget 2's state) that only agreed at mount. Every parent write after that is ignored. The README notes this is "the single most common bug in published custom inputs" — you *will* meet this widget in the wild, usually with an issue tracker full of "why won't it update when I change the prop?"

(Project 31 met the same disease and patched it with a sync effect — with its own flash-and-clobber costs. Here we design the disease away instead.)

## 5. Try it yourself first!

1. **Vague:** the widget has state it shouldn't have. What happens if it simply... doesn't?
2. **Warmer:** make `StarRating` work exactly like a native `<input>`: a `value` prop it displays, an `onChange` it calls with the clicked number. Delete the `useState` entirely.
3. **Specific:** signature becomes `StarRating({ value, onChange })`; a star's click handler is just `() => onChange(n)`; the fill test stays `n <= value`. In the parent, rename `initialValue=` to `value=`.
4. **Check yourself:** reset must snap both widgets to zero stars instantly. Clicking either widget must move both. Then try adding the capped widget: can you enforce "max 4 stars" *without touching the widget*?

## 6. Understanding the refactored solution

The entire widget:

```jsx
function StarRating({ value, onChange }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="star" onClick={() => onChange(n)}>
          {n <= value ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}
```

Zero state. It *displays* `value` and *reports wishes* through `onChange` — a native input's exact contract. Everything the original couldn't do now falls out for free:

- **Reset works:** `setRating(0)` is a parent write to the single truth; both widgets render it on the next pass. There is no private copy to disagree.
- **Syncing is trivial:** two widgets bound to the same state are just the same fact rendered twice.

```jsx
<StarRating value={rating} onChange={(n) => setRating(Math.min(n, 4))} />
```

- **Policy lives with the owner:** the free-user cap is enforced in the *parent's* `onChange` — clamp the wish before storing it. The widget needed no `maxAllowed` prop, because the widget doesn't decide anything. Controlled APIs naturally push product rules to whoever owns the data, which is where they belong.

Two more design lessons from the README:

- **Naming is a promise.** A prop named `value` promises "I obey this, always." `defaultValue`/`initialX` promises "I read this once." The original's bug was implementing the second while its name and `onChange` led callers to expect the first. Pick a side and name it honestly.
- **The dual-mode option:** if casual callers want a zero-setup widget, mirror the platform — internal state only when no `value` prop is passed. Build the controlled core first. What you must never build is the hybrid: initialized-then-independent.

## 7. Words you learned (glossary)

- **Controlled component:** caller owns the state; widget renders `value` and calls `onChange`.
- **Uncontrolled component:** widget owns its state; caller may pass only a starting `defaultValue`.
- **Half-controlled (hybrid):** copies a prop into state, then ignores the prop — the bug pattern here.
- **Single source of truth:** each fact stored in exactly one place; all else displays or derives it.
- **Source-of-truth drift:** two copies of a fact disagreeing over time (the stars vs the label).
- **Data down, events up:** props carry data to children; callbacks carry user intentions to owners.
- **Wish (via onChange):** the widget reporting what the user *asked for*; the owner decides what to store.
- **Policy:** a product rule (like the 4-star cap) — belongs with the state's owner, not in the widget.
- **`defaultValue`:** the conventional name for "read once at mount" props.
- **Component API:** the contract a component offers callers (project 35's LEARN.md).
- **Mount / initializer-runs-once:** why `initialValue` updates are ignored (project 31's LEARN.md).

## 8. Experiments to try on the plane (no internet needed)

(One-time note, detailed in project 27's LEARN.md: pages fetch React from a CDN, so first run needs internet; reading, editing, and predicting work offline.)

1. **Refuse a wish.** In the refactor, change the first widget's handler to `onChange={(n) => { if (n !== 3) setRating(n); }}`. Prediction: clicking 3 stars does nothing at all — the parent declined, and since the widget has no private state, nothing changes on screen. Controlled means the owner has the final word.
2. **Make ratings even-only.** Change a handler to `onChange={(n) => setRating(n % 2 === 0 ? n : n - 1)}`. Prediction: clicking star 5 lights 4 stars. Policy in the parent, widget untouched — try imagining the `allowOnlyEven` prop you'd have bolted onto the original instead.
3. **Recreate the bug minimally.** In the refactor, add back a private copy: `const [local, setLocal] = useState(value)` inside the widget, render `n <= local`, and set both in the click. Prediction: widget clicks look fine, but reset breaks again — you've rebuilt the drift with three lines. Delete them with satisfaction.
4. **Count the sources of truth.** In each version, write down every place the rating is stored (not displayed — stored). Original: parent + one per widget = 3. Refactor: 1. Prediction confirmed by the bugs each version can and cannot have.
