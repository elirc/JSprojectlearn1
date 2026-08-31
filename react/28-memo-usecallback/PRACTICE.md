# 🏋️ Practice: React.memo + useCallback

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

(Once for this file: all of these can be written and predicted offline; running the page needs the CDN or a cached load.)

## Exercises

### ⭐ 1. Predict: two new props (warm-up)

Suppose you edit the refactor's list to pass two extra props (and make `Row` accept them, without using them yet):

```jsx
<Row key={item.id} item={item} onPick={handlePick}
     title={item.label.toUpperCase()} meta={{ id: item.id }} />
```

Predict, without running: after this change, what does "total row renders" do per keystroke in the filter box — and *which* of the two new props is responsible? Would removing just `meta` fix it?

*Practices:* memo compares each prop with `Object.is` — primitives by value, objects by identity.
*Hint:* `'ITEM 3' === 'ITEM 3'` is true; `{id: 3} === {id: 3}` is false.
*Expected:* your answer matches the solution, including what happens after removing `meta`.

### ⭐⭐ 2. Make the filter actually filter (core)

`filterText` is currently decorative. Make the list show only items whose label contains the text (case-insensitive). Then predict the counter: type `5` (narrowing 60 rows to the 15 whose labels contain "5"), then backspace to empty. What does "total row renders" read at each step, starting from 60?

*Practices:* memo across list changes — kept rows skip, remounted rows pay.
*Hint:* filtering removes components; it doesn't re-render the survivors if their props are stable.
*Expected:* after typing `5`: still **60** (survivors skip, removed rows unmount for free). After backspace: **105** (45 rows remount, each rendering once).

### ⭐⭐ 3. Highlight the picked row (core)

Pass `selected={item.id === picked}` to each `Row`, and render the row bold when selected. Then verify the cost of a click: how much does the counter climb on the *first* pick, and on every pick after that?

*Practices:* designing props so memo invalidates the minimum set of children.
*Hint:* a boolean is a primitive — only rows whose boolean *flipped* re-render.
*Expected:* typing still costs 0 row renders; the first pick costs +1 (one row flips `false→true`); each later pick of a different row costs +2 (old row flips off, new row flips on); re-picking the same row costs 0.

### ⭐⭐ 4. Fix the planted dep (core)

A teammate wanted to log the previous pick and wrote:

```jsx
const handlePick = useCallback((id) => {
  console.log('was', picked);
  setPicked(id);
}, [picked]);
```

Typing is still smooth, but every click that changes the pick makes the counter jump by 60. Explain the exact chain that causes it, then rewrite the callback so it still logs the previous value but stays stable with `[]` deps.

