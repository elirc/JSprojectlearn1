# 🏋️ Practice: Stable Props

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

(Once for this file: write and predict offline; running the page needs the CDN or a cached load.)

## Exercises

### ⭐ 1. Spot the leaks (warm-up)

`Gauge` is memo'd and heavy. In this call site, `data` is state, `opts` comes from a correct `useMemo`, and `handleZoom` from a correct `useCallback`:

```jsx
<Gauge width={400}
       title={'Sales ' + year}
       series={data.slice(0, 10)}
       options={opts}
       onZoom={handleZoom} />
```

For each of the five props, say whether it can defeat the memo on an unrelated parent re-render, and why.

*Practices:* primitives compare by value; every non-primitive built in render is a fresh reference.
*Hint:* `.slice()` returns a new array every call — even when the contents are identical.
*Expected:* exactly one prop is a leak; your per-prop reasoning matches the solution.

### ⭐⭐ 2. Log-scale toggle (core)

The refactor has a color button; add a "toggle log scale" button the same way: `logScale` becomes state and flows into the memoized `options` object. Keep the receipt honest: unrelated ticks must not move the chart counter; the log toggle must move it exactly once.

*Practices:* growing a `useMemo`'s deps as the object starts reading more state.
*Hint:* the memo now reads two state values — its deps array must say so.
*Expected:* "tick" → counter still; "change color" → +1; "toggle log" → +1 and the chart's `log=` readout flips.

### ⭐⭐ 3. Filtered series without breaking the memo (core)

Add a `threshold` state (buttons for 0 / 2 / 4) and pass the chart only the values `>= threshold`: conceptually `series={SERIES.filter(v => v >= threshold)}`. Written exactly like that, the memo dies — make it stable while staying correct.

*Practices:* `useMemo`'s identity job for *derived arrays*, not just objects.
*Hint:* same medicine as `options`, keyed on what the derivation reads.
*Expected:* ticks leave the counter alone; changing the threshold re-renders the chart once and the plotted list shrinks/grows accordingly.

### ⭐⭐ 4. The callback that needs fresh state (core)

A teammate changed the zoom handler so the log includes the tick count:

```jsx
const handleZoom = useCallback(() => console.log('zoom at tick', tick), [tick]);
```

Now every "tick" click re-renders the chart again. Explain why, then fix it so the chart stays quiet **and** clicking the chart's zoom (add a small button inside `Chart` that calls `onZoom()`) logs the *current* tick — never a stale one.

*Practices:* the latest-value ref (project 26) as the escape hatch when a stable callback needs changing data.
*Hint:* a ref is always current and never a dep.
*Expected:* ticks don't move the chart counter; after ticking to 7, pressing zoom logs `zoom at tick 7`.

### ⭐⭐⭐ 5. Predict: the children trap (challenge)

Suppose `Chart` is changed to render `{children}` under the plot, and the call site becomes:

```jsx
<Chart series={SERIES} options={options} onZoom={handleZoom}>
  <small>data refreshed daily</small>
</Chart>
```

Nothing else changes. Predict: does "tick" wake the chart now? Explain using what a JSX tag *evaluates to*, and propose the smallest fix.

*Practices:* JSX children are a prop too — and elements are objects.
*Hint:* `<small>…</small>` is sugar for a `React.createElement(...)` call executed in `App`'s render.
*Expected:* your prediction, mechanism, and fix match the solution.

### ⭐⭐⭐ 6. Write memo's comparator in plain JS (challenge)

No React — runnable in node. Write `shallowEqualProps(prev, next)`: `true` when both objects have the same keys and every value passes `Object.is`. Then check your implementation against these cases: identical objects; same contents rebuilt (`{a:[1]}` vs `{a:[1]}`); an added key; `NaN` values; shared array reference.

*Practices:* internalizing exactly what "props unchanged" means to `memo`.
*Hint:* compare key counts, then every key via `Object.is`; never recurse.
*Expected:* `true, false, false, true, true` for the five cases in the solution's test order.

## Solutions

### 1. Spot the leaks

- `width={400}` — number, `Object.is(400, 400)` is true: **safe**.
- `title={'Sales ' + year}` — builds a new string each render, but strings compare by value: **safe**.
- `series={data.slice(0, 10)}` — **the leak**: `.slice()` allocates a new array every render; identical contents, new identity, memo fails on it every time.
- `options={opts}` — memoized upstream, identity stable until its deps change: **safe**.
- `onZoom={handleZoom}` — `useCallback`'d: **safe**.

