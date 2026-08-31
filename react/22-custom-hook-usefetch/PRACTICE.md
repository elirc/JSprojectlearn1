# 🏋️ Practice: Custom Hooks (useFetch)

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Legal or illegal? (warm-up)

A custom hook is just a function — but the Rules of Hooks still bind every call. For each snippet, say *legal* or *illegal*, with the reason:

```jsx
// a)
if (visible) { const r = useFetch('/stats'); }
// b)
function useProfileName() {
  const r = useFetch('/profile');
  return r.status === 'success' ? r.data.name : null;
}
// c)
const requests = paths.map((p) => useFetch(p));
// d) at the top of StatusLine:
function StatusLine({ label }) { const r = useFetch('/alerts'); /* ... */ }
```

**Practices:** why hook calls must be unconditional and top-level — React tracks them by call order.
**Hint:** ask of each: could the *number or order* of hook calls differ between two renders?
**Expected:** four verdicts with one-line reasons, checked against the solution.

### ⭐⭐ 2. Teach the hook to refetch (core)

Extend `useFetch` so every consumer inherits a retry ability: return `{ ...request, refetch }`, where calling `refetch()` re-runs the request for the same path. Then add a retry button to `StatusLine`'s error case, so the alerts widget (which always fails) can be retried from the UI.

**Practices:** growing a hook's return API — one edit, every widget upgraded.
**Hint:** an `attempt` counter inside the hook, `[path, attempt]` as deps, `refetch = () => setAttempt((a) => a + 1)`.
**Expected:** the alerts widget shows its error with a `retry` button; clicking it shows "loading alerts..." for 500ms, then the error again; profile and stats gained the ability without any edit to their widgets.

### ⭐⭐ 3. The early return that breaks React (core)

A learner added a hide button to `AlertsWidget`:

```jsx
function AlertsWidget() {
  const [show, setShow] = useState(true);
  if (!show) return <button onClick={() => setShow(true)}>show alerts</button>;
  const request = useFetch('/alerts');
  if (request.status !== 'success') return <StatusLine request={request} label="alerts" />;
  return (
    <div className="widget">
      alerts: {JSON.stringify(request.data)}
      <button onClick={() => setShow(false)}>hide</button>
    </div>
  );
}
```

It renders fine — until you click `hide`, when React throws. Name the exact rule violated and fix the component without giving up the feature.

**Practices:** the Rules of Hooks failing at runtime, not in theory.
**Hint:** count the hook calls in a `show` render vs a `!show` render.
**Expected:** broken: clicking `hide` crashes with a "Rendered fewer hooks than expected" error. Fixed: hide/show works, and the hook is called on every render.

### ⭐⭐ 4. Predict: two hooks in one widget (core)

`ComboWidget` calls `useFetch` twice. Predict: (a) how many requests fire; (b) what the widget shows during the first ~500ms and after; (c) what it shows if you change `'/stats'` to `'/alerts'` — and why the two calls can never contaminate each other.

```jsx
function ComboWidget() {
  const profile = useFetch('/profile');
  const stats = useFetch('/stats');
  if (profile.status === 'error' || stats.status === 'error')
    return <div className="widget">dashboard degraded</div>;
  if (profile.status !== 'success' || stats.status !== 'success')
    return <div className="widget">loading combo...</div>;
  return <div className="widget">{profile.data.name}: {stats.data.commits} commits</div>;
}
```

**Practices:** per-call-site state — the heart of what a custom hook is.
**Hint:** each `useFetch` call owns its own `useState` slots, exactly as if the two widgets had been separate.
**Expected:** written answers for (a), (b), (c), checked against the solution.

### ⭐⭐⭐ 5. usePolledFetch (challenge)

Build a sibling hook, `usePolledFetch(path, intervalMs)`, that refetches on a rhythm — for a dashboard that stays fresh. Write it standalone (its own state and two effects): one effect ticks a counter every `intervalMs`, the other is the familiar fetch effect keyed on `[path, tick]`. Swap `StatsWidget` onto it with a 5-second interval.

**Practices:** composing the project's patterns — tick state + race-guarded fetch — into a new reusable hook.
**Hint:** `setTick` is guaranteed stable by React, so the interval effect honestly needs only `[intervalMs]`.
**Expected:** stats loads normally, then re-shows "loading stats..." for half a second every 5 seconds before fresh data returns; the other widgets are unaffected; unmounting the widget stops the polling (no console warnings).

## Solutions

### 1. Legal or illegal?

a) **Illegal** — inside an `if`, the hook runs on some renders and not others, shifting every later hook's position. b) **Legal** — a custom hook calling a custom hook, unconditionally at the top: composition is the whole point. c) **Illegal** — a loop makes the call *count* depend on `paths.length`, which can change between renders. d) **Legal** — any component may call hooks at top level; being "presentational" is a design choice, not a rule.