*Practices:* deps changing = new function object = memo defeated; the updater form as the escape hatch.
*Hint:* the previous value is available as the updater's argument.
*Expected:* after your fix, typing costs 0 row renders and picking costs 0 (nothing about any row's props changes — the picked label lives in `App`).

### ⭐⭐⭐ 5. Deletable rows with a stable callback (challenge)

Move the items into state (`useState(ITEMS)`) and give each `Row` a small `✕` button that deletes it via an `onDelete` prop. Requirement: deleting one row must not re-render the surviving rows — prove it with the counter.

*Practices:* stable callbacks over changing collections; `filter` preserves the surviving objects' identities.
*Hint:* `useCallback((id) => setItems(prev => prev.filter(...)), [])` — the updater form keeps deps empty.
*Expected:* clicking ✕ removes that row and the counter does **not** move; picking and typing still behave as before.

## Solutions

### 1. Predict: two new props

The counter climbs by 60 per keystroke again, and **`meta` alone** is responsible. `title` is a string: `item.label.toUpperCase()` produces a *new string* each render, but `Object.is('ITEM 3', 'ITEM 3')` is `true` — primitives compare by value, so the memo still passes. `meta={{ id: item.id }}` builds a fresh object every render, and `Object.is` on objects is identity — always `false` — so every Row "changed". Removing just `meta` restores the frozen counter.

**Why:** memo's comparison never looks inside values. That makes freshly computed primitives free, and freshly constructed objects/arrays/functions poison — the entire art of stable props is keeping non-primitives referentially fixed.

### 2. Make the filter actually filter

```jsx
const shown = ITEMS.filter((item) =>
  item.label.toLowerCase().includes(filterText.toLowerCase())
);
// ...
{shown.map((item) => (
  <Row key={item.id} item={item} onPick={handlePick} />
))}
```

Counter: start **60**. Type `5` → **60**: the 15 survivors get the same `item` object and the same `handlePick`, so their memos skip; the 45 removed rows just unmount (unmounting isn't a render). Backspace to empty → **105**: the 45 rows *remount* — a fresh mount always renders once — while the 15 that never left skip.

**Why:** `filter` returns a new array, but that array is `App`'s own child list, not a prop to a memo'd component — what matters is that the *elements inside* keep their identities and keys. Memo saves you on re-renders; it can't save you on mounts, which is fair: a newly appearing row has to paint at least once. (No `useMemo` on `shown` needed — 60 items is microseconds; project 27's anti-lesson.)

### 3. Highlight the picked row

```jsx
const Row = memo(function Row({ item, onPick, selected }) {
  rowRenders++;
  slowdown();
  return (
    <div className="row" onClick={() => onPick(item.id)}
         style={{ fontWeight: selected ? 'bold' : 'normal' }}>
      {item.label}
    </div>
  );
});
// in App's map:
<Row key={item.id} item={item} onPick={handlePick}
     selected={item.id === picked} />
```

**Why:** `selected` is computed fresh each render, but it's a boolean — value-compared. On a pick, `App` re-renders and exactly two rows see a flipped boolean (one `true→false`, one `false→true`); the other 58 memos pass. First pick: only one flip (+1). Re-picking the same row: `setPicked` receives the current value and React bails out — 0. This is the ideal memo shape: the prop encodes *only what this child needs*, so invalidation is minimal.

### 4. Fix the planted dep

The chain: click → `setPicked` → `App` re-renders → `[picked]` differs from last render → `useCallback` returns a **new** function → all 60 Rows see a changed `onPick` → 60 slow renders. The fix moves the read of the previous value into the updater, where it's handed to you:

```jsx
const handlePick = useCallback((id) => {
  setPicked((prev) => {
    console.log('was', prev);
    return id;
  });
}, []);
```

**Why:** the callback now reads nothing from render scope, so `[]` is honest and the function object is the same forever — every memo passes on every render. (Purists note: an updater should ideally be a pure calculation; a `console.log` is harmless here, but in a StrictMode app it could print twice — the cleaner home for real side effects is an effect or the handler itself via a ref of the previous value.)

### 5. Deletable rows with a stable callback

```jsx
function App() {
  const [items, setItems] = useState(ITEMS);
  const [picked, setPicked] = useState(null);
  const [filterText, setFilterText] = useState('');

  const handlePick = useCallback((id) => setPicked(id), []);
  const handleDelete = useCallback(
    (id) => setItems((prev) => prev.filter((it) => it.id !== id)), []);

  return (
    <div>
      {/* input + picked line unchanged */}
      {items.map((item) => (
        <Row key={item.id} item={item} onPick={handlePick} onDelete={handleDelete} />
      ))}
    </div>
  );
}

const Row = memo(function Row({ item, onPick, onDelete }) {
  rowRenders++;
  slowdown();
  return (
    <div className="row" onClick={() => onPick(item.id)}>
      {item.label}
      <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>✕</button>
    </div>
  );
});
```

**Why:** the updater form (`prev => prev.filter(...)`) means `handleDelete` reads no state from render scope, so `[]` is honest and the function never changes identity. `filter` builds a new *array* but keeps the surviving *item objects* by reference, so every surviving Row's props are `Object.is`-identical → all memos pass → counter frozen. `e.stopPropagation()` keeps the delete click from also bubbling into the row's pick handler — a classic composed-handler gotcha.
