# 🏋️ Practice: useMemo

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

(One note for the whole file: writing and predicting is fully offline; running the page needs the CDN or a warm cache — verify after landing.)

## Exercises

### ⭐ 1. Predict the compute counter (warm-up)

Using `refactored/index.html` unmodified, predict the final "computed N times" number after this exact session: page loads → you type `hi` in notes (2 keystrokes) → you drag the slider from 200,000 to 400,000 (one change) → you type `there` (5 keystrokes) → you drag the slider to 150,000. Also state how many times `App` *rendered* (count every state change, including the instrumentation counter's own updates).

*Practices:* separating "component rendered" from "memo recomputed".
*Hint:* the memo re-runs only when `[limit]` differs from last render; `setComputeCount` causes renders of its own.
*Expected:* your two numbers match the solution's.

### ⭐⭐ 2. A second memoized derivation (core)

Add a readout "largest prime ≤ limit: 199,999-ish" next to the count. Write `largestPrimeUpTo(limit)` (walk down from `limit` until a prime is found) and memoize it separately with its own `useMemo`.

*Practices:* multiple independent memos in one component, each with honest deps.
*Hint:* reuse the trial-division idea from `countPrimesUpTo` for an `isPrime(n)` helper.
*Expected:* typing in notes recomputes neither memo; moving the slider updates both readouts.

### ⭐⭐ 3. Fix the inverted deps (planted bug) (core)

Someone "fixed" the memo like this: `useMemo(() => countPrimesUpTo(limit), [notes])`. Before touching the code, write down the *two* distinct symptoms a user would see. Then fix it.

*Practices:* diagnosing a wrong-deps memo from on-screen behavior.
*Hint:* one symptom is about speed, the other about correctness.
*Expected:* your symptom list matches the solution; after fixing, typing is instant and the slider updates the count.

### ⭐⭐ 4. Prime range (core)

Add a second slider `start` (min 0, max 100,000, step 10,000, initial 0) and change the readout to count primes **between `start` and `limit`**. Modify the counting function to take both bounds and keep the memo honest.

*Practices:* deps arrays with two inputs — everything the computation reads goes in.
*Hint:* the deps array grows to exactly two entries; forgetting either one leaves one slider dead.
*Expected:* moving *either* slider bumps "computed N times" by one and updates the count; typing never does.

### ⭐⭐⭐ 5. Write `memoLast` in plain JavaScript (challenge)

No React at all — write a generic one-slot memoizer you can run in node:

```js
function memoLast(fn) { /* your code */ }
const slow = (a, b) => { calls++; return a + b; };
const fast = memoLast(slow);
```

`fast(1, 2)` computes; `fast(1, 2)` again returns the cache without calling `slow`; `fast(1, 3)` computes; `fast(1, 2)` computes *again* (one slot!). Compare arguments with `Object.is`, and don't treat a first call with no args as a cache hit.

*Practices:* the exact machine `useMemo` is, minus React — deps are just "arguments as cache key".
*Hint:* store the last `args` array and last result; hit = same length and every position `Object.is`-equal.
*Expected:* with a `calls` counter, the sequence above logs calls = 1, 1, 2, 3.

### ⭐⭐⭐ 6. Honest timing display (challenge)

The refactor dropped the original's "computed in Xms" display. Re-add it so it shows the duration of the **last real compute** — it must *not* change (or lie) on renders where the memo was skipped. Keep it to the one existing `useMemo`.

*Practices:* memoizing an object that bundles a value with its metadata.
*Hint:* time the work *inside* the memo callback and return `{ count, ms }` together.
*Expected:* typing leaves both the prime count and the ms figure frozen; moving the slider updates both at once.

## Solutions

### 1. Predict the compute counter

**Computed 3 times** (initial at 200,000; slider → 400,000; slider → 150,000). Typing never recomputes: the memo sees `limit` unchanged and returns the cache. Renders of `App`: 1 initial + 2 keystrokes + 1 slider + 5 keystrokes + 1 slider = 10 from user input, **plus 3 more** from `setComputeCount` firing after each real compute — 13 total.

**Why:** renders and recomputes are different currencies. The whole point of `useMemo` is that the 13 renders only paid for the prime loops 3 times; the instrumentation counter itself causes extra cheap renders, which is a fair price for a visible receipt.

### 2. A second memoized derivation

```jsx
function isPrime(n) {
  if (n < 2) return false;
  for (let f = 2; f * f <= n; f++) if (n % f === 0) return false;
  return true;
}
function largestPrimeUpTo(limit) {
  for (let n = limit; n >= 2; n--) if (isPrime(n)) return n;
  return null;
}
// in App:
const largestPrime = useMemo(() => largestPrimeUpTo(limit), [limit]);
// JSX: <p>largest prime ≤ limit: {largestPrime === null ? '—' : largestPrime.toLocaleString()}</p>
```

**Why:** each memo is its own one-slot cache; both key on `[limit]`, so a notes render skips both and a slider render re-runs both. Walking down from `limit` is fast (prime gaps are tiny), but the memo still documents *what this value depends on* — and keeps the pattern consistent.

### 3. Fix the inverted deps

Symptoms: **(1)** typing in notes is janky again — every keystroke changes `notes`, so the memo recomputes the primes on exactly the renders that should skip it; **(2)** moving the slider shows a **stale count** — `limit` isn't in the deps, so the memo returns the old answer until your next keystroke "unsticks" it. Fix:

```jsx
const primeCount = useMemo(() => countPrimesUpTo(limit), [limit]);
```

**Why:** the deps array is the cache key. Keying on the wrong input gives you the worst of both worlds — recompute when nothing relevant changed, reuse when the relevant thing did. The honesty rule ("list everything the callback reads, nothing else") prevents both symptoms at once.

### 4. Prime range

```jsx
function countPrimesBetween(start, limit) {
  let count = 0;
  for (let n = Math.max(2, start); n <= limit; n++) {
    let isP = true;
    for (let f = 2; f * f <= n; f++) if (n % f === 0) { isP = false; break; }
    if (isP) count++;
  }
  return count;
}
// in App:
const [start, setStart] = useState(0);
const primeCount = useMemo(() => {
  setTimeout(() => setComputeCount((c) => c + 1), 0);
  return countPrimesBetween(start, limit);
}, [start, limit]);
// JSX (next to the limit slider):
<p>start: {start.toLocaleString()}
  <input type="range" min="0" max="100000" step="10000"
         value={start} onChange={(e) => setStart(Number(e.target.value))} /></p>
```

**Why:** the callback now reads two component values, so both belong in the deps — `[start, limit]`. Leave out `start` and that slider moves the number on its label but never the count (stale); leave out `limit` and the original bug returns. Deps mirror reads, mechanically.

### 5. `memoLast`

```js
function memoLast(fn) {
  let lastArgs = null, lastResult;
  return function (...args) {
    if (lastArgs !== null && lastArgs.length === args.length &&
        args.every((a, i) => Object.is(a, lastArgs[i]))) {
      return lastResult;               // hit: same question, saved answer
    }
    lastArgs = args;                   // miss: do the work, remember it
    lastResult = fn(...args);
    return lastResult;
  };
}
```

Trace: `fast(1,2)` miss → calls=1; `fast(1,2)` hit → calls=1; `fast(1,3)` miss → calls=2; `fast(1,2)` miss again → calls=3.

**Why:** this is `useMemo` stripped bare — one slot, keyed by `Object.is` over the inputs, exactly like React comparing a deps array against last render's. The `lastArgs !== null` guard keeps a legitimate first call from ever looking like a hit, and re-asking an *older* question misses because the single slot was overwritten.

### 6. Honest timing display

```jsx
const primes = useMemo(() => {
  setTimeout(() => setComputeCount((c) => c + 1), 0);
  const started = performance.now();
  const count = countPrimesUpTo(limit);
  return { count, ms: (performance.now() - started).toFixed(0) };
}, [limit]);
// JSX:
<p>{primes.count.toLocaleString()} primes
   (last compute took {primes.ms}ms · computed {computeCount} times)</p>
```

**Why:** timing *outside* the memo would measure every render — mostly cache hits taking ~0ms — and overwrite the interesting number. Inside the callback, the stopwatch runs only when the work does, and bundling `{ count, ms }` into one memoized object means skipped renders hand back the *same object*, count and timing frozen together. (That reference stability is also `useMemo`'s second job — project 30's story.)
