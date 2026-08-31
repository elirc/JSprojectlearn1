# 🏋️ Practice: Effect Cleanup

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Which of these need cleanup? (warm-up)

For each effect below, answer the README's question — "does this start anything that keeps going?" — and for the ones that do, write the cleanup line. Two of the four need one.

```jsx
// a)
useEffect(() => { document.title = 'Clock app'; }, []);
// b)
useEffect(() => { const id = setTimeout(() => setGreeting('welcome!'), 2000); }, []);
// c)
useEffect(() => { window.addEventListener('resize', onResize); }, []);
// d)
useEffect(() => { console.log('Clock mounted'); }, []);
```

**Practices:** the one-question test that decides whether a `return` is required.
**Hint:** "keeps going" means: still scheduled, still listening, still subscribed after this line runs.
**Expected:** a yes/no for each, plus the exact cleanup for the yes cases; check against the solution.

### ⭐⭐ 2. An online/offline badge (core)

Add a small `OnlineBadge` component to the page showing `online` or `offline`, live: the browser fires `'online'` and `'offline'` events on `window` when the connection changes. One effect, two listeners, one cleanup that removes both.

**Practices:** the `addEventListener`/`removeEventListener` pair, doubled.
**Hint:** start the state from `navigator.onLine`; the same two handler variables must appear in setup and cleanup.
**Expected:** the badge reads `online` normally; toggle your OS network (or the browser devtools' offline mode) and it flips to `offline` and back — and hiding the component leaves no listeners behind.

### ⭐⭐ 3. A pause button for the clock (core)

Give `Clock` a `pause`/`resume` button. While paused, the interval must not merely be ignored — it must not exist: the tab-title gauge should read `live intervals: 0` while the clock is paused, and `1` when running.

**Practices:** cleanup triggered by a re-run, not just by unmount.
**Hint:** `if (paused) return;` at the top of the effect, `[paused]` as deps — React runs the old cleanup before the re-run.
**Expected:** clicking `pause` freezes the displayed time AND drops the title gauge to 0; `resume` restarts ticking and the gauge shows 1; toggling repeatedly never pushes it above 1.

### ⭐⭐ 4. Predict the console (core)

`App` and `Clock` each get logging effects. Starting from a fresh page load, the user clicks `hide clock`, then `show clock`. Predict the complete console output in exact order.

```jsx
// in App:
useEffect(() => {
  console.log('App setup');
  return () => console.log('App cleanup');
}, []);
// in Clock:
useEffect(() => {
  console.log('tick setup');
  return () => console.log('tick cleanup');
}, []);
useEffect(() => {
  console.log('title setup');
  return () => console.log('title cleanup');
}, []);
```

**Practices:** predicting when setup and cleanup fire, and in what order.
**Hint:** `[]` means "on mount / on unmount" — so which of the three components mounts or unmounts at each click?
**Expected:** three lists of log lines (load, hide, show), checked against the solution.

### ⭐⭐⭐ 5. A subscription that hands you its own cleanup (challenge)

Package the ticker as a subscribe-style helper — `startTicker(onTick)` starts an interval (and updates the `activeIntervals` gauge) and *returns the stop function*. Then rewrite `Clock`'s effect as a single line: `useEffect(() => startTicker(setNow), [])`. Explain why that one-liner is leak-free — and what silently breaks if you write the effect body with curly braces instead.

**Practices:** designing APIs for the cleanup line — the returned-unsubscriber pattern.
**Hint:** an arrow without braces returns its expression's value; `startTicker` returns exactly what `useEffect` wants returned.
**Expected:** identical behavior to the refactor (gauge 1/0, clock ticks); the braces variant still ticks but the gauge climbs with each toggle — the leak is back.

## Solutions

### 1. Which of these need cleanup?

a) **No** — setting a title is a one-shot write; nothing keeps going. b) **Yes** — a scheduled timeout is still pending: `return () => clearTimeout(id);` (without it, unmounting before 2s means a state update on a dead component). c) **Yes** — the listener stays hooked forever: `return () => window.removeEventListener('resize', onResize);` d) **No** — a log happens and is over.

**Why:** the test isn't "does the effect touch the outside world" (a and d do too) — it's whether the effect leaves something *running or registered* after it returns. Timers and listeners do; assignments and logs don't. For (a) some apps *choose* to restore the old title on unmount — that's a design nicety, not a leak fix.

### 2. An online/offline badge

```jsx
function OnlineBadge() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return <span>{online ? 'online' : 'offline'}</span>;
}
```

**Why:** two subscriptions, so the cleanup undoes both — setup and teardown reading as matched brackets. The handlers are named constants precisely so the *same function objects* go into `removeEventListener`; a fresh arrow in the cleanup would unhook nothing. `navigator.onLine` seeds the initial render so the badge is right even before any event fires.

### 3. A pause button for the clock

```jsx
function Clock() {
  const [now, setNow] = useState(new Date());
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    activeIntervals++;
    document.title = `live intervals: ${activeIntervals}`;
    return () => {
      clearInterval(id);
      activeIntervals--;
      document.title = `live intervals: ${activeIntervals}`;
    };
  }, [paused]);

  return (
    <div>
      <h2>{now.toLocaleTimeString()}</h2>
      <button onClick={() => setPaused((p) => !p)}>
        {paused ? 'resume' : 'pause'}
      </button>
    </div>
  );
}
```

**Why:** cleanup doesn't only run at unmount — React runs it *before every re-run* of the effect. Clicking pause changes `paused`, so React first runs the previous cleanup (interval dies, gauge drops to 0), then the effect again, which returns early and starts nothing. Resume re-runs it once more, starting exactly one interval. The gauge staying at 0/1 is the proof that pausing destroys rather than ignores.

### 4. Predict the console

Load: `tick setup`, `title setup`, `App setup`. Hide: `tick cleanup`, `title cleanup`. Show: `tick setup`, `title setup`.

**Why:** on mount, children's effects run before the parent's — `Clock` is rendered inside `App`, and React fires effects bottom-up, each component's own effects in declaration order. Hiding unmounts only `Clock`, so only its two cleanups run (in declaration order); `App` never unmounts, so with `[]` deps its effect is silent forever after load. Showing again is a fresh mount of `Clock`: both setups fire again — a remount reruns mount effects, every time.

### 5. A subscription that hands you its own cleanup

```jsx
function startTicker(onTick) {
  const id = setInterval(() => onTick(new Date()), 1000);
  activeIntervals++;
  document.title = `live intervals: ${activeIntervals}`;
  return () => {
    clearInterval(id);
    activeIntervals--;
    document.title = `live intervals: ${activeIntervals}`;
  };
}

// in Clock:
useEffect(() => startTicker(setNow), []);
```

**Why:** `startTicker` returns its own undo, so the brace-less arrow forwards that stop function straight to React — the effect *is* the subscription, cleanup included. Written as `useEffect(() => { startTicker(setNow); }, [])`, the arrow's braces swallow the return value: the stop function is created and discarded, React receives `undefined`, and every toggle mints another immortal interval — the original's bug, one pair of braces away. This is why well-designed subscribe APIs (like js#38's emitter) return their unsubscriber: they're built to sit on this exact line.
