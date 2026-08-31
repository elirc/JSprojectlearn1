# 🏋️ Practice: State Mutation

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Everything can be written and checked by reasoning offline; the page only needs internet on first load for the CDN.)

## Exercises

### ⭐ 1. Add a "smaller font" button (warm-up)

`embiggenFont` grows the tag line by 2 pixels; add its opposite. Wire a "smaller font" button that shrinks `fontSize` by 2 per click, using the updater form and building a new object — never touching the old one. Bonus point: stop it from shrinking below 8.

**Practices:** object replacement with spread; updater form.

**Hint:** Mirror `embiggenFont`, but subtract — `Math.max(8, current.fontSize - 2)` handles the floor.

**Expected:** Each click visibly shrinks the "react, js" line by 2px; after enough clicks it parks at 8px instead of vanishing.

### ⭐⭐ 2. Click a tag to remove it (core)

Replace the plain `tags.join(', ')` display with one button per tag, labeled like `react x`. Clicking a tag's button removes that tag — using the `splice → filter` row from the page's cheat sheet, not any mutating method.

**Practices:** removing from array state immutably; rendering lists with keys.

**Hint:** `setTags((current) => current.filter((t) => t !== tagToRemove))`, and each button gets `key={tag}`.

**Expected:** With tags "react" and "js", clicking `react x` leaves only the `js x` button; clicking that too shows "(none)". (Note: this removes every copy of a name, so avoid adding duplicates — they'd also collide as keys.)

### ⭐⭐ 3. Fix the dead SHOUT button (core)

A teammate added an uppercase-all feature, and it's a dead button — but with a spooky twist. Predict: what happens right after clicking SHOUT, and what happens if you then type one letter into the draft box? Then fix it with the cheat sheet's `arr[i] = x → map` row.

```jsx
function shoutTags() {
  setTags((current) => {
    current.forEach((t, i) => { current[i] = t.toUpperCase(); });
    return current;
  });
}
```

**Practices:** spotting in-place writes; `map` as the replacing twin of indexed assignment.

**Hint:** The updater *returns the same array it was given*. What does React do when the "new" state is the old reference?

**Expected:** Your two predictions match the solution, and the fixed button uppercases the tag line instantly, on its own.

### ⭐⭐ 4. Add a theme toggle (core)

`settings.theme` exists but nothing uses it. Add a "toggle theme" button that flips `theme` between `'light'` and `'dark'`, and make the tag line render white-on-dark when the theme is `'dark'`. The trap to avoid: your new object must not lose `fontSize` along the way.

**Practices:** object spread preserving untouched keys; deriving styles from state.

**Hint:** `{ ...current, theme: current.theme === 'light' ? 'dark' : 'light' }` — the spread carries `fontSize` forward.

**Expected:** Clicking toggles a dark strip behind the tag line (white text) and back; clicking "bigger font" afterward still works, proving `fontSize` survived every toggle.

### ⭐⭐⭐ 5. Predict what renders: the double add (challenge)

Both buttons below are mutation-free, yet they behave differently. With tags `['react', 'js']` and `"css"` typed in the draft box, predict the exact tag line after one click of button A, and (starting over from the same state) after one click of button B. Explain the difference.

```jsx
function addTwiceA() {
  setTags([...tags, draft]);
  setTags([...tags, draft]);
}
function addTwiceB() {
  setTags((current) => [...current, draft]);
  setTags((current) => [...current, draft]);
}
```

**Practices:** React 18 batching; render-snapshot values vs updater functions.

**Hint:** Inside one handler, `tags` is frozen at what it was when this render happened; updaters instead receive the latest pending value.

**Expected:** Two exact tag lines, one of them containing "css" twice — checked against the solution.

### ⭐⭐⭐ 6. Update nested settings without mutating (challenge)

Suppose settings grows a nested shape: `useState({ theme: 'light', text: { fontSize: 14, bold: false } })`. Rewrite `embiggenFont` for this shape and add a `toggleBold` handler — with the rule that every object you change must be replaced, at *every* level. (Update the tag line's `style` to read `settings.text.fontSize` and `settings.text.bold` too.)

**Practices:** nested immutable updates; spread is shallow.

**Hint:** `{ ...current, text: { ...current.text, fontSize: current.text.fontSize + 2 } }` — one spread per level you touch.

**Expected:** "bigger font" and a new "bold" button both work; toggling bold never resets the font size, and growing the font never un-bolds.

## Solutions

### 1. Add a "smaller font" button

```jsx
function shrinkFont() {
  setSettings((current) => ({
    ...current,
    fontSize: Math.max(8, current.fontSize - 2),
  }));
}

<button onClick={shrinkFont}>smaller font</button>
```

**Why:** The updater builds a brand-new object — spread copies `theme` (and everything else) across, then `fontSize` is overridden — so React sees a new reference and re-renders. `Math.max(8, ...)` clamps the floor without any `if`. Note the parentheses in `({ ... })`: without them JavaScript would read the brace as a function body, not an object.

### 2. Click a tag to remove it

```jsx
function removeTag(tagToRemove) {
  setTags((current) => current.filter((t) => t !== tagToRemove));
}

<p style={{ fontSize: settings.fontSize }}>
  {tags.length === 0
    ? '(none)'
    : tags.map((tag) => (
        <button key={tag} onClick={() => removeTag(tag)}>
          {tag} x
        </button>
      ))}
</p>
```

**Why:** `filter` builds a new array of everything that passes the test, leaving the old array untouched — the replacing twin of `splice`. New reference, so the removal shows up immediately, with no lucky second setter needed. The explicit `tags.length === 0` check replaces the old `|| '(none)'` trick because an empty array is truthy, and it gives `map` a clean path; `key={tag}` works because names are unique here.

### 3. Fix the dead SHOUT button

Prediction 1: clicking SHOUT changes nothing on screen. The updater writes into `current`'s slots (`current[i] = ...`) and returns the *same array*; React compares with `Object.is`, sees the same reference, and skips the re-render entirely. Prediction 2: the data really was uppercased in memory, so the next real state change — typing one letter into the draft box — re-renders and the tag line suddenly reads "REACT, JS". Same delayed-reveal mechanics as the original's five ignored `pop`s. The fix:

```jsx
function shoutTags() {
  setTags((current) => current.map((t) => t.toUpperCase()));
}
```

**Why:** `map` returns a fresh array of transformed items and never touches the original — the cheat sheet's replacement for `arr[i] = x`. Fresh reference, immediate re-render, and no corrupted old state lurking behind an unrelated future render. The updater form is fine to keep; the sin was mutating inside it, not using it.

### 4. Add a theme toggle

```jsx
function toggleTheme() {
  setSettings((current) => ({
    ...current,
    theme: current.theme === 'light' ? 'dark' : 'light',
  }));
}

<p
  style={{
    fontSize: settings.fontSize,
    background: settings.theme === 'dark' ? '#222' : 'transparent',
    color: settings.theme === 'dark' ? '#fff' : '#000',
  }}
>
  {tags.join(', ') || '(none)'}
</p>

<button onClick={toggleTheme}>toggle theme</button>
```

**Why:** The spread copies every key you didn't mention — that's what keeps `fontSize` alive through each toggle. The trap version, `setSettings({ theme: ... })` without `...current`, would replace the object with one that has *no* `fontSize`, so the style becomes `fontSize: undefined` and "bigger font" starts computing `undefined + 2` (`NaN`). Replace-don't-change also means replace-*completely*: copy everything, override one thing.

### 5. Predict what renders: the double add

Button A: the tag line becomes **"react, js, css"** — one "css", not two. Button B: **"react, js, css, css"**. In A, both calls compute `[...tags, draft]` from this render's snapshot, where `tags` is still `['react', 'js']` — two identical requests to become `['react', 'js', 'css']`, and the second simply wins. In B, each updater receives the latest pending value: the first turns `['react', 'js']` into `[..., 'css']`, the second receives *that* and appends again. (Verified by simulating React's update queue in node.)

**Why:** React 18 batches all `setState` calls in one handler into a single re-render, so `tags` never refreshes between the two lines — a plain-value `setTags(x)` says "make it x", while an updater says "transform whatever it is by then". Neither version mutates anything; this is the *other* thing that can make updates seem to vanish, and it's why the refactor uses updaters throughout. Project 11 picks this thread up properly.

### 6. Update nested settings without mutating

```jsx
const [settings, setSettings] = useState({
  theme: 'light',
  text: { fontSize: 14, bold: false },
});

function embiggenFont() {
  setSettings((current) => ({
    ...current,
    text: { ...current.text, fontSize: current.text.fontSize + 2 },
  }));
}

function toggleBold() {
  setSettings((current) => ({
    ...current,
    text: { ...current.text, bold: !current.text.bold },
  }));
}

<p style={{
  fontSize: settings.text.fontSize,
  fontWeight: settings.text.bold ? 'bold' : 'normal',
}}>
  {tags.join(', ') || '(none)'}
</p>
```

**Why:** Spread copies one level only — `{ ...current }` gives you a new outer object whose `text` property still points at the *old* inner object, so writing `.fontSize` on it would mutate shared state. The rule: make a fresh copy of every object along the path you're changing, and reuse everything off that path. Both handlers spread twice (outer, then `text`), so old snapshots stay intact and both properties coexist: toggling bold copies the current `fontSize` forward, and growing the font copies the current `bold` forward (verified in node that originals stay untouched at both levels).
