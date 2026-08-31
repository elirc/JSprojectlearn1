# 📘 Learning Guide: React.memo + useCallback (Project 28)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

An "item picker": a list of 60 rows (Item 0, Item 1, ... Item 59), a text box at the top, and a line showing which item you last clicked ("picked: 7") plus a running total of how many times rows have rendered.

You can click any row to pick it, and type in the text box. In the original, typing in the box is laggy, and the "total row renders" number jumps by 60 with every keystroke. In the refactor, typing is smooth and that number stays frozen at 60. Same UI, same features — wildly different amount of hidden work.

## 2. Concepts you need first

### Parent re-renders re-render children

When a component's state changes, React re-runs that component — *and, by default, every component it renders*, all the way down. It doesn't check whether the children "needed" it.

```jsx
function Parent() {
  const [n, setN] = useState(0);
  return (
    <div>
      <button onClick={() => setN(n + 1)}>{n}</button>
      <Child /> {/* re-renders every click, even though nothing it shows changed */}
    </div>
  );
}
```

Usually that's fine — re-rendering is cheap. It hurts when children are slow or numerous (60 slow rows, here). Project 27's guide explains re-renders from scratch.

### React.memo: "skip me if my props didn't change"

`React.memo` wraps a component and gives it a bouncer. Before re-rendering, React compares the new props with the previous props; if every prop is unchanged, the component is skipped entirely — last render's output is reused.

```jsx
const Hello = React.memo(function Hello({ name }) {
  return <p>Hello {name}</p>;
});
// Parent re-renders with the same `name`? Hello doesn't run again.
```

The whole question of this project is: what does "unchanged" mean?

### Referential equality: how React compares props

JavaScript has two ideas of "the same":

- **Value equality:** do they have the same contents? `'a' === 'a'` → true.
- **Referential equality (identity):** are they literally the same object in memory?

For numbers and strings, the two match. For objects, arrays, and **functions**, they don't:

```js
const a = () => {};
const b = () => {};
a === b; // false — same code, two different function objects
Object.is(a, a); // true — same object
```

`React.memo` compares each prop with `Object.is` — essentially `===`. It never looks *inside* an object or function. Two functions with identical code are still "different" to it.

### The trap: a new function is created every render

Remember: a render is your component function running again. Any `const f = () => ...` inside it builds a **brand-new function object** each run:

```jsx
function App() {
  const handle = () => {};   // new object EVERY render
  return <Kid onPress={handle} />;
}
```

Even if the code text is identical, `Kid`'s `onPress` prop is a different object every time — so `memo(Kid)` sees "prop changed" and re-renders. The memo isn't broken; it's being fed changing props.

### useCallback: keep the same function object across renders

`useCallback` is React's fix: it caches the function object itself.

```jsx
const handle = useCallback((id) => setPicked(id), []);
```

Read as: "Give me this function, and keep handing me back the *same object* on every render, until something in the deps array `[]` changes." Empty deps → same function forever. It's `useMemo` (project 27) specialized for functions.

### Why the empty deps array is safe here: updater functions

Deps must list everything the function reads from the component (props, state read directly). Our callback calls `setPicked(id)` — `id` is its own argument, and state setter functions from `useState` are guaranteed stable by React. It reads nothing from the render, so `[]` is honest. If a callback needs current state, use the updater form `setX(prev => ...)` instead of reading `x` directly — that keeps the deps empty and the function stable.

## 3. Walking through the original code

```jsx
const ITEMS = Array.from({ length: 60 }, (_, i) => ({ id: i, label: `Item ${i}` }));
let rowRenders = 0;
```

`Array.from({length: 60}, ...)` builds 60 objects like `{id: 3, label: 'Item 3'}`. `rowRenders` is a plain global counter — not React state — used purely as instrumentation (a visible measurement).

```jsx
function slowdown() {
  const until = performance.now() + 2;
  while (performance.now() < until) {}
}
```

An artificial brake: spin in a loop for ~2 milliseconds. It simulates a genuinely heavy row (a chart, rendered markdown, an avatar). 60 rows × 2ms = ~120ms per full list render.

```jsx
const Row = memo(function Row({ item, onPick }) {
  rowRenders++;
  slowdown();
  return (
    <div className="row" onClick={() => onPick(item.id)}>
      {item.label}
    </div>
  );
});
```

Each row is wrapped in `memo` — the author *knew* about the optimization. A row shows its label and calls `onPick(item.id)` when clicked.

```jsx
const [picked, setPicked] = useState(null);
const [filterText, setFilterText] = useState('');

const handlePick = (id) => setPicked(id);
```

Two pieces of state, and — the villain — `handlePick`, an arrow function created fresh on every render of `App`.

```jsx
{ITEMS.map((item) => (
  <Row key={item.id} item={item} onPick={handlePick} />
))}
```

Every row receives `item` (from `ITEMS`, a module-level constant — same objects every render, fine) and `onPick={handlePick}` — a *different function object* every render. That one prop defeats all 60 memos.

## 4. What's wrong with it (in beginner terms)

