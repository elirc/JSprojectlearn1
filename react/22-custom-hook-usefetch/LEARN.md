# 📘 Learning Guide: Custom Hooks (useFetch)

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

A dashboard with three widgets, each loading its own data from a fake server:

- **Profile** — shows "Ada — Engineer"
- **Stats** — shows "1042 commits · 87 reviews"
- **Alerts** — this one's service is down, so the request *fails*

Each widget shows "loading..." first, then its data — except Alerts, which should show an error. In the original, Alerts says "loading alerts..." **forever**: its copy of the fetch code accidentally swallows the error. In the refactor, all three widgets share one correct implementation via a custom hook called `useFetch`, the error displays properly, and the whole page has one copy of the plumbing instead of three drifting ones.

## 2. Concepts you need first

### The prerequisite stack (all from earlier LEARN.md files)

This project *assembles* the last three lessons rather than adding raw material, so make sure these ring a bell:

- **`useEffect` + deps** (project 17): run code after render; re-run when listed values change.
- **The stale flag** (project 19): `let stale = false` + cleanup, so only the latest request writes state.
- **The status object** (project 20): `{ status: 'loading' }` / `{ status: 'success', data }` / `{ status: 'error', error }` — one state, four shapes.

The ~15 lines combining them are what this project calls "the plumbing."

### What a custom hook is (the big reveal: it's just a function)

A *custom hook* is a plain JavaScript function that happens to call hooks (`useState`, `useEffect`...) inside itself. That's the entire definition. No registration, no special API, no magic:

```jsx
function useGreeting(name) {           // just a function...
  const [greeting] = useState('Hello, ' + name);  // ...that calls a hook
  return greeting;
}

function App() {
  const g = useGreeting('Ada');   // used like any function
  return <h1>{g}</h1>;
}
```

Hooks called inside `useGreeting` behave exactly as if they were written directly inside `App`. Extracting them into a function changes nothing about how React runs them — which is why extraction is safe and easy.

### Why the name must start with `use`

The `use` prefix is a naming convention with teeth: it tells human readers "this function calls hooks," and it tells the linter (automatic code checker) to enforce the *Rules of Hooks* inside it. The rules, briefly: hooks must be called at the top level of a component or another hook — never inside an `if`, a loop, or a regular function — because React identifies each hook call by its *position in the call order*, and that order must be identical every render.

### Each call site gets its own state

This is the part that surprises people. When three components each call `useFetch('/x')`, they get **three completely independent copies of the hook's state**. A custom hook shares *logic*, never *state*:

```jsx
function Counter() { const [n, setN] = useState(0); ... }
// <Counter /> <Counter />  -> two independent counts. Same principle:
// useFetch in 3 widgets -> 3 independent requests.
```

