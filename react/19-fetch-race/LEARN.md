# 📘 Learning Guide: Fetch Races

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

A search box. You type a query; the app asks a (fake) search server and shows the results underneath. Two labeled lines make everything visible: "box says:" (what you typed) and "results say:" (what the server returned).

The demo's fake server has a twist: **shorter queries are slower** (searching for "c" scans more data than "cat" — realistic!). In the original, type "cat" quickly and wait a second: the box says "cat", but the results settle on... results for "c". Wrong, stale, and stuck. In the refactor, the results always match the box, no matter how the responses arrive.

## 2. Concepts you need first

### Asynchronous code and out-of-order arrival

*Asynchronous* (async) means "starts now, finishes later, other code runs in between." A server request is async: you fire it, the page keeps living, the response lands whenever it lands. The crucial fact this project drills:

**Responses do not arrive in the order you sent the requests.**

Send request A, then B. If A is slow and B is fast, B's answer arrives first — and A's answer arrives *last*, even though it's the *oldest*. Nothing enforces ordering. Ever.

### Race conditions

A *race condition* is a bug where the outcome depends on timing — on who happens to finish first. The classic UI version: several async responses all write to the same state, and whichever lands last wins, regardless of which is correct. Race bugs are nasty because they're intermittent: on fast networks you may never see them; on a train's flaky wifi, constantly.

### Promises and fake servers

A quick refresher (fuller version in project 17's LEARN.md): a Promise is an IOU for a future value; `.then(fn)` runs `fn` when it pays out. This project's fake server:

```js
function searchApi(query) {
  const delay = Math.max(200, 1200 - query.length * 300);
  return new Promise((resolve) =>
    setTimeout(() => resolve(`results for "${query}"`), delay));
}
```

`Math.max(200, ...)` means "at least 200". So: "c" takes ~900ms, "ca" ~600ms, "cat" ~300ms. Shorter query, slower answer — a guaranteed, reproducible race.

### Effects with deps + cleanup

From projects 17 and 18: `useEffect(fn, [query])` runs `fn` after the first render and again whenever `query` changes, and if `fn` returns a function, React calls that *cleanup* before each re-run and at unmount. One more detail matters enormously here — **the order**: when `query` changes, React first runs the **old** run's cleanup, *then* the new run's setup. Old world closes before new world opens.

### Each effect run has its own private variables (closures, used for good)

Every time the effect runs, its function body executes fresh — so `let stale = false` inside the effect creates a **new, separate variable per run**. The `.then` handler and the cleanup from run #1 both see run #1's `stale`; run #2's see run #2's. In project 11, this "each render captures its own snapshot" behavior caused bugs. Here it *is the fix*: it gives every request a private flag that its own cleanup can raise.

```js
useEffect(() => {
  let stale = false;                 // private to THIS run
  doAsync().then(() => { if (!stale) /* still current */ ; });
  return () => { stale = true; };    // raised when this run's world ends
}, [dep]);
```

### Controlled inputs (one-liner)

`<input value={query} onChange={(e) => setQuery(e.target.value)} />` — the input displays state, and typing updates state. Each keystroke = one state change = one render = one effect re-run. So typing "cat" fires the effect three times: for "c", "ca", "cat".

## 3. Walking through the original code

**State:**

```jsx
const [query, setQuery] = useState('');
const [results, setResults] = useState('');
```

What you typed, and what the server said. Both rendered, side by side, so lies are visible.

**The effect — almost right:**

```jsx
useEffect(() => {
  if (query === '') { setResults(''); return; }
  searchApi(query).then((r) => setResults(r));
}, [query]);
```

Empty query → clear results and stop (a guard clause). Otherwise: fire the request; when it resolves, write the results. The deps are honest (`[query]`). There's no timer to clean up. It *looks* finished.

The file's comment spells out the timeline for typing "cat" fast:

```text
"c"   -> fires, resolves in ~900ms
"ca"  -> fires, resolves in ~600ms
"cat" -> fires, resolves in ~300ms  <- shows first!
```

Then "ca" lands and overwrites it. Then "c" lands — last — and overwrites *that*. Final screen: box says "cat", results say `results for "c"`. Nothing in the code says "only the latest request may write," so **last to arrive wins**, and last is often stalest.

## 4. What's wrong with it (in beginner terms)

Watch it happen on screen: type "cat" briskly and stop. For a moment the right results flash up (the "cat" request was fastest). Then they *change* — twice — ending on results for "c". The UI actively replaces a correct answer with a wrong one while you watch. And then it stays wrong forever, because no more state changes are coming.

Why this is sneaky:

1. **Everything you've learned so far checks out.** Deps: correct. No leak: there's no interval. The bug lives in a gap none of the previous lessons covered: *multiple responses in flight, one state variable*.
2. **It's timing-dependent.** With a fast, uniform API you might demo this a hundred times and never see it. Users on slow connections see it daily. "Works on my machine" bugs are exactly this shape.
3. **Every search box ships it once.** Autocomplete, tab-switching detail views, filter panels — any "user changes input faster than responses return" flow has this bug until someone adds the guard.

## 5. Try it yourself first!

1. **Vague hint:** you can't make responses arrive in order (you don't control the network). So the fix must happen at *arrival* time: when an old response lands, something should recognize it's old and refuse to use it.
2. **What does "old" mean here?** A response is old if the query has *changed since that request was sent*. What runs exactly when the query changes and the old effect's world ends? (Project 18 taught it — and you thought it was just for timers.)
3. **Concrete plan:** inside the effect, declare `let stale = false`. In the `.then`, only call `setResults` if `!stale`. Return a cleanup that sets `stale = true`.
4. **Convince yourself it works:** trace typing "ca" then "t". Effect run for "ca" starts, flag A false. You type "t": React runs run-"ca"'s cleanup (flag A → true), starts run "cat" (flag B false). "cat" response lands → flag B false → writes. "ca" response lands → flag A true → discarded. Draw this on paper — it's the whole lesson.

