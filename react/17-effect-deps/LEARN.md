# 📘 Learning Guide: Effect Dependencies

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

A tiny "user viewer": two buttons ("user 1", "user 2") and a line showing the loaded user's name. Clicking a button loads that user from a (fake) server and displays "User #1" or "User #2". Below that, a counter shows how many server requests the page has made.

In the original, that counter **climbs forever** — hundreds of requests to display one unchanging user. In the refactor it's exactly one request per button click. The entire difference is one small array.

## 2. Concepts you need first

This is the track's first `useEffect` project, so we build it up from zero.

### Side effects

React wants your component function to be a pure calculation: state in, JSX out. Anything *else* it does — contacting a server, starting a timer, changing the browser tab title — is called a *side effect* (or just "effect"): work that touches the world outside the component.

### `useEffect` — run code after rendering

`useEffect` lets you say: "after you've drawn the screen, run this function."

```jsx
useEffect(() => {
  document.title = 'Hello!';   // runs AFTER the render is on screen
});
```

Why "after"? So the effect can't interfere with the drawing itself. Render stays a pure calculation; effects happen once the calculation is committed.

### The dependency array — WHEN should the effect run?

`useEffect` takes a second argument: an array of values, called the *dependency array* (or "deps"). It answers exactly one question — after which renders should this effect run again?

```jsx
useEffect(() => { ... });            // no array: run after EVERY render
useEffect(() => { ... }, []);        // empty array: run ONCE, after the first render
useEffect(() => { ... }, [userId]);  // run after the first render, then again
                                     // whenever userId has CHANGED
```

React compares the array's values with last render's values. Same values → skip the effect. Different → run it. That's the whole mechanism. The three options above are the three options; this project is a demo of choosing wrong twice and right once.

### Promises and `.then`

A *Promise* is JavaScript's IOU: an object representing a value that will arrive later (like a server response). `.then(fn)` registers what to do when it arrives:

```js
fetchUser(1).then((user) => {
  console.log(user.name); // runs later, when the fake server responds
});
```

The code doesn't wait — it continues past this line immediately, and `fn` fires when the data lands (here, ~300ms later).

### `setTimeout`

`setTimeout(fn, ms)` runs `fn` once after `ms` milliseconds. This project uses it to fake a slow server:

