# 🏋️ Practice: Props Design

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Everything is checkable by reading and reasoning; running the page just needs internet once, since React loads from a CDN.)

All exercises modify `refactored/index.html` unless they say otherwise.

## Exercises

### ⭐ 1. A boolean that deserves to be a boolean (warm-up)

This project just spent a whole lesson replacing booleans with a `variant` enum — so here's the counter-example. Add a `disabled` prop to `Button` (default `false`): a disabled button is half-transparent and ignores clicks. Then answer in one sentence: why is a boolean *right* here, when `primary`/`danger` were wrong?

**Practices:** knowing when a boolean prop is correct — one genuine on/off question, independent of the other axes.

**Hint:** the real `<button>` element already understands a `disabled` attribute; add `opacity` to the style merge for the faded look.

**Expected:** `<Button variant="danger" disabled>Delete</Button>` renders a faded red button that does nothing when clicked; every existing call site still works unchanged.

### ⭐⭐ 2. A showroom that draws itself (core)

`App` lists example buttons by hand, so a variant added to `VARIANTS` won't appear until someone remembers to edit the showroom. Add a row that renders **one button per variant automatically**, each labeled with its own variant name — generated from the `VARIANTS` table itself, not written out.

**Practices:** the payoff of rules-as-data — a lookup table you can iterate, which five boolean props could never give you.

