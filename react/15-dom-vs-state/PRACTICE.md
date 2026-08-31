# 🏋️ Practice: DOM Poking vs State

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Buttons that know when they're useless (warm-up)

In the refactor, `collapse all` still looks clickable when everything is already collapsed, and `expand all` when everything is open. Disable each button in exactly that situation, deriving the answer during render — no new state.

**Practices:** derived booleans from visible state — features the original's DOM-classes could never support.
**Hint:** compare `collapsedIds.size` to `SECTIONS.length` (and to 0).
**Expected:** on load, `expand all` is greyed out; click `collapse all` and the two buttons swap roles; toggle one section open and both become clickable.

### ⭐⭐ 2. A title filter (core)

Add a text input that filters which sections are shown: type "sky" and only "Why is the sky blue?" remains. Derive the visible list during render; collapsed-ness must survive filtering (collapse a section, filter it away, clear the filter — still collapsed).

**Practices:** rendering as a function of two pieces of state at once.
**Hint:** `SECTIONS.filter(...)` before the `map`, exactly like project 01's member filter.
**Expected:** typing narrows the list live; clearing the input brings every section back with its collapsed/open state intact, because that state lives in `collapsedIds`, not in the vanished DOM nodes.

### ⭐⭐ 3. The highlight that forgets (core)

A learner added click-highlighting the jQuery way, inside `Section`:

```jsx
<h3 onClick={(event) => { event.target.style.background = 'gold'; onToggle(); }}>
```

With your filter from exercise 2 in place, predict: does the gold survive (a) collapsing and re-expanding that section? (b) filtering the section away and clearing the filter? Explain both, then rewrite the feature as state: the most recently clicked section's title is gold.

**Practices:** state lifetime — why data patched onto DOM nodes evaporates on remount.
**Hint:** collapsing only unmounts the body div; filtering unmounts the whole `Section`.
**Expected:** broken version: gold survives (a) but silently vanishes after (b). Fixed version: the last-clicked title is gold, and it survives collapsing, filtering, anything.

### ⭐⭐ 4. Predict: two mystery buttons (core)

Without running anything, predict what each button does to the screen — and whether `App` re-renders (imagine a `console.log('render')` at the top of `App`):

```jsx
<button onClick={() => setCollapsedIds(new Set(collapsedIds))}>A</button>
<button onClick={() => setCollapsedIds(collapsedIds)}>B</button>
```

**Practices:** reference identity — how React decides "did state change?"
**Hint:** `Object.is(next, current)` is the whole test; contents are never compared.
**Expected:** a written prediction for both buttons (screen effect + re-render or not), checked against the solution.

### ⭐⭐⭐ 5. Undo collapse-all (challenge)

Clicking `collapse all` by accident is annoying, so add an undo: after a `collapse all`, show an `undo` button that restores exactly the sections that were open before — then hide itself. Store the pre-collapse Set in one extra piece of state.

**Practices:** whole-state snapshots — possible only because the Set is replaced, never mutated.
**Hint:** save `collapsedIds` (the object itself!) before overwriting it; restoring is just setting it back.
**Expected:** open sections 1 and 3, collapse section 2 manually, hit `collapse all`, hit `undo` → sections 1 and 3 are open again, 2 still collapsed, and the undo button disappears.

## Solutions

### 1. Buttons that know when they're useless

```jsx
const allCollapsed = collapsedIds.size === SECTIONS.length;
const allOpen = collapsedIds.size === 0;

<button disabled={allCollapsed}
        onClick={() => setCollapsedIds(new Set(SECTIONS.map((s) => s.id)))}>
  collapse all
</button>{' '}
<button disabled={allOpen} onClick={() => setCollapsedIds(new Set())}>
  expand all
</button>
```

**Why:** both booleans are derived from `collapsedIds` on every render, so they can never disagree with the screen. Ask the original version "is everything collapsed?" and there is nobody to ask — the truth is scattered across class attributes React can't read. Visible state makes the feature two comparisons.

### 2. A title filter

```jsx
const [query, setQuery] = useState('');
const visibleSections = SECTIONS.filter((s) =>
  s.title.toLowerCase().includes(query.toLowerCase()),
);

<input placeholder="filter titles..." value={query}
       onChange={(e) => setQuery(e.target.value)} />

{visibleSections.map((section) => (
  <Section key={section.id} title={section.title}
           collapsed={collapsedIds.has(section.id)}
           onToggle={() => toggle(section.id)}>
    {section.body}
  </Section>
))}
```

**Why:** `visibleSections` is derived — no stored copy to fall out of sync. Filtering unmounts hidden `Section`s entirely, and nothing is lost: collapsed-ness lives in `collapsedIds` up in `App`, so a section rebuilt later just reads its truth back out of state. (The `openCount` line still counts all sections; making it count only visible ones is a nice extra derivation.)

### 3. The highlight that forgets

(a) Gold **survives** collapse/expand: collapsing only removes the body div; the `<h3>` DOM node stays mounted, and React never overwrites styles it isn't managing. (b) Gold **vanishes** after filter-away-and-back: the whole `Section` unmounted, the old `<h3>` node was destroyed, and the rebuilt one knows nothing — luggage on a plane you don't own. State version:

```jsx
// App:
const [lastClickedId, setLastClickedId] = useState(null);
function toggle(id) {
  setLastClickedId(id);
  setCollapsedIds((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
}
// pass highlighted={section.id === lastClickedId} to Section, and in Section:
function Section({ title, collapsed, highlighted, onToggle, children }) {
  return (
    <div className="section">
      <h3 onClick={onToggle}
          style={{ background: highlighted ? 'gold' : undefined }}>
        {collapsed ? '▸' : '▾'} {title}
      </h3>
      {!collapsed && <div className="body">{children}</div>}
    </div>
  );
}
```

**Why:** the highlight is now *computed from* `lastClickedId` on every render, so any rebuild of the DOM reproduces it. The subtle part is (a): DOM pokes often *appear* to work because React leaves unmanaged attributes alone — the bug only fires when a node is recycled, which is exactly what makes it maddening to reproduce.

### 4. Predict: two mystery buttons

**A:** nothing visible changes, but `App` **does** re-render (the log fires). `new Set(collapsedIds)` is a different object, `Object.is` says changed, React re-renders — same contents, so the JSX comes out identical. **B:** nothing changes *and* React bails out — same reference means "no update," so no re-render cascade (React is allowed one stray call of `App` while bailing, but the state is unchanged and children don't re-render).

**Why:** React never inspects a Set's contents; identity is the only signal. That's why the refactor's `toggle` copies before editing (new reference = please re-render) and why LEARN.md's mutate-in-place experiment freezes the UI (same reference = nothing happened). Button A is harmless waste; button B is a true no-op.

### 5. Undo collapse-all

```jsx
const [preCollapse, setPreCollapse] = useState(null);

function collapseAll() {
  setPreCollapse(collapsedIds);          // save the object itself
  setCollapsedIds(new Set(SECTIONS.map((s) => s.id)));
}
function undoCollapseAll() {
  setCollapsedIds(preCollapse);
  setPreCollapse(null);
}

<button onClick={collapseAll}>collapse all</button>
{preCollapse !== null && <button onClick={undoCollapseAll}>undo</button>}
```

**Why:** saving `collapsedIds` without copying is safe *because* every update in this app replaces the Set instead of mutating it — the saved object can never be edited behind our back, so it's a true snapshot. (If `toggle` mutated, the "snapshot" would rot as the user clicked.) `preCollapse` doubles as the visibility flag: `null` means nothing to undo, so the button renders conditionally from state — the project's lesson, one more time.
