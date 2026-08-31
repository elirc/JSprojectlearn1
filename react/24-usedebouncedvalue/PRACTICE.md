# 🏋️ Practice: useDebouncedValue

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Once for this file: the page pulls React from a CDN, so run it when you're online — but every timeline below can be worked out on paper, which is the real point.)

All exercises modify `refactored/index.html`, and each starts from the shipped refactor rather than from the previous answer.

## Exercises

### ⭐ 1. Show the gap (warm-up)

The refactor already prints both `query` and `debouncedQuery`, but nothing announces *why* they disagree. Add a small gray hint — "waiting for you to stop typing…" — that shows exactly while the two values differ. Rule: no new state and no new effect; this is a derived value, computable from two things you already have.

**Practices:** reading the trailing gap as data — the disagreement between the two values *is* the debounce.

**Hint:** `query !== debouncedQuery` is `false` on load (both `''`) and `true` from the first keystroke until the timer fires.

**Expected:** the hint appears the instant you type, stays through a fast burst, and vanishes about 500ms after your last keystroke. Note what it does *not* cover: the ~200ms the fake API then takes, during which the hint is gone and the results are still the old ones.

### ⭐⭐ 2. Predict the whole timeline (core)

The page loads at t=0 with an empty box. You type `r` at t=100, `e` at t=400, and `a` at t=1000, then stop. The debounce is 500ms and `searchApi` takes 200ms. Write down: how many `setTimeout`s the hook creates in total, how many are cancelled, at what times `debouncedQuery` changes and to what, how many searches fire, and the exact text of the results line at t=2000. Then answer one more: when `debouncedQuery` changes at its first firing, does the hook's own effect re-run?

**Practices:** cleanup-before-rerun as a schedule you can draw, plus reading a dependency array to decide what re-runs.

**Hint:** the gap between the second and third keystroke is 600ms — longer than the delay. And the hook's deps are `[value, delayMs]`, in which `debounced` does not appear.

**Expected:** your written trace matches the solution's minute-by-minute account, including one keystroke where the "cancel" does nothing at all.

### ⭐⭐ 3. Fix the tidied-up deps (core)

A teammate decides the dependency array "should obviously be about the debounced value" and ships this. Now typing does nothing: results never appear and the counter never moves. Explain precisely why, then fix it.

```jsx
function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [debounced, delayMs]);   // <-- their "cleanup"
  return debounced;
}
```

**Practices:** deps answer "what should make this run again?", not "what does this touch?".

**Hint:** trace the mount run to completion. What value does its timer set, and what does that do to `debounced`?

**Expected:** before the fix, the box types normally but "searching for:" reads "(nothing yet)" forever and no search ever fires. After the fix, "react" typed quickly yields exactly one search.

### ⭐⭐ 4. Clearing should be instant (core)

Debouncing an empty box is pointless: when the user selects all and deletes, the results should disappear immediately, not half a second later. Make the delay itself depend on the input so an empty query flushes right away, without adding state and without touching the fetch effect.

**Practices:** the delay is an ordinary argument, so it can be derived like any other value.

**Hint:** you can pass an expression: what should the second argument be when `query` is `''`?

**Expected:** type "react", wait for results; then select-all and delete — "searching for:" and the results line both clear within a frame or two instead of after 500ms. Typing still debounces normally, and the counter does not advance for the empty string.

### ⭐⭐⭐ 5. Package the whole behaviour (challenge)

Build a second hook, `useSearch(query, delayMs)`, that uses `useDebouncedValue` internally and returns `{ results, searching, typing }` — the results string, whether a request is currently in flight, and whether the debounce gap is open. Then extract a `<SearchBox />` component that owns its own query state and renders from that hook, and put two of them on the page.

**Practices:** hooks composing on hooks, and the per-call-site independence that makes two search boxes free.

**Hint:** keep project 19's `let stale = false` guard, and set `searching` to `true` before the `await`/`.then`, `false` only in the branch the guard lets through.

**Expected:** each box debounces, searches, and reports independently — typing in one never disturbs the other. The shared counter keeps climbing across both, because `searchCount` is module-level and the server does not care who asked.

### ⭐⭐⭐ 6. A debounce that can't starve (challenge)

A determined typist who never pauses for 500ms gets *no results at all* — the timer keeps being cancelled. Add a third parameter, `maxWaitMs`, so the value flushes at least that often during a continuous burst, while still flushing 500ms after a real pause. Default it so existing call sites behave exactly as before.

**Practices:** a ref as a clock-stamp that survives renders, and shortening a timeout instead of adding a second one.

**Hint:** remember when you last flushed (`useRef`), and on each run wait `Math.min(delayMs, Math.max(0, maxWaitMs - sinceLastFlush))`.

**Expected:** with `(500, 2000)` and a letter typed every 300ms, the value flushes at about t=2000 and t=4000 during the burst, and once more 500ms after the final keystroke. With the third argument omitted, nothing about the page changes.

## Solutions

### 1. Show the gap

```jsx
<p>
  box: {query || '(empty)'} · searching for: {debouncedQuery || '(nothing yet)'}
  {query !== debouncedQuery && (
    <span style={{ color: '#888' }}> waiting for you to stop typing…</span>
  )}
</p>
```

**Why:** the two values are both already in scope during render, so their relationship is a derived value — storing an `isTyping` boolean would be a third copy of the truth that could disagree with the other two. The comparison is exact: it becomes `true` the moment `setQuery` renders and `false` on the render triggered by `setDebounced`. It also honestly excludes the request time, which is a different kind of waiting — that one belongs to exercise 5's `searching` flag.

### 2. Predict the whole timeline

