# 🏋️ Practice: Error Boundaries

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

(Once for this file: everything is writable and predictable offline; running the pages needs the CDN or a cached load.)

## Exercises

### ⭐ 1. Predict: nested blast doors (warm-up)

Suppose the dashboard were wired like this:

```jsx
<ErrorBoundary label="Dashboard">
  <WeatherWidget />
  <ErrorBoundary label="Stocks">
    <StockWidget portfolio={portfolio} />
  </ErrorBoundary>
  <NewsWidget />
</ErrorBoundary>
```

Predict: (a) after "simulate", which fallback(s) show and which widgets survive? (b) if the *Stocks fallback itself* had a bug and threw while rendering, what would the user see then?

*Practices:* error propagation stops at the *nearest* boundary — and boundaries can't catch themselves.
*Hint:* treat each boundary as a catch site on the way up the tree.
*Expected:* both answers match the solution's.

### ⭐⭐ 2. A real reporting hook: onError (core)

`componentDidCatch` currently only writes to the console. Add an optional `onError` prop to `ErrorBoundary`, and use it in `App` to keep an on-screen tally: "errors caught: N" (state in `App`, incremented for every catch from any of the three boundaries).

*Practices:* separating containment (the boundary) from reporting (the app's concern), via a prop.
*Hint:* call `this.props.onError` inside `componentDidCatch`; one shared handler can serve all three boundaries.
*Expected:* fresh page shows "errors caught: 0"; simulate → 1; retry without fixing → 2 (it crashed and was caught again); fix + retry → stays at 2.

### ⭐⭐ 3. Auto-recovery when the data heals (core)

Users shouldn't need to click "retry" after "fix the data" — the widget should come back by itself. Make the Stocks boundary reset automatically whenever the data is repaired, *without changing the ErrorBoundary class at all*.

*Practices:* project 31's `key` reset applied to a class component — remount = fresh `state = { error: null }`.
*Hint:* give `App` a `dataVersion` state; bump it in the "fix the data" handler; key the boundary with it.
*Expected:* simulate → fallback appears; click "fix the data" alone → the stock card returns instantly; "retry" still works for the manual path.

### ⭐⭐ 4. The crash the boundary won't catch (core)

Give `StockWidget` a "recalculate" button whose handler runs a risky operation — use `JSON.parse('not json')` as a stand-in. First predict what the boundary does when you click it. Then make the widget handle the failure *properly*: no white screen, no dead button — an inline "recalc failed: …" message in the card.

*Practices:* the boundary's blind spot (event handlers) and the correct tool there: `try/catch` + error-as-state.
*Hint:* you're outside render in a handler, so ordinary `try/catch` works; store `err.message` in state and render it.
*Expected:* the boundary's fallback never appears; clicking recalculate shows the red inline message; the rest of the card keeps working.

### ⭐⭐⭐ 5. Teleporting an async failure into the boundary (challenge)

Make `NewsWidget` "fetch" its headline: a fake promise that rejects after ~800ms (`new Promise((_, reject) => setTimeout(() => reject(new Error('news server down')), 800))`). A rejected promise won't trigger the boundary by itself — bridge it: catch the rejection into state, then **re-throw it during render** so the News boundary shows its fallback.

*Practices:* the store-then-throw pattern that data libraries use to route async errors into boundaries.
*Hint:* `if (error) throw error;` at the top of the component body is the whole bridge.
*Expected:* page loads with "📰 loading…"; ~0.8s later the News card becomes the ⚠️ fallback while Weather and Stocks live on; "retry" remounts the widget, which tries and fails again ~0.8s later.

## Solutions

### 1. Predict: nested blast doors

(a) Only the **Stocks** fallback shows; Weather and News render normally. The throw travels up from `StockWidget` and is caught by the *nearest* boundary above it — the inner one — so the outer boundary never hears about it. (b) If the Stocks fallback threw, that error rises to the **next boundary up**: the Dashboard boundary catches it, and its fallback replaces *everything* — Weather and News included.

**Why:** boundaries work like `catch` blocks stacked along the tree path: nearest one wins, and a boundary cannot catch an error thrown by its own render (fallback included) — that would risk an infinite catch-loop, so React sends it upward. This is why fallback UIs should be aggressively simple: a crashing safety net takes down a bigger region than the original bug would have.

### 2. A real reporting hook: onError

```jsx
componentDidCatch(error, info) {
  console.error('Boundary caught:', error.message, info.componentStack);
  if (this.props.onError) this.props.onError(error, info);
}

// in App:
const [errorCount, setErrorCount] = useState(0);
const reportError = (err) => setErrorCount((c) => c + 1);
// ...
<p>errors caught: {errorCount}</p>
<ErrorBoundary label="Weather" onError={reportError}><WeatherWidget /></ErrorBoundary>
<ErrorBoundary label="Stocks" onError={reportError}><StockWidget portfolio={portfolio} /></ErrorBoundary>
<ErrorBoundary label="News" onError={reportError}><NewsWidget /></ErrorBoundary>
```

**Why:** the boundary knows *how to catch*; what a catch *means* (count it, send it to a tracker, toast the user) is the app's policy, so it arrives as a callback — the same data-down/events-up contract as any controlled widget. Calling `setErrorCount` from `componentDidCatch` is legal (it runs during commit, after the failed render was discarded), and the updater form keeps counts right even if two widgets fail in one pass. Retry-without-fixing hits 2 because each re-attempt genuinely throws and is genuinely caught again.

### 3. Auto-recovery when the data heals

```jsx
const [dataVersion, setDataVersion] = useState(0);

<button onClick={() => {
  setPortfolio({ positions: [{ symbol: 'ACME' }] });
  setDataVersion((v) => v + 1);
}}>
  fix the data
</button>
// ...
<ErrorBoundary key={dataVersion} label="Stocks">
  <StockWidget portfolio={portfolio} />
</ErrorBoundary>
```

**Why:** a changed `key` tells React "different thing" — the old boundary instance (stuck with `error` in its state) is unmounted and a brand-new one mounts with `state = { error: null }`, immediately rendering its children against the freshly repaired portfolio. No class changes needed because remounting *is* the reset. This is exactly how production helpers (e.g. a `resetKeys` prop) work under the hood: tie the boundary's identity to the data whose badness caused the crash.

### 4. The crash the boundary won't catch

Prediction first: the boundary does **nothing** — the throw happens in a click handler, which runs from the browser's event dispatch, not inside React's render call; the error hits the console and the UI silently stays. The proper handling:

```jsx
function StockWidget({ portfolio }) {
  const [calcError, setCalcError] = useState(null);

  function recalculate() {
    try {
      const result = JSON.parse('not json'); // stand-in for risky work
      setCalcError(null);
    } catch (err) {
      setCalcError(err.message);
    }
  }

  return (
    <div className="widget">
      📈 top holding: {portfolio.positions[0].symbol}{' '}
      <button onClick={recalculate}>recalculate</button>
      {calcError && <p style={{ color: '#c33' }}>recalc failed: {calcError}</p>}
    </div>
  );
}
```

**Why:** boundaries cover render-time failures only; in handlers you're plain JavaScript again, where `try/catch` works fine — so use it, and convert the exception into ordinary state the next render can display. Note the shape: *catch → describe → render*, which keeps the failure visible to the user and leaves the widget alive, instead of a silent console entry (the swallowed-error sin) or a dead card.

### 5. Teleporting an async failure into the boundary

```jsx
function fetchNews() {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('news server down')), 800));
}

function NewsWidget() {
  const [headline, setHeadline] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchNews()
      .then((h) => { if (!cancelled) setHeadline(h); })
      .catch((err) => { if (!cancelled) setError(err); });
    return () => { cancelled = true; };
  }, []);

  if (error) throw error;              // the bridge: back into render-land
  return <div className="widget">📰 {headline ?? 'loading…'}</div>;
}
```

**Why:** the rejection fires later, on the microtask queue — far from any render, so no boundary is watching. Storing it in state schedules a render, and *throwing during that render* puts the error exactly where boundaries operate; the News boundary catches it and shows the labeled fallback while the siblings live on. The `cancelled` flag keeps an unmounted widget (say, after retry remounted it) from setting state from the stale promise. This store-then-throw bridge is the standard pattern under data-fetching libraries' "error boundary mode."
