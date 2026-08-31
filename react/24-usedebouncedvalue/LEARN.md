# 📘 Learning Guide: useDebouncedValue

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

A search box that talks to a (fake) search server. Searching is "expensive," so we don't want to search on *every keystroke* — we want to wait until the user pauses typing, then search once for what they ended up with. That waiting-for-quiet trick is called **debouncing**.

The page shows the input, and the results line includes a counter of how many searches have actually been fired. In the original, type 5 letters and the counter says **5 searches** — one per keystroke, each arriving 500ms late. Debouncing achieved nothing (worse: it added delay). In the refactor, type "react" quickly and the counter says **1** — one search, for the final string, after you go quiet.

## 2. Concepts you need first

### Debouncing

Imagine an elevator door: every time someone walks in, the "close door" timer resets. The door closes only after a quiet gap with no arrivals. Debouncing does that to function calls: "run this only after `ms` milliseconds with no new calls."

```js
// call this on every keystroke; the search runs only after 500ms of quiet
debouncedSearch('r');   // timer starts (500ms)
debouncedSearch('re');  // old timer cancelled, new timer starts
debouncedSearch('rea'); // cancelled again... only the LAST survives the quiet
```

Uses everywhere: search-as-you-type, resize handlers, autosave.

### How classic debounce works: closure state

The standard JavaScript implementation keeps its timer id in a closure (a function remembering variables from where it was created — project 18's LEARN.md):

```js
function debounce(fn, waitMs) {
  let timeoutId;                       // THE STATE — lives in the closure
  return (...args) => {
    clearTimeout(timeoutId);           // cancel the previous pending call
    timeoutId = setTimeout(() => fn(...args), waitMs);
  };
}
```

Each call to the returned wrapper cancels the previous pending timer and starts a fresh one. Crucial detail: this only works if **all calls go through the same wrapper**, because the shared `timeoutId` variable is the only link between them. `setTimeout(fn, ms)` runs `fn` once after `ms`; `clearTimeout(id)` cancels it — the one-shot cousins of project 18's `setInterval`/`clearInterval`.

### The React collision: component bodies re-run

Here's the trap this whole project exists for. A React component's body re-runs on **every render** — and in a controlled input, every keystroke causes a render. So this line:

```jsx
const debouncedSearch = debounce((q) => { ... }, 500);  // in the component body!
```

...runs again on every keystroke, building a **brand-new wrapper with a brand-new empty `timeoutId`** each time. The previous keystroke's pending timer lives in the *previous* wrapper's closure — nobody holds its `clearTimeout` handle anymore, so nothing can cancel it. Every timer fires. Debounce is structurally defeated: plain variables in a render body do not survive re-renders. Only React's own hooks (`useState`, `useRef`) carry values across renders.

### The reframe: debounce the *value*, not the function

Instead of a special wrapped function, make a **second state value that trails the first**: `query` changes instantly with typing; `debouncedQuery` copies it only after 500ms of quiet. Then anything expensive just depends on `debouncedQuery` like any normal value. The machinery is one small effect:

```jsx
useEffect(() => {
  const id = setTimeout(() => setDebounced(value), delayMs);
  return () => clearTimeout(id);   // value changed again? kill the pending copy
}, [value, delayMs]);
```

Walk one keystroke through it: `value` changes → React runs the *previous* run's cleanup (cancelling the pending timer — there's the `clearTimeout` the original lost!) → starts a new 500ms timer. Rapid typing = constant cancel-and-restart; only after quiet does a timer live long enough to fire. **Cleanup-before-rerun (project 18) literally is the debounce.** The timer id survives between keystrokes because the effect/cleanup pair is how React carries it — no orphaned closures.

### Prerequisites from earlier guides

- `useEffect`, deps: project 17's LEARN.md.
- Cleanup functions, `setTimeout`/`clearTimeout` pairing: project 18's.
- The stale flag for fetch effects: project 19's (it rides along here).
- Custom hooks (a function calling hooks; per-call-site state): project 22's.
- Controlled inputs: `value={query} onChange={...}` — the input shows state; typing updates it.

