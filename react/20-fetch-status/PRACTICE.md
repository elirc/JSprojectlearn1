# 🏋️ Practice: Fetch Status

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. A status badge and busy buttons (warm-up)

Add a small badge next to the heading showing the raw status string (like `[loading]`), and disable all three report buttons while a request is in flight. Both features must be derived from `request` — no new state.

**Practices:** one status value feeding every "is it...?" question in the UI.
**Hint:** `const busy = request.status === 'loading';` answers both features.
**Expected:** the badge tracks `idle` → `loading` → `success`/`error` as you click; during each 600ms load, all three buttons are greyed out, then wake up.

### ⭐⭐ 2. The banner that rebuilds the old bug (core)

A learner added a "last failure" banner *outside* `RequestView`, and switched the transitions to patch style "to preserve information":

```jsx
.then((data) => { if (!stale) setRequest((prev) => ({ ...prev, status: 'success', data })); })
.catch((error) => { if (!stale) setRequest((prev) => ({ ...prev, status: 'error', error: error.message })); })
// ...and in App's JSX:
{request.error && <p style={{ color: 'red' }}>last failure: {request.error}</p>}
```

Click report 3, then report 4. What does the screen show, and which project-original bug has just been reborn? Fix it — decide what should happen to the banner.

**Practices:** why transitions replace the object wholesale — spread is how stale fields survive.
**Hint:** after the success transition, what keys does `request` still have?
**Expected:** broken: fresh report 4 data with a red "last failure: Report #3 not found" beside it, forever. Fixed: exactly one thing on screen per state again.

### ⭐⭐ 3. A retry button that lives in the error state (core)

When a request fails, show a `retry` button *inside* the error view that refetches the same report. `setReportId(reportId)` won't re-run the effect (same value) — you need a refetch token. Pass the handler down to `RequestView` as a prop.

**Practices:** per-state UI plus the nonce-dependency trick from project 17.
**Hint:** `const [attempt, setAttempt] = useState(0)`, deps `[reportId, attempt]`, and an `onRetry` prop.
**Expected:** click report 3 → error appears with a `retry` button; clicking it shows `Loading...` then the same error again (report 3 always fails); the button exists in no other state.

### ⭐⭐ 4. Predict: the blink and the overtake (core)

Two predictions about the unmodified refactor. (a) On a fresh page load, does `Pick a report.` (the idle view) ever render — even briefly — and why? (b) From a settled success on report 2, the user clicks `report 4 (ok)` and then `report 2 (ok)` about 200ms later. List everything the results area shows, in order, until it settles — does report 4's text ever appear?

**Practices:** effect timing (effects run after paint) and the stale guard's visible consequences.
**Hint:** for (a), what is `request` during the very first render? For (b), whose flag is raised when report 4's response lands?
**Expected:** written answers to both, with reasons, checked against the solution.

### ⭐⭐⭐ 5. A timeout status (challenge)

