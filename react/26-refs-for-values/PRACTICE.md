# 🏋️ Practice: Refs for Values

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

(Offline note, once for this file: every exercise can be written and reasoned through offline; actually running the page needs the CDN — or a cached earlier load — so verify in the browser after landing.)

## Exercises

### ⭐ 1. Sort the drawer (warm-up)

A component needs to remember six things. For each, write **state** or **ref** and a one-line justification:
(a) the id returned by `setInterval`, kept so it can be cleared later; (b) the text currently shown inside a tooltip; (c) the mouse X where a drag started, read only inside the mousemove handler; (d) whether a dropdown is open; (e) the previous value of a prop, compared inside an effect to detect changes; (f) a count of unsaved edits displayed in a badge.

*Practices:* the sorting rule ("must the screen change when this changes?").
*Hint:* three of them never touch a pixel.
*Expected:* your six answers match the solution's, with the same reasoning.

### ⭐⭐ 2. Worst gap (core)

In `refactored/index.html`, add a third readout: `worst gap: 812ms` — the *slowest* gap ever measured. Update it in `handleClick` using the updater form, mirroring how `bestGap` works.

*Practices:* choosing state for a displayed value; updater-form setters.
*Hint:* it's `bestGap` with the comparison flipped.
*Expected:* after clicking at varied speeds, `worst gap` ≥ `best gap`, it only grows when a slower gap occurs, and the render counter still moves only on clicks — never on mouse wiggles.

### ⭐⭐ 3. Cooldown button (core)

Add a separate `SAVE` button that *ignores* clicks arriving within 1000ms of the last accepted save, plus a displayed `saves: N` count. The time of the last accepted save is read only inside the handler — pick its drawer accordingly.

*Practices:* a classic ref use-case (a timestamp no pixel depends on) next to real state (the visible count).
*Hint:* one `useRef(0)`, one `useState(0)`; compare `performance.now()` against the ref before accepting.
*Expected:* mashing SAVE increments `saves` at most once per second; each *accepted* save re-renders (count changed); rejected clicks re-render nothing.

### ⭐⭐ 4. Reset that actually resets (core)

Add a `Reset` button that clears both readouts back to `—` **and** forgets the last click time. First predict: if you reset only the two state values, what exactly goes wrong on the first click after reset?

*Practices:* remembering that refs don't reset themselves — clearing state leaves `.current` behind.
*Hint:* a ref is cleared by plain assignment, not by a setter.
*Expected:* after Reset, both readouts show `—`; the *first* click after reset shows no gap (it takes two clicks to measure one). Without the ref assignment, the first click computes a bogus gap against the pre-reset click.

### ⭐⭐⭐ 5. Predict what renders (challenge)

Without running anything, work out this component's behavior:

```jsx
let renders = 0;
function Gadget() {
  renders++;
  const [label, setLabel] = useState('idle');
  const taps = useRef(0);
  return (
    <div>
      <button onClick={() => { taps.current++; }}>tap</button>
      <button onClick={() => setLabel('tapped ' + taps.current)}>show</button>
      <p>{label} · renders: {renders}</p>
    </div>
  );
}
```

Starting fresh (the `<p>` reads `idle · renders: 1`), the user clicks: **tap, tap, tap, show, tap, tap, show**. Write what the `<p>` shows after each `show`, and the final render count.

*Practices:* ref writes don't render; handler reads of `.current` are always live.
*Hint:* only one of the two buttons ever schedules a render.
*Expected:* your prediction matches the solution exactly, including the final `renders:` number.

### ⭐⭐⭐ 6. Streak counter (challenge)

Add `streak: N` to the refactor: the number of *consecutive* clicks where each gap was under 400ms. A first click (no gap yet) starts the streak at 1; a gap ≥ 400ms resets it to 1.

*Practices:* combining a ref-held timestamp with displayed state driven from one handler.
*Hint:* you already have `thisGap` inside `handleClick` — branch on it before overwriting `lastClickTime.current`.
*Expected:* rapid clicking climbs the streak by 1 per click; pausing half a second and clicking shows `streak: 1` again; mouse movement never changes it or the render counter.