## 3. Walking through the original code

**The instrumented fake API:**

```jsx
let searchCount = 0;
function searchApi(query) {
  searchCount++;
  return new Promise((resolve) =>
    setTimeout(() => resolve(`${searchCount} searches so far — results for "${query}"`), 200));
}
```

Every call bumps a global counter and bakes it into the result string — the page's evidence display.

**The imported pattern:** the classic `debounce` from above, verbatim. Correct code! For a world where the wrapper is created once.

**The trap, annotated by the file itself:**

```jsx
const debouncedSearch = debounce((q) => {
  searchApi(q).then(setResults);
}, 500);
// Each keystroke: render -> new debounced fn -> call it. The
// previous keystroke's timer still fires (nobody has its
// clearTimeout handle anymore).
```

This line sits in the component body, so it re-runs per render. Five keystrokes = five wrappers = five independent timers, all of which fire.

**The handler calls both worlds:**

```jsx
function handleChange(e) {
  setQuery(e.target.value);        // render (controlled input)
  debouncedSearch(e.target.value); // call this render's fresh wrapper
}
```

`setQuery` triggers the re-render that builds the *next* wrapper, guaranteeing each wrapper is called exactly once — the worst case for debounce.

## 4. What's wrong with it (in beginner terms)

Type "react" at normal speed and watch:

1. **The counter betrays it.** After the dust settles, the results line says "5 searches so far" — five requests for five keystrokes. That's exactly what *no* debounce would do.
2. **You kept the cost and lost the benefit.** Each of those five searches fired 500ms after its keystroke. So the user got *worse* latency than no debounce (results trail by half a second) *and* zero request savings. Worse than nothing — the README's exact phrase.
3. **Nothing looks wrong in the code.** The `debounce` function is textbook-correct; the call looks natural. The bug lives in an invisible interaction: renders re-running the body. This is the collision between "closures as hidden state" (fine in plain JS) and React's world where the body is re-executed constantly. Any pattern that hides state in a closure — debounce, throttle (its rate-limiting cousin), memoize-with-cache — breaks the same way when created inside a render body.

## 5. Try it yourself first!

