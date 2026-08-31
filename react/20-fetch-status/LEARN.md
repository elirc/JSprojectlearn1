# 📘 Learning Guide: Fetch Status

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

A "report viewer": three buttons — report 2, report 3, report 4 — and a display area. Click a button and the app fetches that report from a fake server. Even-numbered reports load fine ("Report #2: all systems nominal"); odd-numbered ones fail ("Report #3 not found"). So we can trigger successes and failures on demand.

In the original, click 3 (fails), then 4 (succeeds): the screen shows the **error message AND the fresh data at the same time**. Click 3 again: stale data + error + "Loading..." — three contradictory statements at once. The refactor shows exactly one thing at every moment, because its state can only *say* one thing at a time.

## 2. Concepts you need first

### `.catch` — handling promise failures

Promises (project 17's LEARN.md) can also *fail*. A server might reject your request. `.then` handles success; `.catch` handles failure:

```js
fetchReport(3)
  .then((data) => console.log('got', data))
  .catch((error) => console.log('failed:', error.message));
```

The fake API in this project uses `reject(new Error(...))` for odd ids — `reject` is `resolve`'s evil twin, and whatever it's given arrives at `.catch`. An `Error` object carries a `.message` string.

### The four states of a request

Any fetch, ever, is in exactly one of these:

- **idle** — haven't asked yet
- **loading** — asked, waiting
- **success** — answer arrived (we have `data`)
- **error** — it failed (we have `error`)

One request, one state at a time. That's the ground truth this project is about *representing honestly*.

### The boolean-flags trap (and why it's project 16 again)

The common way to track a request is three separate state variables:

```jsx
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);
const [data, setData] = useState(null);
```

Three variables ≈ 2×2×2 = 8 representable combinations for a thing with 4 real states. The extra 4 are contradictions: "loading AND errored", "data AND error", etc. Project 16 showed this exact disease with wizard screens; here it wears its most popular costume. The cost is concrete: **on every transition you must remember to reset every flag you're not setting** (`setError(null)` when starting to load, `setData(null)` on failure...). Miss one reset and a leftover value from the *previous* request keeps rendering.

### The status-object pattern (discriminated union)

The fix: **one** state variable — an object with a `status` field naming which of the four states we're in, with `data` or `error` riding along only when they exist:

```js
{ status: 'idle' }
{ status: 'loading' }
{ status: 'success', data: '...' }
{ status: 'error', error: '...' }
```

This shape has a fancy name — a *discriminated union*: a set of object shapes distinguished (discriminated) by one tag field. (In the TypeScript track, the compiler can even enforce that `error` only exists when `status === 'error'`.) The everyday superpower: transitions **replace the whole object** — `setRequest({ status: 'success', data })` — so leftovers from the previous state can't survive. There are no reset lines because there is nothing to reset.

### `switch` statements

A `switch` picks one branch based on a value — cleaner than an if/else chain when comparing one thing against several options:

```js
switch (status) {
  case 'loading': return 'wait...';
  case 'error':   return 'oops';
  case 'success': return 'here you go';
}
```

Each `case` is one possible value; `return` exits immediately. One state in, one view out.

### The stale flag (from project 19)

`let stale = false` + cleanup `stale = true` + `if (!stale)` before writing: the race guard, explained fully in project 19's LEARN.md. From this project on, it ships in every fetch effect as standard equipment.

## 3. Walking through the original code

**The fake API — failures on demand:**

```jsx
function fetchReport(id) {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      if (id % 2 === 0) resolve(`Report #${id}: all systems nominal`);
      else reject(new Error(`Report #${id} not found`));
    }, 600));
}
```

`id % 2 === 0` means "even" (`%` is remainder). Even → success after 600ms; odd → failure after 600ms.

**The trio, and the forgotten resets:**

```jsx
useEffect(() => {
  setIsLoading(true);
  // forgot: setError(null). Remember this line.
  fetchReport(reportId)
    .then((d) => { setData(d); setIsLoading(false); })
    .catch((e) => { setError(e.message); setIsLoading(false); });
    // forgot: setData(null) on error, too.
}, [reportId]);
```

When a new fetch starts, `error` keeps whatever it had. When a fetch fails, `data` keeps whatever it had. The comments mark the two forgotten reset lines — the code's own confession.

**Rendering — three independent gates:**

```jsx
{isLoading && <p>Loading...</p>}
{error && <p style={{ color: 'red' }}>Error: {error}</p>}
{data && <p>{data}</p>}
```

Three `&&` blocks that don't know about each other. Any subset can be true simultaneously — and will be.

## 4. What's wrong with it (in beginner terms)

Walk the exact demo sequence and watch the screen lie:

1. **Click "report 3" (fails).** After 600ms: "Error: Report #3 not found." Fine so far.
2. **Click "report 4" (succeeds).** During the load you see "Loading..." *and* the old error together (the error was never cleared). Then data arrives: now the screen shows the red error **and** "Report #4: all systems nominal", side by side. Which is true? The user can't tell.
3. **Click "report 3" again.** For 600 ms the screen shows all three: stale "Report #4" data, the old error, and "Loading...". Three contradictory statements from one small component.

Root cause, stated plainly: with separate flags, correctness depends on every handler remembering to reset every *other* flag on every transition. That's not a typo you made — it's homework the structure assigns you forever, and almost every hand-rolled fetch flunks it somewhere. (The original here also has no stale flag, so it has project 19's race bug too — click quickly between buttons and slow responses can land out of order.)

## 5. Try it yourself first!

1. **Vague hint:** count the real states of a request (four). Count what your state variables can express (eight). The fix is making those numbers match — project 16 did the same for wizard screens.
2. **Patch-it-first exercise:** add the two missing reset lines (`setError(null)` before fetching; `setData(null)` in the catch). It works! Now notice how fragile it feels — every future transition needs its own remembered resets. That feeling is the lesson.
3. **The real fix:** replace all three `useState`s with one: `useState({ status: 'idle' })`. On load start: `setRequest({ status: 'loading' })`. On success: `{ status: 'success', data }`. On failure: `{ status: 'error', error: e.message }`. Whole object every time — never patch a field.
4. **Rendering:** replace the three `&&` gates with one `switch (request.status)` that returns exactly one element per case. A separate little `RequestView` component keeps it tidy.
5. **Don't forget project 19:** add the stale flag while you're in there.

## 6. Understanding the refactored solution

**One state, four shapes:**

```jsx
const [request, setRequest] = useState({ status: 'idle' });
```

**The effect — wholesale transitions plus the race guard:**

```jsx
useEffect(() => {
  let stale = false;
  setRequest({ status: 'loading' });

  fetchReport(reportId)
    .then((data) => { if (!stale) setRequest({ status: 'success', data }); })
    .catch((error) => { if (!stale) setRequest({ status: 'error', error: error.message }); });

  return () => { stale = true; };
}, [reportId]);
```

Read the transitions: idle/whatever → `{loading}` → `{success, data}` or `{error, error}`. Every `setRequest` hands over a **complete new object**. The old error can't linger next to new data because the old *object is gone* — nothing was patched field-by-field. Zero reset lines, because resetting is what replacement does for free. The stale flag (project 19) makes rapid button-clicking safe: only the latest request's response may write.

**Rendering — a switch, not flag algebra:**

```jsx
function RequestView({ request }) {
  switch (request.status) {
    case 'idle':    return <p>Pick a report.</p>;
    case 'loading': return <p>Loading...</p>;
    case 'error':   return <p style={{ color: 'red' }}>Error: {request.error}</p>;
    case 'success': return <p>{request.data}</p>;
  }
}
```

One status in, exactly one element out. Contradictory screens aren't avoided — they're *unrenderable*. Note `RequestView` is a plain component taking `request` as a prop: the display logic became reusable and testable on its own.

**The pattern's third appearance:** orders in the JS track, wizard screens in project 16, requests here. Whenever you catch yourself declaring `isX`/`isY` flags about the same underlying thing, stop and name the thing's states instead. Loading states are simply the version of this mistake that everyone actually ships.

## 7. Words you learned (glossary)

- **`.catch(fn)`** — runs `fn` when a promise fails.
- **`reject`** — the promise's failure trigger (counterpart of `resolve`).
- **`Error` object** — JavaScript's standard failure value; `.message` is its text.
- **`%` (remainder/modulo)** — remainder after division; `id % 2 === 0` tests evenness.
- **Request states** — idle / loading / success / error; exactly one at a time.
- **Boolean flags trap** — several independent flags representing one multi-state fact.
- **Status object** — one object whose `status` field names the current state.
- **Discriminated union** — object shapes distinguished by a tag field like `status`.
- **Wholesale replacement** — setting state to a complete new object rather than patching fields.
- **Reset lines** — the `setX(null)` calls flag-based code must remember; replacement eliminates them.
- **`switch` / `case`** — multi-way branch on one value.
- **Stale flag** — project 19's race guard; standard equipment in fetch effects from now on.
- **Transition** — moving from one state to another (loading → success).

## 8. Experiments to try on the plane (no internet needed)

CDN note (once): pages fetch React from the internet on first load; the fake report API is local. Edit and predict offline; run when connected or if cached.

1. **Reproduce the original's worst screen.** In `original.html`: click 3, wait, click 4, wait, click 3, and screenshot (mentally) the moment all three messages show. Prediction: stale data + error + Loading, simultaneously — 600ms of triple contradiction.
2. **Patch the original with reset lines.** Add `setError(null); setData(null);` at the top of the effect. Prediction: the contradictions disappear... and you've written 2 extra lines that every future maintainer must preserve. Compare with the refactor's zero.
3. **Sabotage the refactor (you can't, really).** Try to make the refactor show data and error together *without* adding new state. Prediction: you can't — `RequestView` renders one case, and `request` holds one status. You'd have to deliberately rebuild the flag structure to get the bug back.
4. **Add a fifth state.** Give the refactor a `retrying` status: in `.catch`, first `setRequest({ status: 'retrying' })`, wait 1s via `setTimeout`, then retry once before declaring error. Add a `case 'retrying'`. Prediction: failures show "retrying...", then the final error. Notice how adding a state = one shape + one case, no flag audit.
5. **Show stale data during reload (deliberately).** Change the loading transition to `setRequest((prev) => ({ status: 'loading', data: prev.data }))` and render `request.data` faintly in the loading case if present. Prediction: switching reports keeps the old report visible, dimmed, until the new one lands — the "stale-while-revalidate" UX, now a *choice* encoded in one place instead of an accident of leftover flags.