## Solutions

### 1. Sort the drawer

(a) **ref** — a timer id is pure bookkeeping; no pixel shows it. (b) **state** — the tooltip text is drawn on screen. (c) **ref** — read only inside a handler, never rendered. (d) **state** — open/closed changes what's on screen. (e) **ref** — a previous-value memo for comparison logic, invisible. (f) **state** — the badge displays it.

**Why:** one question decides every row: *does the screen need to change when this value changes?* Yes → `useState` (a repaint is exactly what you want). No → `useRef` (a repaint would be waste, and snapshot reads could go stale).

### 2. Worst gap

```jsx
const [worstGap, setWorstGap] = useState(null);
// inside handleClick, next to setBestGap:
setWorstGap((worst) => (worst === null || thisGap > worst ? thisGap : worst));
// in the JSX:
<p>worst gap: {worstGap === null ? '—' : `${worstGap.toFixed(0)}ms`}</p>
```

**Why:** `worstGap` is displayed, so it's state by the sorting rule. The updater form reads the freshest previous value even during hyper-fast click bursts, exactly like `bestGap` — the comparison just flips from `<` to `>`.

### 3. Cooldown button

```jsx
const [saves, setSaves] = useState(0);
const lastSaveTime = useRef(0);

function handleSave() {
  const now = performance.now();
  if (now - lastSaveTime.current < 1000) return; // rejected: no state touched
  lastSaveTime.current = now;
  setSaves((s) => s + 1);
}
// JSX: <button onClick={handleSave}>SAVE</button> <span>saves: {saves}</span>
```

**Why:** `lastSaveTime` is read only inside the handler — a ref, so rejected clicks write and read nothing that renders, costing zero repaints. `saves` is on screen, so it's state. Using state for the timestamp would both re-render on every rejected click *and* risk stale comparisons from the render snapshot.

### 4. Reset that actually resets

```jsx
function handleReset() {
  setGap(null);
  setBestGap(null);
  lastClickTime.current = null; // the line people forget
}
// JSX: <button onClick={handleReset}>Reset</button>
```

**Why:** setters clear only the state slots; the ref box keeps whatever was last assigned. Without `lastClickTime.current = null`, the first post-reset click sees a non-null old timestamp and computes a huge (or tiny) gap against a click from before the reset — a "ghost gap". Resets must visit both drawers.

### 5. Predict what renders

- Three `tap` clicks: `taps.current` becomes 3; **zero renders** (ref writes render nothing).
- `show`: `setLabel('tapped 3')` — label changed, so render #2. The `<p>` reads **`tapped 3 · renders: 2`**.
- Two more taps: `taps.current` becomes 5; no renders.
- `show`: `setLabel('tapped 5')` — changed again, render #3. The `<p>` reads **`tapped 5 · renders: 3`**.

**Why:** writing `.current` never schedules a render, but the `show` handler reads the *live* box, so it always stamps the true tap count into state. Renders happen only when a state setter receives a genuinely new value — hence exactly 3 renders total, not 8. (If `show` were clicked twice in a row with no taps between, the second `setLabel` would pass an identical string and React would bail out without re-rendering.)

### 6. Streak counter

```jsx
const [streak, setStreak] = useState(0);

function handleClick() {
  const now = performance.now();
  if (lastClickTime.current !== null) {
    const thisGap = now - lastClickTime.current;
    setGap(thisGap);
    setBestGap((best) => (best === null || thisGap < best ? thisGap : best));
    setStreak((s) => (thisGap < 400 ? s + 1 : 1));
  } else {
    setStreak(1); // first click: streak begins
  }
  lastClickTime.current = now;
}
// JSX: <p>streak: {streak}</p>
```

**Why:** the streak is displayed, so it lives in state; the *decision* about it depends on `lastClickTime.current`, which stays a ref because no pixel shows it. The updater form keeps the increment safe under fast bursts, and branching before the final `lastClickTime.current = now` assignment means each click is judged against the truly previous click.