Add a fifth state: if a request takes longer than 2 seconds, show `Request timed out.` and discard the response if it ever arrives. Start a `setTimeout` alongside the fetch; whichever settles first wins and silences the other. Add a `case 'timeout'` to `RequestView`. (To watch it fire, temporarily raise the fake API's delay to 3000.)

**Practices:** racing a timer against a promise, with one flag deciding the winner.
**Hint:** when the timer fires, set `stale = true` yourself before `setRequest({ status: 'timeout' })`; when the response wins, `clearTimeout` first.
**Expected:** with the API at 3000ms delay, every request shows `Loading...` for 2s then `Request timed out.`; back at 600ms, behavior is exactly as before and the timer never fires.

## Solutions

### 1. A status badge and busy buttons

```jsx
const busy = request.status === 'loading';

<h1>Report viewer <em style={{ fontSize: 14 }}>[{request.status}]</em></h1>
<button disabled={busy} onClick={() => setReportId(2)}>report 2 (ok)</button>{' '}
<button disabled={busy} onClick={() => setReportId(3)}>report 3 (fails)</button>{' '}
<button disabled={busy} onClick={() => setReportId(4)}>report 4 (ok)</button>
```

**Why:** because the state *is* the status, every UI question is one comparison — no `isLoading` flag to keep synchronized, and the badge is just the truth printed. In the original's three-flag version, a badge like this would have had to invent the status by if-chaining flags, and would faithfully display the contradictions too.

### 2. The banner that rebuilds the old bug

The screen shows report 4's data **plus** the red banner — the original's "error next to fresh data" bug, reborn. The spread copied `error: 'Report #3 not found'` into the success object, so `request` is now `{ status: 'success', data, error }` — a state that lies. Fix: restore wholesale replacement, and if the product really wants a "last failure" banner, give that fact its own state:

```jsx
.then((data) => { if (!stale) setRequest({ status: 'success', data }); })
.catch((error) => { if (!stale) setRequest({ status: 'error', error: error.message }); })
```

**Why:** the refactor's safety came from *never patching* — each transition builds the full truth from scratch, so stale fields structurally cannot survive. `(prev) => ({ ...prev, ... })` reintroduces field-by-field memory, and the banner (reading `request.error` outside the `switch`) reintroduces flag algebra: two independent readers of one object that no longer agree. If "last failure" is a genuine requirement, it's a *different fact* deserving its own `useState` — not a leftover.

### 3. A retry button that lives in the error state

```jsx
const [attempt, setAttempt] = useState(0);

useEffect(() => {
  let stale = false;
  setRequest({ status: 'loading' });
  fetchReport(reportId)
    .then((data) => { if (!stale) setRequest({ status: 'success', data }); })
    .catch((error) => { if (!stale) setRequest({ status: 'error', error: error.message }); });
  return () => { stale = true; };
}, [reportId, attempt]);

<RequestView request={request} onRetry={() => setAttempt((a) => a + 1)} />

function RequestView({ request, onRetry }) {
  switch (request.status) {
    case 'idle': return <p>Pick a report.</p>;
    case 'loading': return <p>Loading...</p>;
    case 'error': return (
      <p style={{ color: 'red' }}>
        Error: {request.error} <button onClick={onRetry}>retry</button>
      </p>
    );
    case 'success': return <p>{request.data}</p>;
  }
}
```

**Why:** `attempt`'s value is meaningless; its *changes* re-run the effect — the refetch-token pattern, here as a second honest dep. The button renders only in the `error` case because that case is the only code path that exists in that state: no `request.status === 'error' &&` sprinkled around, the `switch` already is the state check. `onRetry` keeps `RequestView` presentational — it reports the click; `App` decides what retrying means.

### 4. Predict: the blink and the overtake

(a) **Yes.** The first render happens with `request` at its initial value `{ status: 'idle' }`, and effects run only *after* that render is painted — so the idle view is genuinely rendered first, usually visible as a one-frame blink before `loading` replaces it. (b) Sequence: `Loading...` (click 4) → still `Loading...` (click 2 — same view, new request) → still `Loading...` when report 4's response lands and is **discarded** (its run's `stale` flag was raised by the cleanup when `reportId` changed) → `Report #2: all systems nominal`. Report 4's text never appears.

**Why:** (a) is pure effect timing — state changes from effects can never beat the first paint. (b) is project 19's guarantee doing its job inside the status shape: only the newest run may write, so intermediate requests produce no flicker at all, not even a brief flash of report 4.

### 5. A timeout status

```jsx
useEffect(() => {
  let stale = false;
  setRequest({ status: 'loading' });

  const timer = setTimeout(() => {
    if (!stale) {
      stale = true;                        // refuse the eventual response
      setRequest({ status: 'timeout' });
    }
  }, 2000);

  fetchReport(reportId)
    .then((data) => {
      if (!stale) { clearTimeout(timer); setRequest({ status: 'success', data }); }
    })
    .catch((error) => {
      if (!stale) { clearTimeout(timer); setRequest({ status: 'error', error: error.message }); }
    });

  return () => { stale = true; clearTimeout(timer); };
}, [reportId]);

// in RequestView:
case 'timeout': return <p style={{ color: 'red' }}>Request timed out.</p>;
```

**Why:** `stale` graduates from "this render's world is over" to "this request is settled — nobody else may write," and both racers respect it: the timer checks it (in case the response won), and the response handlers check it (in case the timer won or the query changed). Whichever side wins immediately silences the loser — the timer by setting `stale = true`, the response by `clearTimeout`. Adding the fifth state cost one shape and one `case`, no flag audit — exactly the scaling promise of the status pattern.