**Why:** memo's comparison is `Object.is` per prop, no looking inside. So the only dangerous props are non-primitives *constructed during render* — and construction hides in method calls (`slice`, `map`, `filter`, `concat`, spread) just as much as in `[...]` literals.

### 2. Log-scale toggle

```jsx
const [logScale, setLogScale] = useState(false);

const options = useMemo(
  () => ({ ...CHART_OPTIONS, color, logScale }),
  [color, logScale],
);
// JSX:
<button onClick={() => setLogScale((s) => !s)}>toggle log scale</button>
```

**Why:** the memo callback now reads `color` and `logScale`, so both go in the deps — the reads and the array must always match. Tick renders reuse the old object (both deps unchanged); either real change builds one new object, and the chart re-renders exactly once for it. Stability without staleness, extended by one field.

### 3. Filtered series without breaking the memo

```jsx
const [threshold, setThreshold] = useState(0);

const shownSeries = useMemo(
  () => SERIES.filter((v) => v >= threshold),
  [threshold],
);
// JSX:
{[0, 2, 4].map((t) => (
  <button key={t} disabled={threshold === t}
          onClick={() => setThreshold(t)}>≥ {t}</button>
))}
<Chart series={shownSeries} options={options} onZoom={handleZoom} />
```

**Why:** `filter` always returns a fresh array, so inlining it in JSX hands the memo a new `series` identity per render. Wrapping the derivation in `useMemo` keyed on `[threshold]` returns the *same* array object until the threshold really changes. Note the deps don't include `SERIES`: it's a module constant, its identity can never change — only values the component can see change belong there.

### 4. The callback that needs fresh state

Why it broke: `[tick]` means each tick produces a *new* function object; the chart's `onPick`-style prop changed, memo fails, 20ms per tick. The fix — a "latest value" ref keeps the callback stable while its *reads* stay fresh:

```jsx
const tickRef = useRef(tick);
useEffect(() => { tickRef.current = tick; }); // after every render

const handleZoom = useCallback(
  () => console.log('zoom at tick', tickRef.current), []);
// inside Chart:
<button onClick={() => onZoom()}>zoom</button>
```

(Add `useRef`/`useEffect` to the destructured hooks.)

**Why:** the callback now reads only `tickRef` — a box whose *identity* never changes — so `[]` is honest and the function is stable forever. The effect (no deps array → runs after every render) keeps the box's contents current, so pressing zoom after 7 ticks logs 7, not a snapshot. This is project 26's ref-for-bookkeeping powering project 28's stable-callback contract — the standard pattern when "stable" and "fresh" collide.

### 5. Predict: the children trap

Yes — "tick" wakes the chart again. `<small>data refreshed daily</small>` evaluates, inside `App`'s render, to a call like `React.createElement('small', null, 'data refreshed daily')`, which returns a **new element object every render**. Children are passed as the `children` prop, memo compares it with `Object.is`, new object → fail. Smallest fix — hoist the constant element:

```jsx
const FOOTNOTE = <small>data refreshed daily</small>; // module scope
// ...
<Chart series={SERIES} options={options} onZoom={handleZoom}>{FOOTNOTE}</Chart>
```

**Why:** an element is just a frozen description object, so a truly constant one can be created once and reused — React happily renders the same element object many times. If the footnote depended on state, `useMemo` would be the tool instead. The general moral: `children` is not magic; it's one more prop that must obey reference discipline around `memo`.

### 6. memo's comparator in plain JS

```js
function shallowEqualProps(prev, next) {
  if (Object.is(prev, next)) return true;
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) return false;
  return prevKeys.every(
    (k) => Object.prototype.hasOwnProperty.call(next, k) && Object.is(prev[k], next[k])
  );
}

const arr = [1];
console.log(shallowEqualProps({ a: 1 }, { a: 1 }));        // true
console.log(shallowEqualProps({ a: [1] }, { a: [1] }));    // false — two arrays
console.log(shallowEqualProps({ a: 1 }, { a: 1, b: 2 }));  // false — extra key
console.log(shallowEqualProps({ a: NaN }, { a: NaN }));    // true — Object.is, not ===
console.log(shallowEqualProps({ a: arr }, { a: arr }));    // true — same reference
```

**Why:** this is essentially what React runs for a memo'd component: one level deep, `Object.is` per key, never recursing into values. Case 2 *is* the memo-killer trio in miniature — same contents, different identity, "changed". Case 4 shows why React uses `Object.is` rather than `===` (`NaN === NaN` is false, but a `NaN` prop shouldn't force re-renders forever). Case 5 is the whole toolkit's goal: keep handing over the same reference and the comparison passes.
