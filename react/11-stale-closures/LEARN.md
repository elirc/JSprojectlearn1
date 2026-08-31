# 📘 Learning Guide: Stale Closures

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A ticker. On screen: a heading ("Ticker"), one big number, and a "+3" button. The number is supposed to count up by itself, once per second, forever — like a stopwatch. The button is supposed to add 3 in one click.

In the original, the counter goes 0 → 1 and then freezes for eternity, and the "+3" button only adds 1. Both bugs come from the same misunderstanding, which is the real subject of this project.

## 2. Concepts you need first

**`useState`** — explained fully in project 07's LEARN.md.

**Closures** — when you create a function inside another function, the inner one "remembers" the variables around it at the time it was created. That memory is called a closure:

```js
function makeGreeter() {
  const name = 'Ada';                 // local variable...
  return () => console.log('Hi ' + name); // ...captured by this function
}
const greet = makeGreeter();
greet(); // "Hi Ada" — still remembers name, long after makeGreeter finished
```

Closures are normally a superpower. This project shows how they bite.

**`setInterval` and `clearInterval`** — browser built-ins for repeating work. `setInterval(fn, 1000)` says "run `fn` every 1000 milliseconds" and returns an id number; `clearInterval(id)` stops it:

```js
const id = setInterval(() => console.log('tick'), 1000);
// later:
clearInterval(id); // silence
```