1. **Vague hint:** the debounce's timer id must live somewhere that survives re-renders. Plain `let` in a render body doesn't. What React tools do? (Two candidates: state and refs.)
2. **Reframe hint:** forget fixing the *function*. Could you instead make a state value `debouncedQuery` that updates to match `query` only after 500ms of quiet? What runs code when `query` changes? What cancels a pending `setTimeout` when `query` changes *again*?
3. **Concrete recipe:** an effect with deps `[query]`: start `setTimeout(() => setDebouncedQuery(query), 500)`; return a cleanup that `clearTimeout`s it. Trace two fast keystrokes on paper — where does the first timer die?
4. **Hook it:** extract into `function useDebouncedValue(value, delayMs)` returning the trailing value (project 22 mechanics). Then searching is a *second*, ordinary effect with deps `[debouncedQuery]` — put project 19's stale flag in it.
5. **Check:** type 5 letters fast → counter +1. Type slowly with >500ms gaps → one search per pause (that's correct behavior, not a bug!).

## 6. Understanding the refactored solution

**The hook:**

```jsx
function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id); // new keystroke -> old timer dies
  }, [value, delayMs]);

  return debounced;
}
```

Ten lines, and every previous lesson is a load-bearing part: `useState` holds the trailing value across renders (the thing the closure couldn't do); the effect re-runs when `value` changes (17); the cleanup cancels the pending timer first (18). The debounce isn't *implemented and then integrated with* React — it's *made of* React's own re-sync machinery.

**Usage — two values, two jobs:**

```jsx
const [query, setQuery] = useState('');
const debouncedQuery = useDebouncedValue(query, 500);
```

`query` drives the input — so typing feels instant (the box renders from it directly). `debouncedQuery` drives the expensive work — so the server feels respected. Responsiveness and restraint, cleanly split. The page even displays both ("box: rea · searching for: (nothing yet)") so you can watch the trailing value lag.

**Downstream, it's just a value:**

```jsx
useEffect(() => {
  if (debouncedQuery === '') { setResults(''); return; }
  let stale = false;
  searchApi(debouncedQuery).then((r) => { if (!stale) setResults(r); });
  return () => { stale = true; };
}, [debouncedQuery]);
```

This is the important design payoff: the fetch effect doesn't know debouncing exists. It's a bog-standard project-19-grade effect — deps, guard clause, stale flag. Debouncing stopped being a special calling convention ("remember to call through the wrapper!") and became ordinary **data flow**: one value trails another; effects react to values.

**Footnote from the README:** a debounced *callback* is still sometimes the right tool (e.g., debouncing a save function you call from several places) — that version stabilizes the wrapper across renders using `useRef`/`useCallback` (projects 26/28 territory). But for "expensive reaction to fast-changing input," the value version is simpler and composes better.

## 7. Words you learned (glossary)

- **Debounce** — delay acting until the input has been quiet for N ms; only the last call in a burst wins.
- **Throttle** — debounce's cousin: act at most once per N ms during a burst.
- **`setTimeout` / `clearTimeout`** — run once after a delay / cancel that pending run.
- **Wrapper** — the function `debounce` returns; calls to it manage the hidden timer.
- **Closure state** — data hidden in variables a function captured (the classic debounce's `timeoutId`).
- **Render body** — the component function's code; re-executed on every render.
- **Orphaned timer** — a pending timeout whose cancel handle nothing holds anymore.
- **Debounced value** — a state value that trails another by a quiet period; the React-native reframe.
- **Trailing value** — same idea: it follows the source after the delay.
- **Cleanup-before-rerun** — React runs an effect's cleanup before re-running it; here it *is* the cancel step.
- **Data flow** — expressing behavior as values depending on values, rather than special function-calling rules.
- **Calling convention** — a rule about *how* you must invoke something; conventions get forgotten, values don't.
- **`useCallback`** — a hook that keeps the same function object across renders (later project; the fix for debounced *callbacks*).

## 8. Experiments to try on the plane (no internet needed)

CDN note (once): pages need internet on first load for React itself; the fake search API is local. Predict offline; verify online or with cached pages.

1. **Slow-type through the refactor.** Type "cat" with a full second between letters. Prediction: the counter advances three times — one search per pause. Debounce means "wait for quiet," not "only ever one search." If this surprised you, reread the elevator-door analogy.
2. **Tune the quiet window.** Change 500 to 2000 in the refactor. Prediction: you can type entire sentences before anything fires; results feel sluggish. Try 100: fast typists still trigger multiple searches. Feel the tradeoff the number encodes (latency vs. request savings).
3. **Break the refactor the original's way.** Delete the `return () => clearTimeout(id);` line from the hook. Prediction: every keystroke's timer fires — 5 letters, 5 searches, each 500ms late. You've precisely recreated the original's behavior and proven the cleanup line *is* the debounce.
4. **Watch the trailing value.** The refactor renders both `query` and `debouncedQuery`. Type "react" fast and stare. Prediction: "box:" updates letter by letter; "searching for:" stays at its old value, then snaps to "react" 500ms after your last keystroke. That half-second of disagreement is debouncing, made visible.
5. **Debounce something else entirely.** Add a `const debouncedSize = useDebouncedValue(fontSlider, 300)` to any page with a range input (or add `<input type="range" min="10" max="60" />` here) and set a heading's `fontSize` from the debounced value. Prediction: the slider feels instant, the text resizes only when you pause — the hook is generic because it debounces *values*, and everything in React is a value.