## 6. Understanding the refactored solution

The diff is three lines:

```jsx
useEffect(() => {
  if (query === '') { setResults(''); return; }

  let stale = false;

  searchApi(query).then((r) => {
    if (!stale) setResults(r);
  });

  return () => { stale = true; };
}, [query]);
```

**Why it works — the three moving parts:**

1. **One flag per run.** `let stale` is created fresh each effect run, so each request gets a private "am I still current?" marker (closure capture doing the isolating).
2. **Cleanup runs before the next setup.** The instant `query` changes, the *previous* run's cleanup flips the *previous* run's flag. From that moment, the old response — still in flight, can't be un-sent — is pre-doomed: when it lands, its `if (!stale)` fails and it's silently dropped.
3. **Only the newest run's flag is still false**, so only the newest response can write. "Last to arrive wins" becomes "latest to be *asked for* wins."

On screen after the fix: type "cat" fast — results for "cat" appear, then... nothing changes. The "ca" and "c" responses still arrive (watch the network of your imagination), find their flags raised, and vanish. Box and results agree forever.

**The bigger idea about cleanup:** project 18 framed cleanup as "stop what you started" (timers, listeners). This project reveals the general form: cleanup is the **"this render's world is over"** signal. You can't cancel a sent request, but you can refuse to honor its answer — and cleanup is exactly the moment to arrange that refusal.

**The production upgrade (noted in the code):** with the real `fetch()` browser API, use `AbortController`: create one in the effect, pass `controller.signal` to `fetch`, and cleanup becomes `return () => controller.abort()`. Same shape — but it *actually cancels* the network transfer (saving bandwidth), and the aborted fetch rejects with an `AbortError` you can catch and ignore.

## 7. Words you learned (glossary)

- **Asynchronous (async)** — starts now, finishes later; other code runs in between.
- **Race condition** — a bug whose outcome depends on which async operation happens to finish first.
- **In flight** — sent but not yet answered.
- **Stale response** — an answer to a question you're no longer asking.
- **Stale flag** — a per-run boolean, flipped by cleanup, checked before writing state.
- **Last-write-wins** — whoever finishes last overwrites state; the default (broken) behavior.
- **Closure capture** — each effect run's inner functions see that run's own variables.
- **Cleanup-before-rerun** — React runs the previous effect's cleanup before the next setup.
- **Guard clause** — early return handling a special case (`if (query === '') ... return;`).
- **Controlled input** — an input whose displayed value is React state.
- **`AbortController`** — browser object for cancelling fetches; `.abort()` triggers it.
- **`AbortError`** — the error a cancelled fetch rejects with.
- **Intermittent bug** — one that only appears under certain timing; the hardest kind to catch.

## 8. Experiments to try on the plane (no internet needed)

CDN note (once): first page load fetches React from the internet; the fake search API is local. Offline, make the edit and write your prediction; verify later or with a cached page.

1. **Make the race worse.** In `original.html`, change the delay formula to `Math.max(200, 3000 - query.length * 900)`. Prediction: the wrong-results takeover becomes slower and more theatrical — you can watch "cat" → "ca" → "c" replace each other one by one.
2. **Log the discards.** In the refactor's `.then`, add `else console.log('discarded response for', query)` (make the `if` a full if/else). Prediction: type "cat" fast; the console logs discards for "c" and "ca" — proof the slow responses arrived and were turned away.
3. **Break it again, minimally.** In the refactor, delete only the `return () => { stale = true; };` line. Prediction: the flag exists but nobody ever raises it — the bug returns exactly as before. The flag and the cleanup only work as a pair.
4. **Flip the timing.** Make *longer* queries slower: `200 + query.length * 300`. Prediction: the original now mostly *looks* fine when typing forward (old responses arrive before new ones)... but backspacing from "cat" to "c" recreates the race in reverse. Timing bugs hide, they don't heal.
5. **Reuse the pattern.** In project 17's refactored user viewer, add the stale flag to its fetch effect (it doesn't have one!). Prediction: no visible change with two fast buttons — but you've just upgraded it to project-20-grade code, where the flag ships as standard equipment.