On screen: click into the filter box and type "abc". Each letter appears with a small hitch, and "total row renders" climbs 60 → 120 → 180 → 240. Nothing about the rows changed — same labels, same everything — yet all 60 slow rows redid their work for every keystroke.

The chain of events per keystroke:

1. `setFilterText` runs → `App` re-renders (correct — the input's text changed).
2. The line `const handlePick = (id) => setPicked(id)` runs again → a brand-new function object.
3. Each `Row`'s memo compares props: `item` is the same object (pass), `onPick` is a new object (fail!).
4. "A prop changed" → all 60 rows re-render, each burning ~2ms, ~120ms total, for pixels that cannot differ.

The cruel part: this failure is **silent**. No warning, no error, no red text. The `memo(...)` wrapper sits there looking like an optimization while doing nothing. The README's claim that "most memo wrappers in real codebases are in exactly this state" is why this project exists.

## 5. Try it yourself first!

1. **Vague:** the memo is working correctly — so one of the props must be changing every render. Which of the two props could it be, and why?
2. **Warmer:** `item` comes from `ITEMS`, defined *outside* the component, so it's the same object forever. That leaves `onPick`. What happens to `const handlePick = (id) => ...` when `App` re-renders?
3. **Specific:** you need `handlePick` to be the *same function object* across renders. React has a hook for exactly this. What goes in its deps array, given the function only calls a state setter?
4. **Check yourself:** after your fix, type in the filter — "total row renders" must stay at 60. Clicking a row should still update "picked" (that click *does* legitimately re-render... how many rows? Think about it, then test: answer in section 8, experiment 3).

## 6. Understanding the refactored solution

The diff is one line:

```jsx
const handlePick = useCallback((id) => setPicked(id), []);
```

- `useCallback` returns the same function object render after render, because the deps `[]` never change.
- `[]` is honest: the function reads nothing from render scope — `id` is a parameter, and `setPicked` is stable by React's guarantee.
- Now each `Row`'s memo compares `onPick`: same object (pass), `item`: same object (pass) → skip. Type all you like; rows never re-run. The frozen counter on screen is the receipt.

The page text spells out the full chain that makes list performance work, and every link is required:

> stable props (`useCallback` for functions, `useMemo` for objects/arrays) → memo'd child sees `Object.is`-equal props → skip.

Break *any* link — one inline `style={{...}}`, one inline array, one bare arrow function in the props — and that child's memo becomes decoration. Project 30 is a bug-hunt for exactly those.

Also notice the honesty about priorities: memoization is the *second* tool. If you can restructure so the parent doesn't re-render at all (project 29 moves state down; project 33 splits contexts), those renders never exist and there's no machinery to maintain. Use `memo`+`useCallback` when a genuinely shared parent re-renders and children are genuinely heavy — and keep a render counter on screen while you work.

## 7. Words you learned (glossary)

- **React.memo:** a wrapper that skips re-rendering a component when all its props are unchanged.
- **Props comparison:** memo's check, done per prop with `Object.is` (like `===`), never looking inside objects.
- **Value equality:** "same contents."
- **Referential equality / identity:** "the exact same object in memory."
- **`Object.is`:** JavaScript's strictest sameness check; for objects/functions it means identity.
- **Fresh reference:** a newly created object/array/function that has the same contents as before but a different identity.
- **useCallback:** a hook that returns the same function object across renders until its deps change.
- **Dependency array (deps):** the list of values a hook watches; explained in project 27's LEARN.md.
- **Stable prop:** a prop whose identity doesn't change between renders, allowing memo to skip.
- **Updater function:** `setX(prev => ...)` — lets a callback avoid reading state, keeping its deps empty.
- **Silent failure:** a bug with no error message — things work, just wastefully or wrongly.
- **Instrumentation:** on-screen counters/timers that prove what the code actually did.

## 8. Experiments to try on the plane (no internet needed)

(Reminder from project 27's guide, once for all: the pages fetch React from the internet on first load, so run experiments when you have a connection or a warm browser cache — on the plane, editing and predicting is the exercise.)

1. **Remove the memo.** In the refactor, change `const Row = memo(function Row...)` to a plain `function Row...`. Prediction: typing becomes laggy again and the counter climbs by 60 per keystroke — `useCallback` alone does nothing without `memo` on the child. Both links are required.
2. **Sabotage with an inline prop.** In the refactor, add `style={{ color: 'black' }}` to `<Row ... />` (and accept the prop in Row). Prediction: laggy again — the fresh object prop defeats the memo even though `onPick` is stable. This is project 30's whole topic.
3. **Count a legitimate re-render.** With the working refactor, click a row instead of typing. Prediction: the counter goes up by 60... wait, does it? `picked` changed, `App` re-rendered, but every Row's props are unchanged — the counter should NOT move. (The picked label lives in `App`, not in the rows.) If you expected +60, that's exactly the intuition this project fixes.
4. **Give useCallback a fake dep.** Change the deps to `[filterText]`. Prediction: every keystroke makes a new function again (deps changed → new object) — lag and climbing counter return. Deps you don't need are as harmful here as deps you're missing are elsewhere.
