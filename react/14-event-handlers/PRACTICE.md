# 🏋️ Practice: Event Handlers

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. A clear-log button (warm-up)

Add a `clear log` button to the refactor that empties the `<pre>` log. Before writing it, answer in one sentence: why would `onClick={setLog([])}` be wrong, and what happens instead if you write it that way?

**Practices:** the one rule — event props take a function to call later, not a call.
**Hint:** `setLog([])` *runs during render*; you need to hand React something it can run on click.
**Expected:** clicking the button wipes the log; the log stays wiped until new clicks add lines; nothing happens at page load.

### ⭐⭐ 2. The silent button (core)

A learner added a fourth size button, and clicking it does absolutely nothing — no log line, no error, no console warning:

```jsx
<button onClick={() => handleChooseSize}>jumbo</button>
```

Explain precisely what the click *does* execute, why that produces no visible effect, and fix it. Note this is the *opposite* blooper from `onClick={f()}` — nothing runs too early; something never runs at all.

**Practices:** reading the difference between returning a function and calling one.
**Hint:** the arrow's body is an expression that evaluates to `handleChooseSize`... and then?
**Expected:** broken: clicking `jumbo` logs nothing, ever. Fixed: clicking logs `chose jumbo`.

### ⭐⭐ 3. Enter logs, Escape clears (core)

Add a text input above the log. Pressing Enter with non-blank text logs `typed: <text>` and empties the box; pressing Escape just empties the box. Use one named handler (`handleDraftKeyDown`) and keep the input controlled with a `draft` state.

**Practices:** a new event type (`onKeyDown`) and reading `event.key` in a named handler.
**Hint:** `event.key` is the string `'Enter'` or `'Escape'`; guard Enter with `draft.trim() !== ''`.
**Expected:** type "hello", press Enter → log gains `typed: hello` and the box empties; type junk and press Escape → box empties, log untouched; Enter on an empty box does nothing.

### ⭐⭐ 4. Predict the log order (core)

Three nested click targets, one of them stopping propagation. Without running it, predict the exact log lines (in order) for (a) one click on the button, and (b) one click on the middle box's padding, just outside the button.

```jsx
<div onClick={() => say('grand')}>
  <div onClick={(event) => { event.stopPropagation(); say('parent'); }}>
    <button onClick={() => say('child')}>click me</button>
  </div>
</div>
```

**Practices:** predicting bubbling order and where `stopPropagation` cuts the chain.
**Hint:** events fire innermost-first and climb; `stopPropagation` stops the *climb*, not the handler it's inside.
**Expected:** two written answers — one for each click spot — checked against the solution.

### ⭐⭐⭐ 5. One handler serves the whole row (challenge)

Refactor the three size buttons so the buttons themselves have **no** `onClick` at all: put a single handler on their wrapping `.row` div and let bubbling deliver every button's click to it. Use a `data-size` attribute on each button so the handler knows which one fired, and ignore clicks that land on the row's padding.

**Practices:** bubbling as a feature — the delegation pattern the README hints at.
**Hint:** in the handler, `event.target.dataset.size` is the clicked button's label, or `undefined` for the padding.
**Expected:** clicking `small`/`medium`/`large` logs `chose small` etc. exactly as before; clicking the empty space between buttons logs nothing.

## Solutions

### 1. A clear-log button

```jsx
<button onClick={() => setLog([])}>clear log</button>
```

**Why:** `onClick={setLog([])}` evaluates `setLog([])` *while rendering* — it clears the log during render, triggers a re-render, runs again, and React halts it with a "too many re-renders" error; meanwhile `onClick` would receive `setLog`'s return value (`undefined`). The arrow packages the call as a function React invokes only on click. (`onClick={handleClearLog}` with a named function is equally right — the point is that the braces contain a function, never a call.)

### 2. The silent button

```jsx
<button onClick={() => handleChooseSize('jumbo')}>jumbo</button>
```

**Why:** the broken arrow is a perfectly valid function whose body *evaluates* `handleChooseSize` — producing the function as a value — and throws the result away without calling it (no parentheses, no call). React dutifully runs the arrow on every click; the arrow dutifully does nothing visible. No error is possible because nothing illegal happened. The table from the code comment gains a fourth row: `onClick={() => f}` — runs a function that merely *mentions* f. Wrong, silently.

### 3. Enter logs, Escape clears

```jsx
const [draft, setDraft] = useState('');

function handleDraftKeyDown(event) {
  if (event.key === 'Enter' && draft.trim() !== '') {
    say(`typed: ${draft}`);
    setDraft('');
  } else if (event.key === 'Escape') {
    setDraft('');
  }
}

<input
  value={draft}
  onChange={(event) => setDraft(event.target.value)}
  onKeyDown={handleDraftKeyDown}
  placeholder="type, then Enter"
/>
```

**Why:** `onKeyDown` fires for every key with `event.key` naming it, so one named handler can branch on Enter vs Escape — the `handleX` convention keeping multi-branch logic out of inline arrows. The input stays controlled (`value` + `onChange`, project 07), so "empty the box" is just `setDraft('')` — state is the source of truth, and the handler reads `draft` rather than poking the DOM.

### 4. Predict the log order

(a) Click the button: `child`, then `parent` — and **not** `grand`. (b) Click the middle box's padding: `parent` only.

**Why:** a click fires handlers innermost-first, then bubbles upward through ancestors. The button's handler logs `child`; the event climbs to the middle div, which logs `parent` — but its `stopPropagation()` kills the climb, so the outer div never hears it. Note `stopPropagation` inside the middle handler doesn't prevent that same handler from finishing (the `say('parent')` after it still runs); it only stops *further ancestors*. Clicking the padding starts the event at the middle div: `parent` logs, the climb is stopped, `grand` again never fires.

### 5. One handler serves the whole row

```jsx
function handleSizeClick(event) {
  const size = event.target.dataset.size;
  if (!size) return;            // click landed on the row itself
  say(`chose ${size}`);
}

<div className="row" onClick={handleSizeClick}>
  {['small', 'medium', 'large'].map((size) => (
    <button key={size} data-size={size}>{size}</button>
  ))}
</div>
```

**Why:** every button click bubbles up to the row, so one handler replaces three — the same mechanism that made blooper 5 a bug is doing honest work here, which is why the README calls bubbling "usually a feature." `data-size` rides along on the DOM element and comes back as `event.target.dataset.size`; the guard drops padding clicks, whose target (the div) has no such attribute. Trade-off worth knowing: in React the per-button `onClick={() => handleChooseSize(size)}` version is just as idiomatic — delegation shines when items number in the hundreds or come and go constantly.