- **t=0** (mount): the effect runs with `value = ''` and starts timer #1, due t=500.
- **t=100** (`r`): `value` changed → cleanup cancels timer #1 → timer #2 starts, due t=600.
- **t=400** (`re`): cleanup cancels timer #2 → timer #3 starts, due t=900.
- **t=900:** timer #3 fires. `debouncedQuery` becomes `"re"`; the fetch effect runs and fires **search #1**.
- **t=1000** (`rea`): the cleanup runs `clearTimeout` on timer #3 — which already fired, so it does nothing at all. Timer #4 starts, due t=1500.
- **t=1100:** search #1 resolves; the results line reads `1 searches so far — results for "re"`.
- **t=1500:** timer #4 fires. `debouncedQuery` becomes `"rea"`; the fetch effect's cleanup sets the old `stale = true` (harmless — that request already landed) and fires **search #2**.
- **t=1700:** results line becomes `2 searches so far — results for "rea"`, which is still what it says at t=2000.

Totals: **4 timers created, 2 cancelled, 2 fired, 2 searches.** And no — when `debouncedQuery` changes at t=900, the hook's effect does *not* re-run, because its deps are `[value, delayMs]` and `value` is unchanged.

**Why:** debounce means "wait for quiet," not "only ever fire once" — the 600ms hole between the second and third keystroke *is* quiet, so it earns a search. The last bullet is the one people get wrong: the hook sets state it does not depend on, so its own update can't restart its own timer. If `debounced` were in the deps, the flush would immediately schedule another timer, which is precisely the loop exercise 3 turns into a bug.

### 3. Fix the tidied-up deps

```jsx
}, [value, delayMs]);   // back to the honest deps
```

**Why:** on mount the effect runs once with `value = ''` and schedules `setDebounced('')`. When that fires, the new state equals the old state, so React bails out — and even if it re-renders, the deps `[debounced, delayMs]` are unchanged, so the effect never runs again. Typing changes `value`, but `value` is no longer a dependency, so the hook stops listening to the only input it exists to follow: `debounced` is frozen at `''` forever and the fetch effect never leaves its empty-string guard clause. Deps are not a list of what the effect touches; they are the answer to "what should make this run again?" — and for a value-follower, that is the value.

### 4. Clearing should be instant

```jsx
const debouncedQuery = useDebouncedValue(query, query === '' ? 0 : 500);
```

**Why:** `delayMs` is in the effect's deps, so emptying the box changes *both* inputs at once: the pending 500ms timer is cancelled and replaced with a 0ms one, which fires on the next tick of the event loop — visually instant, and still a timer, so the code path stays identical. The fetch effect needs no change: it already treats `''` as "show nothing," it just gets told sooner. The alternative people reach for — calling `setResults('')` from the input's `onChange` — quietly reintroduces a second way for results to change, and two writers to one value is how the original's five-searches bug was born.

### 5. Package the whole behaviour

```jsx
function useSearch(query, delayMs) {
  const debouncedQuery = useDebouncedValue(query, delayMs);
  const [results, setResults] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (debouncedQuery === '') { setResults(''); setSearching(false); return; }
    let stale = false;
    setSearching(true);
    searchApi(debouncedQuery).then((r) => {
      if (stale) return;
      setResults(r);
      setSearching(false);
    });
    return () => { stale = true; };
  }, [debouncedQuery]);

  return { results, searching, typing: query !== debouncedQuery };
}

function SearchBox({ label }) {
  const [query, setQuery] = useState('');
  const { results, searching, typing } = useSearch(query, 500);
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16 }}>{label}</h2>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="search…" />
      <p style={{ color: '#888' }}>
        {typing ? 'waiting for you to stop typing…' : searching ? 'searching…' : ' '}
      </p>
      <p>{results}</p>
    </div>
  );
}

function App() {
  return (
    <div>
      <h1>Search</h1>
      <SearchBox label="Box A" />
      <SearchBox label="Box B" />
    </div>
  );
}
```

**Why:** each hook keeps one job — `useDebouncedValue` knows about time, `useSearch` knows about the server — and stacking them is just calling one from the other, because a custom hook is a plain function. The `stale` flag stays inside the request effect where the race actually happens, and `setSearching(false)` lives behind the same guard so a slow loser can't switch the spinner off while the winner is still out. Two boxes work with no extra wiring because hook state is per call site: two `SearchBox` instances mean two independent queries, two debounce timers, and two result strings. Only `searchCount` is shared, and only because it deliberately lives outside React as the fake server's own bookkeeping.

### 6. A debounce that can't starve

```jsx
const { useState, useEffect, useRef } = React;   // add useRef

function useDebouncedValue(value, delayMs, maxWaitMs = Infinity) {
  const [debounced, setDebounced] = useState(value);
  const lastFlushRef = useRef(Date.now());

  useEffect(() => {
    const sinceFlush = Date.now() - lastFlushRef.current;
    const wait = Math.min(delayMs, Math.max(0, maxWaitMs - sinceFlush));
    const id = setTimeout(() => {
      lastFlushRef.current = Date.now();
      setDebounced(value);
    }, wait);
    return () => clearTimeout(id);
  }, [value, delayMs, maxWaitMs]);

  return debounced;
}
```

**Why:** the starvation is structural — every keystroke cancels the pending timer, so a fast enough typist can hold the value hostage indefinitely. The cure is not a second timer racing the first; it is to *shorten* the one timer as the deadline approaches, which keeps a single scheduling path and a single cleanup. `lastFlushRef` has to be a ref rather than state: it must survive renders, and writing it must not trigger one (a state write here would re-run the effect and restart the timer it just fired — the churn from project 25). Simulated with a letter every 300ms and `(500, 2000)`, the flushes land at t=2000, t=4000, and 500ms after the final keystroke; with `maxWaitMs` left at its default, `Math.min(delayMs, Infinity)` is just `delayMs`, so old call sites are untouched.
