# 📘 Learning Guide: useMemo (Project 27)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A tiny "prime explorer" page. On screen you see:

- A slider labeled "limit". Drag it and the app counts how many prime numbers exist below that limit (a prime is a whole number bigger than 1 that only divides evenly by 1 and itself — 2, 3, 5, 7, 11...).
- A line of text like "17,984 primes (computed in 240ms this render)".
- A notes box where you can type anything you want.

The slider and the notes box have nothing to do with each other. But in the original version, typing in the notes box feels sticky and slow — every single keystroke freezes the page for a fraction of a second. The refactored version types smoothly. This project is about *why*.

## 2. Concepts you need first

### Re-render: React runs your component function again

A React component is just a function that returns what the screen should look like. When state changes, React calls that function again from the top. That whole second (third, fourth...) run is called a **re-render**.

```jsx
function App() {
  const [count, setCount] = useState(0);
  console.log('rendering!'); // prints EVERY time count changes
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

Click the button 5 times → "rendering!" prints 5 more times. Everything written in the body of the function runs again each time. That is the key fact of this whole project.

### Deriving values in render

"Deriving" means computing a value from state instead of storing it. This is normally the *right* thing to do:

```jsx
function Cart({ items }) {
  const total = items.reduce((sum, i) => sum + i.price, 0); // derived
  return <p>Total: {total}</p>;
}
```

`total` is recomputed every render. For a small list that costs nothing. The trouble starts when the computation is genuinely slow.

### Expensive computation

"Expensive" just means "takes a noticeable amount of time" — say more than a few milliseconds. Counting primes up to 200,000 with a naive loop takes hundreds of milliseconds. If that happens during a render, the browser cannot paint the screen until it finishes, so the page freezes for that long. Your keystroke doesn't appear until the math is done. That freeze is what "janky typing" feels like.

### Caching (memoization)

**Caching** means saving the answer to a question so you don't have to work it out again. **Memoization** is caching applied to function results: "if I'm asked the same question with the same inputs, return the saved answer."

```js
let lastLimit = null, lastAnswer = null;
function cachedCount(limit) {
  if (limit === lastLimit) return lastAnswer; // same question? saved answer
  lastLimit = limit;
  lastAnswer = countPrimesUpTo(limit);        // new question? do the work
  return lastAnswer;
}
```

### useMemo: React's built-in one-slot cache

`useMemo` is a React hook (a special function whose name starts with `use` that you call inside a component). It does exactly what the hand-rolled cache above does:

```jsx
const primeCount = useMemo(() => countPrimesUpTo(limit), [limit]);
```

Read it as: "Give me the result of this function. Only re-run it when something in the list `[limit]` has changed since last render. Otherwise, hand back the answer from last time."

- First argument: a function that computes the value.
- Second argument: the **dependency array** (often just "deps") — the list of values the computation reads. If none of them changed, React skips the work and reuses the cached result.

It stores only the *latest* answer (a "one-slot cache"). Change `limit` from 100 to 200 and back to 100, and it recomputes at 100 — the old answer for 100 is gone.

### Honest dependency arrays

The deps array must list *everything* the computed function reads from your component. If the function reads `limit` but you write `[]`, React will never recompute — you'll show a stale (out-of-date) answer forever. A lying deps array trades slowness for wrongness, which is worse.

### Basics assumed

`useState`, JSX, and components are used but not the lesson here — the short version: `useState` gives a component a memory slot plus a function to update it, and updating triggers a re-render. If those feel shaky, revisit the early projects in this track first.

## 3. Walking through the original code

The file starts by loading React from the internet (see section 8's note) and then defines the slow function:

```jsx
function countPrimesUpTo(limit) {
  let count = 0;
  for (let n = 2; n <= limit; n++) {
    let isPrime = true;
    for (let f = 2; f * f <= n; f++) {
      if (n % f === 0) { isPrime = false; break; }
    }
```

Two nested loops: for every number up to `limit`, try dividing it by every candidate factor. Deliberately naive so it takes hundreds of milliseconds. It's plain JavaScript — no React in it.

```jsx
const [limit, setLimit] = useState(200000);
const [notes, setNotes] = useState('');
```

Two independent pieces of state: the slider's number and the notes text. Changing *either one* re-renders `App`.

```jsx
const started = performance.now();
const primeCount = countPrimesUpTo(limit);
const tookMs = (performance.now() - started).toFixed(0);
```

Here is the whole story. `performance.now()` is a browser stopwatch (milliseconds since the page loaded). The code times the prime count and displays how long it took. Because these three lines sit in the component body, they run on **every render** — including renders where only `notes` changed.

```jsx
<textarea rows="3" cols="50" value={notes}
          onChange={(e) => setNotes(e.target.value)} />
```

A controlled textarea: its display always equals the `notes` state, and every keystroke calls `setNotes`, which triggers a re-render... which re-runs the prime count.

## 4. What's wrong with it (in beginner terms)

Here is the on-screen story. You click into the notes box and type "hello". After pressing "h", nothing happens for a beat — the letter appears late. Same for "e", "l", "l", "o". Typing a sentence feels like typing through mud.

Why? Every keystroke:

1. calls `setNotes` → React re-renders `App` (correct — the notes changed and the screen must update),
2. the render re-runs `countPrimesUpTo(200000)` (waste — `limit` didn't change, the answer is identical),
3. the browser can't show your letter until that ~200ms of math finishes.

The README's phrase "correct pattern, wrong economics" means: deriving `primeCount` in render is the normal, good habit. It's only a problem because *this particular* derivation is so slow that innocent bystanders (the keyboard) pay for it.

Note what is *not* wrong: nothing crashes, nothing shows wrong data. This is purely a performance bug — the sneakiest kind, because the app "works".

## 5. Try it yourself first!

Try to fix `original.html` before peeking at the refactor.

1. **Vague hint:** the prime count only needs to be recomputed when one specific thing changes. What thing?
2. **Warmer:** you want the answer from the *previous* render whenever `limit` is the same. React has a hook whose whole job is "reuse last render's result unless these inputs changed."
3. **Specific:** wrap the call in `useMemo`. Its second argument is an array of everything the computation reads.
4. **Check yourself:** after your fix, typing in notes should be instant, and dragging the slider should still update the count (if the count stops updating, your deps array is lying).

## 6. Understanding the refactored solution

The core change is three lines:

```jsx
const primeCount = useMemo(() => {
  setTimeout(() => setComputeCount((c) => c + 1), 0); // count real runs
  return countPrimesUpTo(limit);
}, [limit]);
```

- The heavy work now lives inside `useMemo`. When you type in notes, React re-renders, reaches this line, sees `limit` is the same as last render, and returns the cached count — the loops never run. When you move the slider, `limit` differs, so it recomputes. Exactly the behavior we wanted, one hook.
- `[limit]` is honest: the function reads `limit` and nothing else that changes.
- The `setTimeout(... , 0)` line is instrumentation — a visible proof. It bumps a `computeCount` state each time the expensive function *actually* runs, and the page displays "computed N times total". Type a paragraph: N doesn't move. Nudge the slider: N goes up by one. (It uses `setTimeout` to schedule the state update for just *after* the render, because calling `setState` directly in the middle of rendering is not allowed. The `(c) => c + 1` form is an "updater function" — it says "whatever the count currently is, add one".)
- Why a counter instead of trusting your fingers? Because feelings lie about performance; counters don't. When you optimize, put a number on screen.

The refactor also teaches the **anti-lesson**: do NOT wrap everything in `useMemo`. Memoizing `items.filter(...)` over 20 rows saves microseconds and costs you a deps array to maintain plus a pause for every future reader. The workflow: derive plainly by default → notice something actually slow → memoize only that.

One preview: `useMemo` has a second job that has nothing to do with speed — keeping an object's *identity* stable so other optimizations work. That's project 30's story.

## 7. Words you learned (glossary)

- **Render / re-render:** React calling your component function to (re)compute what the screen should show.
- **Derived value:** a value computed from state during render, not stored separately.
- **Expensive computation:** work slow enough to visibly delay the screen.
- **Cache:** a saved copy of a previous answer, kept to avoid redoing work.
- **Memoization:** caching a function's result, keyed by its inputs.
- **useMemo:** React hook that recomputes a value only when its dependencies change; otherwise returns the cached result.
- **Dependency array (deps):** the list of values a hook watches to decide whether to re-run.
- **Stale value:** an out-of-date value shown because something failed to recompute.
- **Updater function:** the `setX(prev => ...)` form of a state setter — computes the new value from the previous one.
- **Instrumentation:** adding visible measurements (counters, timers) so you can *see* behavior instead of guessing.
- **`performance.now()`:** a browser stopwatch, in milliseconds — used here to time the computation.
- **Jank:** visible stutter when the browser can't repaint fast enough.

## 8. Experiments to try on the plane (no internet needed)

Heads-up (applies to all these guides, said once here): the HTML pages load React from a CDN — a content delivery network, i.e., someone else's server on the internet — so actually *running* the pages needs a connection at least once so your browser can fetch and cache React. On the plane you can still read and edit the code, predict outcomes, and verify later. If you opened the pages before flying, your browser may have them cached and they might still run.

1. **Break the deps on purpose.** In the refactor, change `[limit]` to `[]`. Prediction: typing stays fast, but moving the slider no longer changes the prime count — a stale answer forever. This is what a lying deps array does.
2. **Over-memoize.** Wrap something trivial, e.g. `const label = useMemo(() => 'primes', [])`. Prediction: no visible difference at all — proof that memoizing cheap things buys nothing (and costs readability).
3. **Shrink the cost.** In the original, change the starting limit from `200000` to `2000`. Prediction: typing feels fine even without `useMemo`, because the derivation became cheap — showing the problem was never "deriving in render", only the price.
4. **Watch the counter.** In the refactor, drag the slider to the same value twice via keyboard (arrow key right, then left, then right). Prediction: each real change of `limit` recomputes — the cache is one slot deep, so returning to an old value still recomputes.
