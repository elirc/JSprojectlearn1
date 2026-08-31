# 📘 Learning Guide: Stable Props (Project 30)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A "metrics" page with:

- a heading showing a tick count ("Metrics (tick: 4)"),
- a "tick" button that just increments that number — it has nothing to do with the chart,
- a fake chart panel showing some numbers and a color, plus its own render counter,
- (refactor only) a "change chart color" button that genuinely changes the chart.

The chart is artificially slowed by 20ms and wrapped in `React.memo`, so it *should* skip re-renders when nothing it displays changes. In the original, clicking "tick" — totally unrelated to the chart — makes the chart's render counter climb anyway, 20ms a pop. In the refactor, "tick" leaves the chart alone, and "change color" re-renders it exactly once.

## 2. Concepts you need first

### The 60-second recap of projects 27–28

- A **re-render** is React re-running your component function (project 27's LEARN.md, from scratch).
- **`React.memo`** wraps a child so it skips re-rendering when its props are unchanged (project 28's LEARN.md).
- "Unchanged" means **referential equality**: compared with `Object.is` (like `===`), per prop, never looking inside objects. Two arrays with identical contents are still *different* if they're two separate array objects.

This project generalizes project 28 (which was about functions) to *all* non-primitive values.

### Literals create new objects — every time they run

A **literal** is a value written out directly in the code: `[3, 1, 4]` (array literal), `{ color: 'blue' }` (object literal), `() => {}` (function literal). Each time the line containing a literal *executes*, JavaScript allocates a brand-new object:

```js
function make() { return { color: 'blue' }; }
make() === make(); // false — two objects, same contents
```

Now connect that to rendering: a component body re-runs on every render, so **any literal written in JSX props is rebuilt on every render**:

```jsx
<Chart
  series={[3, 1, 4, 1, 5]}        // new array each render
  options={{ color: 'blue' }}     // new object each render
  onZoom={() => console.log('z')} // new function each render
/>
```

Contents never change; identities always do. `memo` compares identities. So the memo never skips — silently.

The trap's cruelty: none of these look stateful. They read like plain configuration, constants even. That's why the README calls them "the memo-killer trio."

### Module scope: code that runs once, ever

Everything inside a component function runs per render. Everything *outside* it — at the top level of the file, called **module scope** — runs exactly once when the file loads:

```jsx
const SERIES = [3, 1, 4, 1, 5]; // built once, ever

function App() {
  return <Chart series={SERIES} />; // same array object, every render
}
```

Hoisting (moving a value out to module scope) is the simplest possible stability fix, with zero hooks. It only works for true constants — values that don't depend on props or state.

### useMemo's second job: stable identity

Project 27 used `useMemo` to skip *expensive* work. It has a second, unrelated job: keeping an object's **identity** stable across renders even when the object is cheap to build:

```jsx
const options = useMemo(() => ({ color }), [color]);
```

Same `color` as last render → same object handed back → memo'd children see "unchanged". `color` actually changed → new object → children legitimately re-render. Stability *without* staleness.

### useCallback for functions

Same idea for functions — full story in project 28's LEARN.md:

```jsx
const handleZoom = useCallback(() => console.log('zoom'), []);
```

### The toolkit, by prop type

1. Truly constant → **hoist to module scope** (first choice, simplest).
2. Object/array built from state or props → **useMemo**.
3. Function → **useCallback**.

## 3. Walking through the original code

```jsx
const Chart = memo(function Chart({ series, options, onZoom }) {
  chartRenders++;
  slowdown(20);
  return (
    <div className="panel">
      📈 Chart of [{series.join(', ')}] ({options.color}, log={String(options.logScale)})
```

A heavy chart (20ms artificial brake — `slowdown` spins in a loop watching the `performance.now()` stopwatch), correctly wrapped in `memo`, displaying its props and its own render counter. Its author did everything right.

```jsx
function App() {
  const [tick, setTick] = useState(0); // unrelated state: a clock
```

One piece of state that has nothing to do with the chart. Clicking "tick" changes it, which re-renders `App` — normal and correct.

```jsx
<Chart
  series={[3, 1, 4, 1, 5]}
  options={{ color: 'blue', logScale: false }}
  onZoom={() => console.log('zoom')}
/>
```

The crime scene. All three props are literals inside `App`'s body, so all three are rebuilt on every render of `App`. The file's own comment says it best: "Their CONTENTS never change; their REFERENCES always do... this memo has never once skipped a render."

## 4. What's wrong with it (in beginner terms)

On screen: click "tick" five times. The heading counts 1, 2, 3, 4, 5 — fine. But look at "chart renders": it climbs 2, 3, 4, 5, 6 right along with it, and each click has a 20ms hiccup. The chart shows the exact same numbers and the exact same color the whole time. It's redoing 20ms of work to repaint identical pixels.

The step-by-step:

1. "tick" click → `setTick` → `App` re-renders.
2. `App`'s body runs again — including the JSX, so `[3,1,4,1,5]`, `{color:'blue',...}`, and `() => console.log('zoom')` are all constructed anew.
3. `memo` compares: `series` — new array, fail. (It never even needs to check the rest.)
4. Chart re-renders. 20ms. Nothing visible changes.

Two things make this flaw nasty:

- **It's silent.** No error, no warning. The `memo` wrapper sits in the code looking like a working optimization. You only notice if you instrument (the counter) or profile.
- **It doesn't look like state.** `{ color: 'blue', logScale: false }` reads like a constant. The bug is invisible unless you know the every-render-reallocates rule.

The README notes the classic non-fix in similar CSS-flavored words: when people see mysterious re-renders they often reach for *more* machinery, when the actual fix is making the inputs stable.

Wider than memo: these same fresh references also re-trigger anything that depends on them — a `useEffect` with `[options]` in its deps fires every render for the same reason. Reference discipline pays everywhere deps are compared.

## 5. Try it yourself first!

1. **Vague:** the memo works; the props are the problem. Three props — which ones get rebuilt each render? (Careful: it's a trick question.)
2. **Warmer:** all three. Now sort them: which prop depends on nothing at all? Which would need to change if the app let you change the color? Which is a function?
3. **Specific:** apply one tool per prop: move the truly-constant ones out of the component entirely; wrap the state-derived object in `useMemo` keyed on what it reads; wrap the function in `useCallback`.
4. **Check yourself:** "tick" must leave the chart counter frozen. If you also add a color toggle, changing color must move the counter by exactly one.

## 6. Understanding the refactored solution

```jsx
const SERIES = [3, 1, 4, 1, 5];
const CHART_OPTIONS = { color: 'blue', logScale: false };
```

**Fix 1 — hoist.** These depend on nothing, so they now live at module scope: built once when the file loads, identical objects on every render forever. Zero hooks. The refactor's comment: "nothing is fresher than never rebuilt." Always check for this fix first.

```jsx
const [color, setColor] = useState('blue');

const options = useMemo(
  () => ({ ...CHART_OPTIONS, color }),
  [color],
);
```

**Fix 2 — useMemo for state-derived objects.** The refactor deliberately makes `color` real state (with a new button) so hoisting is impossible — the object must be rebuilt *sometimes*. `useMemo` rebuilds it exactly when `color` changes and reuses it otherwise. (`{ ...CHART_OPTIONS, color }` is spread syntax: copy every field of `CHART_OPTIONS` into a new object, then set `color`.) This is stability without staleness: unrelated ticks → same object; real change → new object, one honest re-render.

```jsx
const handleZoom = useCallback(() => console.log('zoom'), []);
```

**Fix 3 — useCallback for functions.** Project 28's move; empty deps because it reads nothing from the render.

```jsx
<Chart series={SERIES} options={options} onZoom={handleZoom} />
```

Every prop now keeps its identity between renders unless its meaning actually changed. The on-screen receipt: "tick" repeatedly — counter still; "change color" — counter +1, exactly once.

## 7. Words you learned (glossary)

- **Literal:** a value written directly in code — `[...]`, `{...}`, `() => ...` — allocated fresh each time the line runs.
- **Reference / identity:** *which* object in memory a variable points at, as opposed to what's inside it.
- **Referential equality:** two variables pointing at the exact same object (`Object.is` / `===` for objects).
- **Fresh reference:** same contents, new object — the thing that silently defeats memo.
- **Memo-killer trio:** inline arrays, inline objects, inline functions in JSX props.
- **Module scope:** top level of the file, outside any component; runs once at load.
- **Hoisting (a constant):** moving a value to module scope so it's created once.
- **useMemo (identity job):** keeping an object/array's reference stable until its inputs change (its speed job is project 27).
- **useCallback:** useMemo for functions (project 28's LEARN.md).
- **Spread syntax (`...obj`):** copies an object's fields into a new object literal.
- **Stale:** out-of-date; the failure you get if deps arrays lie.
- **Silent failure:** no error — just an optimization that never fires.

## 8. Experiments to try on the plane (no internet needed)

(One-time note, detailed in project 27's LEARN.md: the pages pull React from a CDN, so first *run* needs internet; reading, editing, and predicting don't.)

1. **Break one fix at a time.** In the refactor, replace `series={SERIES}` with `series={[3, 1, 4, 1, 5]}`. Prediction: "tick" re-renders the chart again — a single unstable prop defeats the memo, even with the other two stable. Repeat with the other two props to confirm each is load-bearing.
2. **Wrong deps.** Change the options memo deps from `[color]` to `[]`. Prediction: "tick" is still quiet, but "change color" stops working visually — the chart keeps saying blue. That's staleness, the price of a lying deps array (worse than the re-renders you started with).
3. **Overkill deps.** Change the deps to `[color, tick]`. Prediction: correctness returns, but "tick" wakes the chart again — unnecessary deps make useMemo useless here.
4. **Hoist wrongly.** Try to hoist `options` to module scope in the refactor. Prediction: it can't work — module scope can't see `color` (state exists only inside the component). This is *why* the toolkit has three tools instead of one.