```js
function fetchUser(id) {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ id, name: `User #${id}` }), 300));
}
```

Read it as: return an IOU that pays out a user object 300ms from now. (This fake also lets the demo run without a real network.)

### The feedback loop that creates the storm

Chain these facts together:

1. An effect with no deps array runs after *every* render.
2. Calling `setUser(...)` causes a render.
3. So: render → effect runs → fetch resolves → `setUser` → render → effect runs → fetch → `setUser` → render → ... forever.

That's the infinite loop, in slow motion (each lap takes 300ms, so the page still works — it just quietly hammers the server).

### Basics assumed here

`useState`, event handlers, ternaries — projects 14–16's LEARN.md files cover them.

## 3. Walking through the original code

**The fake API with a built-in counter:**

```jsx
let requestCount = 0;
function fetchUser(id) {
  requestCount++;
  return new Promise((resolve) =>
    setTimeout(() => resolve({ id, name: `User #${id}`, requestCount }), 300),
  );
}
```

Every call bumps a global counter and returns a promise that resolves ~300ms later. The counter rides along in the response so the page can display it — this is the instrument that makes the bug visible.

**The state:**

```jsx
const [userId, setUserId] = useState(1);
const [user, setUser] = useState(null);
```

`userId` = which user we *want*. `user` = the loaded data (starts as `null`, meaning "nothing yet"). Two buttons call `setUserId(1)` / `setUserId(2)`.

**The effect — note what's missing:**

```jsx
useEffect(() => {
  fetchUser(userId).then((u) => setUser(u));
});
```

No second argument at all. This says "after every render, fetch the user and store it." But storing it *causes* a render. Perpetual motion machine.

**The display:**

```jsx
<p>{user ? user.name : 'loading...'}</p>
<p style={{ color: '#c33' }}>
  total requests: {user ? user.requestCount : 0} (and climbing ...
```

A ternary: show the name if loaded, else "loading...". The request count is shown in red, climbing about three times per second, forever.

A comment in the file also describes **Bug B**, the opposite mistake: writing `[]` (run once). Then clicking "user 2" changes `userId`, the component re-renders, but the effect never runs again — the screen shows User #1 forever.

## 4. What's wrong with it (in beginner terms)

**Bug A — the storm (no array).** What you see: open the page, and the "total requests" number just keeps counting up — 10, 50, 200 — while the display shows the same "User #1" the whole time. Each cycle: an effect fetches, the response updates state, the update re-renders, the re-render re-runs the effect. Nobody wrote a loop; the loop emerges from "run after every render" plus "this effect causes renders." On a real backend this is a self-inflicted denial-of-service: your own page flooding your own server.

**Bug B — frozen (empty array, described in the comment).** What you'd see: page loads, "User #1" appears, one request — great. Click "user 2": the button visually works, `userId` is now 2... and the name never changes. The one effect run captured `userId = 1` and was told never to care again. No error anywhere; the app is just silently wrong.

Beginners bounce between these two — add the array to stop the storm, get frozen data, remove it, storm again — as long as they treat the array as a magic incantation. The cure is the question in the next section.

## 5. Try it yourself first!

1. **Vague hint:** the fix is punctuation-sized. The question to ask: *this effect keeps `user` synchronized with... what?* When that thing changes, the effect should re-run. When nothing changed, it shouldn't.
2. **More specific:** the effect reads exactly one value from the component: `userId`. What belongs in the deps array?
3. **Verify like a scientist:** after your fix, reload. Prediction: 1 request. Click "user 2": 2 requests. Click "user 2" again: does a *re-render with the same userId* refetch? (It shouldn't — same value in the array → effect skipped.)
4. **Stretch:** deliberately produce Bug B by writing `[]`, and watch the buttons stop working. Feel the difference between "run when userId changes" and "run once."

## 6. Understanding the refactored solution

The only code change is the array:

```jsx
useEffect(() => {
  fetchUser(userId).then((u) => setUser(u));
}, [userId]);
```

Read it as a sentence: **"keep `user` synchronized with `userId`."** The second half of the sentence *is* the deps array. The refactor's comment lays out the three-option table:

- no array → run after every render → sync storm (Bug A)
- `[]` → run once, never re-sync → frozen (Bug B)
- `[userId]` → re-sync exactly when the thing you sync with changes → correct

**The honest rule.** Every value from the component (state, props, anything computed from them) that the effect *reads* belongs in the array. Real projects enforce this with a lint rule (an automatic code checker) called `exhaustive-deps` — turn it on and believe it. And when the honest array makes the effect run more often than you'd like, the fix is never to lie in the array — it's to restructure the code: use updater functions so the effect doesn't need to read state (project 11's lesson), hold latest values in refs (project 25), or realize the effect shouldn't exist at all (project 21).

**Honest scope note** (printed on the refactored page too): this fetch effect is still missing two pieces of standard equipment — cleanup (project 18) and race protection (project 19). One lesson at a time; by project 20 the full pattern is assembled.

## 7. Words you learned (glossary)

- **Side effect / effect** — work a component does beyond computing JSX (server calls, timers, titles).
- **`useEffect`** — the hook that runs a function after render.
- **Dependency array (deps)** — `useEffect`'s second argument; lists the values whose *change* re-triggers the effect.
- **`[]` (empty deps)** — "run once after the first render, never again."
- **No deps argument** — "run after every render."
- **Promise** — an object representing a value that arrives later.
- **`.then(fn)`** — schedules `fn` for when the promise's value arrives.
- **`resolve`** — the promise's "here's your value" trigger.
- **`setTimeout(fn, ms)`** — run `fn` once, `ms` milliseconds from now.
- **Infinite effect loop** — effect updates state → re-render → effect runs again → repeat.
- **Fetch storm** — that loop applied to network requests.
- **Stale / frozen effect** — an effect that never re-runs, working from outdated values.
- **Synchronize** — keep one thing matching another; the verb every effect should be describable with.
- **Lint rule** — an automated checker for code mistakes (`exhaustive-deps` checks deps arrays).
- **DoS (denial of service)** — overwhelming a server with requests; here, self-inflicted.

## 8. Experiments to try on the plane (no internet needed)

One-time note: the pages load React itself from a CDN, so first load needs internet — the fake API inside needs none. Edit offline, predict, run later (or with cached pages).

1. **Create Bug B on purpose.** In `refactored/index.html`, change `[userId]` to `[]`. Prediction: one request ever; the user-2 button re-renders the page but the name stays "User #1".
2. **Add a second dependency.** Add a `const [suffix, setSuffix] = useState('')` plus a button that sets it to `'!'`, and make the effect log `userId + suffix`. Keep deps `[userId]`. Prediction: clicking the suffix button re-renders but does NOT re-run the effect — you now have a *quietly stale* effect, the kind `exhaustive-deps` would flag. Then add `suffix` to the array and watch it re-run.
3. **Watch the skip happen.** In the refactor, click "user 1" repeatedly. Prediction: request count doesn't move — `userId` was already 1, `setUserId(1)` changes nothing, and even the re-render (if any) finds the same deps and skips the effect.
4. **Slow the storm down.** In `original.html`, change the fake delay from 300 to 2000. Prediction: the counter still climbs forever, just slower — proving the loop is structural, not a timing fluke.
5. **Say the sentence.** For each effect you've written in your own code (or in projects 18–25 as you read on): fill in "keep ___ synchronized with ___." If the second blank is empty, the deps are `[]`. If you can't fill the first blank, the effect probably shouldn't exist — that's project 21.