**Why:** React has no names for your hooks — it matches the Nth hook call of this render to the Nth slot from last render, purely by order. Anything that can change the count or order between renders (conditionals, loops, early returns before hooks) corrupts the matching. That's also why the fix for "conditional fetching" is a conditional *inside* the hook or a conditionally *rendered component*, never a conditional call.

### 2. Teach the hook to refetch

```jsx
function useFetch(path) {
  const [request, setRequest] = useState({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stale = false;
    setRequest({ status: 'loading' });
    api(path)
      .then((data) => { if (!stale) setRequest({ status: 'success', data }); })
      .catch((error) => { if (!stale) setRequest({ status: 'error', error: error.message }); });
    return () => { stale = true; };
  }, [path, attempt]);

  return { ...request, refetch: () => setAttempt((a) => a + 1) };
}

function StatusLine({ request, label }) {
  if (request.status === 'loading') return <div className="widget">loading {label}...</div>;
  if (request.status === 'error') return (
    <div className="widget" style={{ color: '#c33' }}>
      error: {request.error} <button onClick={request.refetch}>retry</button>
    </div>
  );
  return null;
}
```

**Why:** `attempt` is a refetch token (project 17's nonce): its value is meaningless, its changes re-run the effect, and it sits in the deps honestly. Spreading `request` and adding `refetch` keeps the return shape a plain object consumers destructure as needed. The payoff is the README's promise made concrete: one edit in the hook, and all three widgets — plus every future one — can retry, race-guarded and all.

### 3. The early return that breaks React

The rule violated: hooks must be called in the same order and count on every render. When `show` is true, the component calls `useState` then `useFetch` (which calls two more hooks); when `show` flips false, the early return happens *before* `useFetch`, so this render has fewer hooks — React's slot-matching breaks and it throws. Fix — hoist the hook above every return:

```jsx
function AlertsWidget() {
  const [show, setShow] = useState(true);
  const request = useFetch('/alerts');
  if (!show) return <button onClick={() => setShow(true)}>show alerts</button>;
  if (request.status !== 'success') return <StatusLine request={request} label="alerts" />;
  return (
    <div className="widget">
      alerts: {JSON.stringify(request.data)}
      <button onClick={() => setShow(false)}>hide</button>
    </div>
  );
}
```

**Why:** all hooks now run unconditionally; only the *rendering* is conditional — conditions belong below the hooks, not around them. (This version keeps fetching while hidden; if you want hiding to cancel the request, render `<AlertsWidget />` conditionally from `App` instead — unmounting runs the hook's cleanup, which is the stale flag doing its job.)

### 4. Predict: two hooks in one widget

(a) **Two** requests — each `useFetch` call site owns its own `useState` slots, so `ComboWidget` holds two independent request objects. (b) First ~500ms: `loading combo...` (both start `idle`, then `loading`; the render logic treats anything-not-success as loading). After both resolve: `Ada: 1042 commits`. (c) With `'/alerts'`: `dashboard degraded` once the rejection lands — the profile call still *succeeds inside its own state*; the widget merely chooses not to show it.

**Why:** a custom hook shares logic, never state: the two calls are as isolated as if they lived in different components, because React allocates hook slots per call site, per component instance. Contamination is structurally impossible — there is no shared variable for the two requests to fight over (contrast the module-level shared flag disaster of project 19's practice). The widget is one consumer *combining* two private states in render.

### 5. usePolledFetch

```jsx
function usePolledFetch(path, intervalMs) {
  const [tick, setTick] = useState(0);
  const [request, setRequest] = useState({ status: 'idle' });

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  useEffect(() => {
    let stale = false;
    setRequest({ status: 'loading' });
    api(path)
      .then((data) => { if (!stale) setRequest({ status: 'success', data }); })
      .catch((error) => { if (!stale) setRequest({ status: 'error', error: error.message }); });
    return () => { stale = true; };
  }, [path, tick]);

  return request;
}

function StatsWidget() {
  const request = usePolledFetch('/stats', 5000);
  if (request.status !== 'success') return <StatusLine request={request} label="stats" />;
  return <div className="widget">{request.data.commits} commits · {request.data.reviews} reviews</div>;
}
```

**Why:** the hook composes three lessons: an interval with cleanup (18), a tick that exists only to be a dependency (17), and the race-guarded status fetch (19/20) — each poll's effect run expires the previous one, so even a slow response can't overwrite a newer poll. `setTick` is stable by React's guarantee, so `[intervalMs]` is the honest deps list for the first effect. Unmount runs both cleanups: interval dies, in-flight response is refused. Polish option once you reach stale-while-revalidate taste: replace the loading transition with `setRequest((prev) => prev.status === 'success' ? prev : { status: 'loading' })` to keep old data visible during re-polls.