**`useEffect` with cleanup** — `useEffect(fn, deps)` runs `fn` after render (see project 09's LEARN.md for the dependency array). New here: if `fn` *returns a function*, React runs that returned function to clean up before re-running the effect and when the component goes away. Perfect for stopping intervals:

```js
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id); // the cleanup
}, []); // empty array: set up once, clean up at the very end
```

An **empty dependency array** (`[]`) means "run this effect only once, after the first render."

**The big one — a render is a snapshot.** Every time React renders, it calls your component function again, top to bottom. Each call gets its *own* copy of every variable. If `count` is 0 during render #1, then every function created during render #1 (handlers, interval callbacks) closed over *that* 0. When render #2 happens with `count` = 1, brand-new functions are created that see 1 — but any *old* function still alive (like an interval callback from render #1) keeps seeing 0 forever. A captured value that's fallen behind reality is called **stale**.

**Setters don't change the local variable.** Calling `setCount(5)` does NOT make `count` become 5 on the next line. It schedules a future render where `count` *starts as* 5. Inside the currently running function, `count` never moves:

```js
// suppose count is 0 here
setCount(count + 1);
console.log(count); // still 0! The new value arrives next render.
```

**The updater form.** Both setter styles exist for a reason. `setCount(7)` = "make it 7." `setCount(current => current + 1)` = "whatever it is *at update time*, add 1." With the function form, React hands you the live value — no captured variable involved, so nothing can be stale.

**Batching** — when several setter calls happen in one event, React groups them into a single re-render. Not a bug, just good to know it exists.

## 3. Walking through the original code

One state slot:

```jsx
const [count, setCount] = useState(0);
```

Then the ticker:

```jsx
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1);
  }, 1000);
  return () => clearInterval(id);
}, []); // <- empty deps: effect runs once, closure frozen once
```

Read it in time-order. First render: `count` is 0. The effect runs once (empty deps). It creates the interval callback `() => setCount(count + 1)` — and that arrow function *closes over this render's `count`*, which is 0. That one function is now installed in the browser's interval machinery and will be called every second, forever, still holding its captured 0. So every single tick computes `setCount(0 + 1)`. Tick one: display becomes 1. Tick two: "set it to 1" again — no change. Frozen.

```jsx
function plusThree() {
  setCount(count + 1);
  setCount(count + 1);
  setCount(count + 1);
}
```

Suppose `count` is 5 when you click. All three lines read the *same* snapshot value 5 (remember: `setCount` doesn't move the local variable). So React is told: "make it 6", "make it 6", "make it 6". One increment. React batches the three into one render, but batching isn't the culprit — three identical instructions are.

The JSX shows the number in an `<h2>` and wires the button.

## 4. What's wrong with it (in beginner terms)

**The frozen ticker.** Open the page. The number flips to 1 after a second… and then just sits there. It *feels* like the interval died, but add a `console.log` inside the callback and you'd see it firing dutifully every second — each time asking React to "set count to 1", which after the first time is a no-op. The worker isn't dead; it's reading a year-old sticky note.

**The lying button.** The button says "+3". Click it: the number goes up by exactly 1. Three requests were made; all three said "6". A user (or a teammate) would swear the code loops wrong — but the loop is fine; the *reads* are stale.

**Why the tempting fix is a trap.** "Just put `count` in the dependency array!" That does make it tick: each render tears down the old interval and starts a fresh one that captured the new count. But now you're destroying and recreating a timer every single second — wasteful, and the timing subtly drifts (each re-created interval restarts its one-second wait). Working-but-janky is not the lesson's answer.

## 5. Try it yourself first!

Try to fix both bugs in a copy of `original.html`:

1. Both bugs share one root cause: some code reads `count` from an old snapshot. Can you avoid reading `count` at all?
2. The setter has a second calling style. Instead of handing it a *value*, hand it a *function*.
3. For the ticker: rewrite the interval body so it never mentions the outer `count` variable. If the effect uses no outside values, its empty `[]` deps become honestly correct.
4. For the button: apply the same change to all three lines. Each updater will receive the result of the previous one.
5. Check your understanding: with your fix, what three numbers does React compute when you click "+3" at count 5? (Should be 6, 7, 8.)

## 6. Understanding the refactored solution

The ticker:

```jsx
useEffect(() => {
  const id = setInterval(() => {
    setCount((current) => current + 1);
  }, 1000);
  return () => clearInterval(id);
}, []);
```

The callback no longer contains `count` at all. When the tick fires, React calls `(current) => current + 1` handing in the value *right now* — 0 the first tick, 1 the second, 41 the forty-second. Nothing was captured, so nothing can go stale. And the empty `[]` is now truthful: the effect genuinely uses zero values from the render, so it never needs to re-run. One interval, created once, ticking forever.

The button:

```jsx
function plusThree() {
  setCount((current) => current + 1);
  setCount((current) => current + 1);
  setCount((current) => current + 1);
}
```

React queues the three updaters and runs them in order, feeding each one the previous result: 5 → 6 → 7 → 8. Three real increments, one render.

The page ends with the mental model to memorize, and it's worth repeating here: **a render is a snapshot.** Every variable in the component body is frozen at that render's value; handlers and effects created then live inside that frozen world. So there are two questions with two answers:

- Need to *display* current state? Read the snapshot — that's exactly what it's for.
- Need to *compute the next state from the current one*? Never read the snapshot — use `set(current => next)` and let React deliver the live value.

Rule of thumb: any time you catch yourself typing `set(x + 1)`, `set([...x, item])`, or `set({...x, k: v})` — next-state-built-from-current-state — switch to the updater form on reflex.

## 7. Words you learned (glossary)

- **Closure**: a function's memory of the variables that surrounded it when it was created.
- **Stale closure**: a closure whose captured values have fallen behind the current state.
- **Snapshot**: the frozen set of values (props, state, consts) belonging to one render.
- **`setInterval` / `clearInterval`**: browser functions to start/stop repeating a callback.
- **Effect cleanup**: the function an effect returns; React runs it before re-running the effect or unmounting.
- **Empty dependency array (`[]`)**: run the effect once, after the first render only.
- **Updater form**: `set(current => next)` — React calls your function with the live state at update time.
- **Batching**: React merging several setter calls from one event into a single re-render.
- **Scheduling**: setters don't change variables now; they request a future render.
- **Unmount**: a component being removed from the screen.

## 8. Experiments to try on the plane (no internet needed)

Note once: these pages load React from a CDN, so *running* them requires internet (or a browser-cached copy). Reading, editing, and predicting are fully offline — verify predictions after landing.

1. **Watch the stale value live**: in `original.html`, add `console.log('tick sees', count)` inside the interval callback. Prediction: the console prints `tick sees 0` every second, forever — proof the callback still holds the first render's snapshot.
2. **Try the "deps fix"**: change the original's effect deps from `[]` to `[count]`. Prediction: the ticker works — and if you also log `'new interval'` at the top of the effect, you'll see a new interval created every second. Working, but churning.
3. **Mix the button**: in the refactor, make `plusThree` do `setCount(count + 1)` then two updater-form lines. Prediction from a count of 5: value-form says "make it 6", then updaters chain 6 → 7 → 8… final answer 8? Careful — the value form *replaces*, so 6, then +1, +1 = 8. Now swap the order (updaters first, value-form last) and predict again: the last line stomps everything to 6.
4. **Make a "+10" button**: add a button whose handler calls the updater form ten times, or better, once with `setCount(c => c + 10)`. Prediction: both add exactly 10 — but the single call is one queued function instead of ten.
