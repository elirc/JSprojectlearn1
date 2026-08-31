# 🏋️ Practice: Fetch Races

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Do the math of the race (warm-up)

Using the refactor's real formula — `delay = Math.max(200, 1200 - query.length * 300)` — compute the delay for `"c"`, `"ca"`, and `"cat"`. Assume all three requests fire at (roughly) time 0 because you typed fast. Write down the order the responses *arrive*, and therefore the sequence of result lines the **original** would display, one replacing the next.

**Practices:** seeing that arrival order is delay order, not request order.
**Hint:** shorter query, bigger delay — that's the demo's realistic inversion.
**Expected:** three delays in ms, an arrival order, and the original's final (wrong) on-screen line — check against the solution.

### ⭐⭐ 2. A stale-safe "searching..." indicator (core)

Add a `pending` state so the results line shows `searching...` while a request is in flight. The subtlety: the discard rule applies to *pending* too — an old response must not clear the spinner that a newer request owns. Wire everything inside the existing effect.

**Practices:** letting the stale flag guard every state write a response makes, not just the results.
**Hint:** `setPending(true)` when the effect fires a request; `setPending(false)` only inside `if (!stale)`.
**Expected:** type "cat" fast: `searching...` shows once, then the "cat" results — the spinner never flickers back on when the slow "c"/"ca" responses arrive and are discarded; backspacing to empty shows `(none)` with no spinner.

### ⭐⭐ 3. The shared flag that un-fixes the fix (core)

A learner hoisted the flag out of the effect "so every run can share it":

```jsx
let stale = false;   // module scope now!
function App() {
  // ...
  useEffect(() => {
    if (query === '') { setResults(''); return; }
    stale = false;
    searchApi(query).then((r) => { if (!stale) setResults(r); });
    return () => { stale = true; };
  }, [query]);
```

Trace typing "ca" quickly and show the race is back. Then explain, in terms of closures, why the original refactor's per-run `let stale` was the entire fix.

**Practices:** why one flag per effect run — closure privacy as a correctness tool.
**Hint:** what does the *new* effect run do to the flag the *old* response is about to check?
**Expected:** a written trace naming the exact line that re-arms the old response; typing "ca" fast in this version can end with "c" results under a "ca" box.

### ⭐⭐ 4. Predict: the ghost results (core)

The user types `"c"` at t=0, then backspaces to empty at t≈100ms, and waits. Using the delay formula, predict what the results line shows over time in the **refactor**, and what it would show in the **original** — including the final state of each at t=1000ms.

**Practices:** predicting renders from the cleanup-then-effect sequence, including the empty-query branch.
**Hint:** when `query` becomes `''`, the previous run's cleanup fires first; the new run clears results and starts nothing.
**Expected:** two timelines (refactor and original) with the t=1000ms end state of each; check against the solution.

### ⭐⭐⭐ 5. Latest-wins by ticket number (challenge)

Reimplement the guarantee without any cleanup function: a module-level counter hands each effect run a ticket (`const myId = ++requestSeq`), and a response may write only if its ticket is still the newest. Then compare honestly: what does the stale-flag version handle that this one doesn't?

**Practices:** an alternative latest-request-wins mechanism, and its trade-off.
**Hint:** the check is `myId === requestSeq`; each run's `myId` is private to its closure — same snapshot mechanics as the flag.
**Expected:** typing "cat" fast behaves exactly like the refactor (results always match the box); your written trade-off names the situation this version gets wrong.

## Solutions

### 1. Do the math of the race

Delays: `"c"` → 900ms, `"ca"` → 600ms, `"cat"` → 300ms. Arrival order: **cat (300), ca (600), c (900)** — the exact reverse of request order. The original displays: `results for "cat" (took 300ms)`, replaced at 600ms by the "ca" line, replaced at 900ms by `results for "c" (took 900ms)` — which is the final, wrong answer under a box that says "cat".

**Why:** nothing in the original ties a response to the query it answers; each `.then` writes unconditionally, so *last to arrive wins*. The arithmetic makes the invariant visible: whenever an older request is slower than a newer one, the wrong write happens after the right one.

### 2. A stale-safe "searching..." indicator

```jsx
const [pending, setPending] = useState(false);

useEffect(() => {
  if (query === '') { setResults(''); setPending(false); return; }
  let stale = false;
  setPending(true);
  searchApi(query).then((r) => {
    if (!stale) {
      setResults(r);
      setPending(false);
    }
  });
  return () => { stale = true; };
}, [query]);

// display:
<p><strong>results say:</strong> {pending ? 'searching...' : (results || '(none)')}</p>
```

**Why:** `pending` is written in two places, and both are safe: the effect body runs only for the *current* query, and the response side sits behind `if (!stale)`, so an expired response can neither write results nor touch the spinner. Had `setPending(false)` sat outside the guard, the discarded "c" response would kill the spinner while "cat" was still in flight — a subtle lie. One flag guards *all* writes a response makes; that's the checklist rule.

### 3. The shared flag that un-fixes the fix

Trace, typing "ca" fast: effect("c") sets `stale = false`, fires the 900ms request. Keystroke: cleanup("c") sets `stale = true` — so far so good — then effect("ca") runs **`stale = false`**, re-arming the flag, and fires the 600ms request. At 600ms the "ca" response checks `!stale` → writes (fine). At 900ms the "c" response checks the *same shared* `stale` → still `false` → writes. Final screen: "c" results under a "ca" box. The re-arming line is `stale = false` in the new run.

**Why:** the fix depended on each run having a *private* flag — the old response must check the flag that *its own* cleanup raised, not whatever the newest run set. Per-run `let stale` inside the effect gets that privacy for free from closure capture: each effect run closes over its own variable (project 11's "closures capture their render," working as the fix). One shared variable collapses all runs into one world, and the race returns.

### 4. Predict: the ghost results

**Refactor:** t=0: effect("c") fires (900ms). t≈100: cleanup("c") sets its flag stale; effect("") runs `setResults('')` and starts nothing. Screen: `(none)`. t=900: the "c" response lands, finds its flag raised, is discarded. Final at t=1000: **`(none)`** — box empty, results empty, consistent. **Original:** same requests, but no expiry — at t=900 the "c" response writes, and the final state is **`results for "c" (took 900ms)` under an empty box**: ghost results for a query the user deleted.

**Why:** the empty-query branch needs no cleanup of its own because it starts nothing — but the *previous* run's cleanup still fires on the transition, which is what expires the in-flight "c". The original's ghost is the same one-liner bug as before; the backspace-to-empty path just makes it look spookiest.

### 5. Latest-wins by ticket number

```jsx
let requestSeq = 0;

useEffect(() => {
  if (query === '') { setResults(''); return; }
  const myId = ++requestSeq;
  searchApi(query).then((r) => {
    if (myId === requestSeq) setResults(r);
  });
}, [query]);
```

**Why it works:** every run increments the shared counter and keeps its own ticket in a per-run `const` (closure privacy again — this part *must* be per-run, like the flag). An old response's ticket can never equal the counter once a newer run has incremented it, so only the newest request may write. **The trade-off:** with no cleanup, unmounting the component doesn't expire anything — if `App` unmounts while its newest request is in flight, `myId === requestSeq` still holds and the response calls `setResults` on a dead component (React warns). The stale-flag version handles that for free, because unmount runs cleanup too. That's why the cleanup-based pattern is the house style.