(If you ever *want* several components to share one piece of state, that's a different tool — context, project 41.)

### Copy-paste drift

When you copy 15 lines into three places, you don't have one piece of code in three locations — you have **three pieces of code** that start identical and then *fork*: each copy gets edited independently, and fixes applied to one never reach the others. This project's original is a museum of drift: one copy lost its race guard during a "simplification," another swallowed errors. The subtle parts die first, because they're the parts a hurried editor doesn't understand.

### Basics assumed here

`useState`, event handlers: project 14's LEARN.md. Promises, `.then`/`.catch`: projects 17 and 20.

## 3. Walking through the original code

**The fake API — one path fails by design:**

```jsx
function api(path) {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      if (path === '/profile') resolve({ name: 'Ada', role: 'Engineer' });
      else if (path === '/stats') resolve({ commits: 1042, reviews: 87 });
      else if (path === '/alerts') reject(new Error('alerts service down'));
      else reject(new Error('404'));
    }, 500));
}
```

**ProfileWidget — the "good" copy.** It has the full project-19/20 plumbing: status object, stale flag, cleanup, `.catch` that records the error. Fifteen lines of correct machinery, then three lines of rendering.

**StatsWidget — the copy that lost its race guard:**

```jsx
useEffect(() => {
  setRequest({ status: 'loading' });
  api('/stats') // <- pasted, then "simplified": the stale flag
    .then((data) => setRequest({ status: 'success', data }))
    .catch((error) => setRequest({ status: 'error', error: error.message }));
}, []);       // the race protection quietly died in this copy
```

Someone tidied the paste and deleted the `let stale` / cleanup lines — they looked redundant. Nothing breaks *today* (the path never changes), but the protection is gone, silently.

**AlertsWidget — the copy that eats errors:**

```jsx
api('/alerts')
  .then((data) => { if (!stale) setRequest({ status: 'success', data }); })
  .catch(() => { /* pasted, then MODIFIED: errors swallowed! */ });
```

The `.catch` is empty. The request fails, nobody records it, so `request.status` stays `'loading'` forever. The widget's own loading line even admits it: "loading alerts... (forever — the error was eaten)".

**App** just stacks the three widgets.

## 4. What's wrong with it (in beginner terms)

1. **The eternal spinner.** On screen: Profile and Stats load fine; Alerts says "loading alerts..." and never stops. No error message, no console explosion — the failure was caught by an empty `.catch` and discarded. To the user it looks like slowness; actually it's a black hole. This is why "swallowed errors" are feared: the system fails *quietly*.
2. **Invisible lost armor.** StatsWidget looks and works fine — you cannot tell from the screen that its race guard is gone. It's a landmine: the day someone makes the path dynamic, out-of-order responses will corrupt the display, and the bug report will make no sense.
3. **Three forks, one future.** Every future fix (say, adding a retry, or a timeout) must now be applied three times, and each application can itself drift. The number of copies multiplies both the work and the ways to get it wrong. The screen shows three widgets; the codebase secretly contains three *implementations*.

## 5. Try it yourself first!

1. **Vague hint:** the three widgets differ in exactly one meaningful way. Find it. (It's the string passed to `api`.) Everything else is the same 15 lines — which means those lines want to be *one function*.
2. **Mechanics:** write `function useFetch(path) { ... }` above the widgets. Move ProfileWidget's state + effect into it (the correct copy — the one with the stale flag and real catch). Return `request` at the end.
3. **Deps question:** inside the hook, the effect reads `path`. What belongs in the deps array? (Honest rule from project 17: what it reads, it lists.)
4. **Convert the widgets:** each becomes `const request = useFetch('/profile');` plus its rendering. Delete the other two copies of the plumbing entirely.
5. **Check the fix landed everywhere:** Alerts should now show "error: alerts service down" — it inherited the working `.catch` automatically.
6. **Stretch:** the three widgets also share their loading/error *rendering*. Extract a small `StatusLine` component. Notice: repeated stateful logic → custom hook; repeated JSX → component. Two extraction tools, same instinct.

## 6. Understanding the refactored solution

**The hook — the plumbing, once, correct:**

```jsx
function useFetch(path) {
  const [request, setRequest] = useState({ status: 'idle' });

  useEffect(() => {
    let stale = false;
    setRequest({ status: 'loading' });
    api(path)
      .then((data) => { if (!stale) setRequest({ status: 'success', data }); })
      .catch((error) => { if (!stale) setRequest({ status: 'error', error: error.message }); });
    return () => { stale = true; };
  }, [path]);

  return request;
}
```

Everything you learned in 17–20, packaged: status object (20), stale flag + cleanup (19), honest deps (17). `[path]` as a dep means the hook is *navigable* — pass it a different path and it refetches, safely, with old responses discarded. The hook returns the `request` object; callers render it however they like. Fix a bug here once and every consumer — including next week's fourth widget — inherits the fix.

**The widgets — one line of data logic each:**

```jsx
function ProfileWidget() {
  const request = useFetch('/profile');
  if (request.status !== 'success') return <StatusLine request={request} label="profile" />;
  return <div className="widget"><strong>{request.data.name}</strong> — {request.data.role}</div>;
}
```

Read what happened to the component: it now says *what it shows*, not how fetching works. The guard line delegates all non-success states to `StatusLine`.

**StatusLine — deduplicated rendering:**

```jsx
function StatusLine({ request, label }) {
  if (request.status === 'loading') return <div className="widget">loading {label}...</div>;
  if (request.status === 'error') return <div className="widget" style={{ color: '#c33' }}>error: {request.error}</div>;
  return null;
}
```

A plain component (not a hook — it renders, it doesn't hold state). Loading and error looks are now consistent across the dashboard by construction.

**When should you extract a hook?** Same rule as extracting any function: you've written the stateful pattern twice and a third is coming, or a component's effect soup obscures what it displays. The names in this track's next projects mark the reusable seams: `usePersistentState` (23), `useDebouncedValue` (24), `useInterval` (25).

## 7. Words you learned (glossary)

- **Custom hook** — a plain function, named `useX`, that calls hooks inside; extracts reusable stateful logic.
- **`use` prefix** — the convention marking hook-calling functions, for readers and the linter.
- **Rules of Hooks** — hooks must be called unconditionally, at the top level, in the same order every render.
- **Call site** — one specific place a function is called; each hook call site gets its own state.
- **Shares logic, not state** — three `useFetch` callers = three independent requests.
- **Plumbing** — the repeated infrastructure code (here: status + race guard + fetch wiring).
- **Copy-paste drift / forking** — copies of code evolving independently until they disagree.
- **Swallowed error** — a failure caught and then ignored, leaving the app silently stuck.
- **Eternal spinner** — a loading indicator that never resolves because no state transition arrives.
- **Guard line** — an early return handling all-but-the-happy-path (`if (status !== 'success') ...`).
- **Linter** — a tool that flags code mistakes automatically (enforces the Rules of Hooks).
- **Context** — React's tool for actually sharing one state across components (project 41; not this project).

## 8. Experiments to try on the plane (no internet needed)

CDN note (once): first page load pulls React from the internet; the fake API is local. Edit + predict offline; verify when online or if the pages are cached.

1. **Add a fourth widget in the refactor.** `function TeamWidget() { const request = useFetch('/team'); ... }` and render it in App. Prediction: it shows "error: 404" (the fake API doesn't know `/team`) — but notice what you did NOT write: no state, no effect, no stale flag. The plumbing was inherited, error handling included.
2. **Fix the hook once, watch it fix everywhere.** In the refactor's `useFetch`, make errors retry once after a second before giving up. Prediction: Alerts shows loading a beat longer, then errors — and any widget you add later retries too. Now imagine performing that surgery three times in the original, without missing a copy.
3. **Prove state isn't shared.** Render `<ProfileWidget />` twice in the refactor's App. Prediction: two independent profile boxes, two separate requests (add a `console.log` in the hook's effect to count). Logic shared; state per call site.
4. **Make a widget navigable.** Give ProfileWidget a local `useState` for the path and a button toggling `'/profile'` ↔ `'/stats'`, passing it to `useFetch(path)`. Prediction: clicking swaps the data cleanly — `[path]` deps refetch, the stale flag discards the loser. The hook was ready for this before you needed it.
5. **Recreate the original's crime scene.** In the refactor, inline `useFetch`'s body back into two widgets by hand (copy, paste, tweak). Feel how *natural* it is to "simplify" a line you don't fully understand while pasting. That feeling is how the stale flag died in StatsWidget — drift isn't malice, it's entropy.