**Hint:** `Object.keys(VARIANTS)` is `['default', 'primary', 'danger', 'ghost']`; map it to `<Button>`s (it's a list, so it needs keys).

**Expected:** a row of four buttons labeled default, primary, danger, ghost, each in its own style — and adding a new row to `VARIANTS` makes a fifth button appear with zero showroom edits.

### ⭐⭐ 3. Fix the button that crashes with no props (core)

A teammate touched `Button` and now the page is completely blank, with this in the console: `Error: Unknown variant "defualt"`. Strangely, every call site that *passes* a variant looks fine in review. Their code:

```jsx
function Button({ variant = 'defualt', size = 'medium', onClick, children }) {
  if (!(variant in VARIANTS)) throw new Error(`Unknown variant "${variant}"`);
  if (!(size in SIZES)) throw new Error(`Unknown size "${size}"`);
  return (
    <button style={{ ...VARIANTS[variant], ...SIZES[size] }} onClick={onClick}>
      {children}
    </button>
  );
}
```

Find the bug, explain which call sites trigger it and why the whole page (not just one button) went blank, then fix it.

**Practices:** default parameter values, and reading a throw's message as a pointer to the culprit.

**Hint:** the guard is innocent — it's doing its job. Read the error's quoted value character by character, then find where that value comes from.

**Expected:** after the fix, a bare `<Button>hi</Button>` renders gray/medium again and the page comes back.

### ⭐⭐ 4. Predict what renders (core)

Without running anything, predict what appears on screen and in the console. Assume `Button`, `VARIANTS`, and `SIZES` are exactly as in `refactored/index.html`.

```jsx
function Demo() {
  return (
    <div>
      <h1>Demo</h1>
      <Button size="small">One</Button>
      <Button variant="ghost" size="huge">Two</Button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Demo />);
```

The trap: it's tempting to answer "the heading and button One render, button Two errors". Is that what React actually does?

**Practices:** what `throw` during render does to the *whole* tree, and how defaults fill omitted props.

**Hint:** React commits a render all-or-nothing; there is no error boundary in this file.

**Expected:** your written prediction says exactly what's visible (count the elements) and quotes the console error.

### ⭐⭐⭐ 5. Rescue the Alert from boolean soup (challenge)

A teammate wrote this notification component — same disease this project just cured, caught early:

```jsx
function Alert({ text, warning, error }) {
  let style = { padding: 8, border: '1px solid #999', background: '#eef' };
  if (warning) { style.background = '#fe8'; }
  if (error) { style.background = '#c33'; style.color = '#fff'; }
  return <p style={style}>{text}</p>;
}
```

Redesign its props with this project's full recipe: one `tone` enum (`'info' | 'warning' | 'error'`, defaulting to `'info'`) backed by a lookup table, `children` instead of `text`, and a loud throw for unknown tones. `<Alert warning error>` must become unwritable.

**Practices:** the whole props-design playbook applied to fresh material — enum axis, lookup table, guard, children.

**Hint:** mirror `Button` line for line: a `TONES` table, an `in` check, a spread merge, `{children}`.

**Expected:** `<Alert>Saved.</Alert>` renders a pale blue bar; `<Alert tone="error">Upload failed. <strong>Try again.</strong></Alert>` renders a red bar with white text and bold markup inside; `<Alert tone="urgent">x</Alert>` throws naming "urgent".

## Solutions

### 1. A boolean that deserves to be a boolean

```jsx
function Button({ variant = 'default', size = 'medium', disabled = false, onClick, children }) {
  if (!(variant in VARIANTS)) throw new Error(`Unknown variant "${variant}"`);
  if (!(size in SIZES)) throw new Error(`Unknown size "${size}"`);

  return (
    <button
      style={{ ...VARIANTS[variant], ...SIZES[size], opacity: disabled ? 0.5 : 1 }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

**Why:** `disabled` really is one independent yes/no question — any variant, any size can be disabled, and "disabled AND not-disabled" isn't a combination anyone could request, so there's no exclusivity to protect. The lesson was never "booleans are bad"; it was "mutually exclusive states aren't booleans". Passing `disabled={disabled}` through to the real `<button>` gets the click-blocking for free from the browser, and the ternary in the merge handles the faded look.

### 2. A showroom that draws itself

```jsx
<div>
  {Object.keys(VARIANTS).map((variant) => (
    <Button key={variant} variant={variant}>{variant}</Button>
  ))}
</div>
```

**Why:** because the design lives in a *table*, the list of variants is data you can iterate — `Object.keys` gives `['default', 'primary', 'danger', 'ghost']` in definition order, and each name works both as the prop value and the label. With five boolean props this component was impossible to enumerate; there was no list to loop over. The variant name doubles as the `key` since table keys are unique by construction.

### 3. Fix the button that crashes with no props

```jsx
function Button({ variant = 'default', size = 'medium', onClick, children }) {
```

**Why:** the default value was misspelled — `'defualt'` — so every call site that *omits* `variant` (like the bare `<Button>hi</Button>`) fed the typo into the guard, which correctly threw `Unknown variant "defualt"`. Call sites passing an explicit variant never touch the default, which is why they looked innocent in review. The whole page went blank because the throw happens *during render*: with no error boundary, React abandons the entire tree, not just the offending button. Note the guard is the hero here — it printed the misspelled value, which is the fix's exact location; the silent-default original would have shipped this typo invisibly.

### 4. Predict what renders

**Nothing renders at all** — no heading, no button One. The page area stays blank, and the console shows `Error: Unknown size "huge"` (plus React's note about the error occurring in `Button`, inside `Demo`).

**Why:** button One is fine on its own (`size="small"` exists, `variant` falls back to `'default'`) — but React renders `Demo`'s whole tree in one pass and commits it all-or-nothing. When the second `Button` runs its guard, `'huge' in SIZES` is false and the throw aborts the render before *anything* is committed to the DOM; with no error boundary, React renders nothing for the root. That's the honest cost of loud guards — and why the message must name the bad value, so the blank page takes seconds to diagnose rather than hours.

### 5. Rescue the Alert from boolean soup

```jsx
const TONES = {
  info:    { background: '#eef', color: '#000' },
  warning: { background: '#fe8', color: '#000' },
  error:   { background: '#c33', color: '#fff' },
};

function Alert({ tone = 'info', children }) {
  if (!(tone in TONES)) throw new Error(`Unknown tone "${tone}"`);
  return (
    <p style={{ padding: 8, border: '1px solid #999', ...TONES[tone] }}>
      {children}
    </p>
  );
}
```

Call sites:

```jsx
<Alert>Saved.</Alert>
<Alert tone="warning">Storage is almost full.</Alert>
<Alert tone="error">Upload failed. <strong>Try again.</strong></Alert>
```

**Why:** `warning` and `error` were two answers to one question — "what kind of alert?" — so they collapse into one `tone` prop, and "warning AND error" stops being discouraged and becomes unwritable: one string can't hold two tones. The `TONES` table spells out every designed look (including `info` explicitly, instead of hiding it in the starting style), so adding a `success` tone later is one row. `children` replaces the `text` string, opening the door to bold words and richer content, and the guard turns a typo like `tone="urgent"` into an immediate, self-locating error instead of a silently blue alert.
