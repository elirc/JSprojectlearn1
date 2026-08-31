# 📘 Learning Guide: Refs for Values

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A click-speed test. On screen: a big "CLICK ME FAST" button inside a bordered box, two readouts — "last gap" (milliseconds between your last two clicks) and "best gap" (your fastest ever) — and a render counter at the bottom ("App renders: N") that counts how many times React has redrawn the app.

The game: click as fast as you can and try to beat your best gap. The diagnostic: move your mouse around inside the box *without clicking*. In the original, the render counter explodes by hundreds — the app is redrawing itself once per pixel of mouse movement, for no visible reason. In the refactor, the counter only moves when a number on screen actually changes.

## 2. Concepts you need first

**`useState` and re-renders** — explained fully in project 07's LEARN.md. The one-line reminder that powers this whole lesson: *every* call to a state setter asks React to re-run your component and repaint. That's the point of state — and the cost of it.

**`useRef`** — a React hook that gives you a little box that survives re-renders:

```js
const box = useRef(0);   // box is { current: 0 }
box.current = 42;        // write: changes the box, triggers NOTHING
console.log(box.current); // read: always the latest value
```

Three facts to memorize:
1. The box is an object with one property, `current`.
2. Writing `box.current` causes **no re-render**. React doesn't even notice.
3. The same box is handed back on every render — it's the component's private, durable pocket.

You may have seen `useRef` used to grab a DOM element (project 15). Same hook, different cargo: here the box holds a plain *value*.

**State snapshots vs. refs** — from project 11's LEARN.md: state variables inside a render are frozen snapshots; handlers created in render #1 see render #1's values. Refs opt out of that: `box.current` is not a snapshot, it's the live box — reading it always gives whatever was last written, no matter which render created the reading code.

**`performance.now()`** — a browser stopwatch. Returns the number of milliseconds since the page loaded, with sub-millisecond precision. Subtract two readings and you get an elapsed time:

```js
const start = performance.now();
// ...stuff happens...
const elapsed = performance.now() - start; // e.g. 173.4 ms
```

**`onMouseMove`** — an event that fires as the mouse moves over an element — many times per second, roughly once per pixel. Any work you do in this handler happens *a lot*.

**The sorting rule** (the lesson's core): for every value a component remembers, ask — **"if this value changes, must the screen change?"**
- Yes → `useState` (changing it *should* repaint).
- No → `useRef` (repainting would be pure waste).

**Module-level counter trick** — both files declare `let appRenders = 0;` *outside* the component and do `appRenders++` inside it. Since the component function re-runs on every render, the counter counts renders. It's a debugging gadget, not app state.

## 3. Walking through the original code

The state:

```jsx
const [gap, setGap] = useState(null);
const [bestGap, setBestGap] = useState(null);
```

These two are *displayed* — the two readout lines. State is correct for them. But then:

```jsx
// Mistake 1: a value only read inside handlers — never rendered —
const [lastClickTime, setLastClickTime] = useState(null);
// Mistake 2: mousemove position, also state.
const [mouseX, setMouseX] = useState(0);
```

Search the JSX: neither `lastClickTime` nor `mouseX` appears anywhere in what's drawn. No pixel depends on them. Yet both live in `useState`, so every write to either one re-renders the entire app.

The click handler:

```jsx
function handleClick() {
  const now = performance.now();
  if (lastClickTime !== null) {
    const thisGap = now - lastClickTime;
    setGap(thisGap);
    if (bestGap === null || thisGap < bestGap) setBestGap(thisGap);
  }
  setLastClickTime(now);
}
```

Take the time now; if there was a previous click, the gap is the difference; update the readouts; remember this click's time for next time. Reasonable logic — but `lastClickTime` is read from the render snapshot, which plants a subtle bug we'll get to.

The mouse tracking:

```jsx
<div onMouseMove={(e) => setMouseX(e.clientX)} ...>
```

Every pixel of movement calls a state setter. `e.clientX` is the mouse's horizontal position. Nobody ever reads `mouseX` — but React dutifully re-renders for every single write.

## 4. What's wrong with it (in beginner terms)

**The render storm.** Open the page and lazily circle your mouse inside the box for two seconds. Watch "App renders": 1… 80… 250… 400. Each of those is React re-running your whole component and checking the screen for changes — and finding none, every time, because `mouseX` isn't displayed. It's like repainting your whole house every time someone walks past the window. In this toy app you just see a number climb; in a real app with hundreds of components, this exact pattern (mouse positions, scroll offsets, drag coordinates stored in state) is what makes interfaces feel sticky and laggy.

**The stale-time bug.** Subtler. `setLastClickTime(now)` doesn't change the variable — it schedules a *future* render (project 11's lesson). If you click twice extremely fast, the second click's handler can run before the re-render delivers the new `lastClickTime`, so it computes the gap from the *older* click time. On screen: an occasional nonsense reading — you double-click in 90ms but "last gap" shows 400ms, and your "best" record refuses to update. Values used only inside handlers don't fit the snapshot model; they fight it.

Two different symptoms, one diagnosis: these values aren't *display* data. They're the component's private scratch notes, and they were filed in the wrong drawer.

## 5. Try it yourself first!

Try fixing a copy of `original.html`:

1. For each of the four `useState` calls, apply the sorting question: "does any pixel change when this changes?" Two survive, two don't.
2. The two that fail the test need a home that (a) survives re-renders and (b) doesn't trigger them. There's a hook for exactly this.
3. Convert `lastClickTime`: `const lastClickTime = useRef(null);` — then update every read to `lastClickTime.current` and the write to `lastClickTime.current = now;` (plain assignment — no setter, no snapshot).
4. Convert the mouse handler the same way: `onMouseMove={(e) => { lastMouseX.current = e.clientX; }}`.
5. Check your work: wiggle the mouse — does the render counter hold still? Does clicking still update both readouts?
6. Bonus: while there, make `setBestGap` use the updater form (`setBestGap(best => ...)`) so it reads the freshest best, too.

## 6. Understanding the refactored solution

The sorting rule, applied:

```jsx
// Rendered values -> STATE (changing them should repaint):
const [gap, setGap] = useState(null);
const [bestGap, setBestGap] = useState(null);

// Values used only inside handlers -> REFS.
const lastClickTime = useRef(null);
const lastMouseX = useRef(0);
```

The click handler now reads and writes the box directly:

```jsx
function handleClick() {
  const now = performance.now();
  if (lastClickTime.current !== null) {
    const thisGap = now - lastClickTime.current; // always current
    setGap(thisGap);
    setBestGap((best) => (best === null || thisGap < best ? thisGap : best));
  }
  lastClickTime.current = now; // write: no render, none needed
}
```

Two wins at once. Performance: `lastClickTime.current = now` repaints nothing — and nothing needed repainting. Correctness: `lastClickTime.current` is not a snapshot, so even a hyper-fast double click reads the true previous time — the stale-gap bug is simply gone. Note `setBestGap` uses the updater form (project 11) for the same freshness guarantee on the state side.

The mouse handler:

```jsx
onMouseMove={(e) => { lastMouseX.current = e.clientX; }}
```

Still tracked on every pixel — but now each write is just an assignment into a box. Zero renders. The counter at the bottom only moves when `gap` or `bestGap` — actually displayed numbers — change.

**The discipline that keeps refs safe** (printed on the page): never *read* a ref during render — that is, don't put `something.current` in your JSX. If the screen depends on it, it was state all along, and a ref would leave the display stale. Refs are for the component's *bookkeeping*: timer ids, previous values, "latest callback" boxes (project 25), DOM nodes (project 15). State is what the component *shows*; refs are what it merely *knows*.

## 7. Words you learned (glossary)

- **`useRef`**: hook returning a persistent `{ current }` box; writes don't re-render.
- **Ref**: the box itself — per-component, mutable, surviving every render.
- **`.current`**: the single property where a ref's value lives.
- **Re-render**: React re-running your component function to repaint the screen.
- **Render snapshot**: the frozen values a given render's handlers close over (project 11).
- **Stale read**: reading an old snapshot value after reality has moved on.
- **`performance.now()`**: high-precision millisecond stopwatch in the browser.
- **`onMouseMove` / `e.clientX`**: mouse-motion event / cursor's horizontal position.
- **Imperative value**: one used only in handler logic, never drawn to the screen.
- **Bookkeeping**: a component's private notes (timers, previous values, DOM nodes).
- **Sorting rule**: screen depends on it → state; screen doesn't → ref.

## 8. Experiments to try on the plane (no internet needed)

One-time note: these pages pull React from a CDN, so *running* them requires internet (or a cached earlier load). Reading, editing, and predicting outcomes is fully offline — verify on landing.

1. **Feel the difference**: open both files side by side, wiggle the mouse in each box for three seconds, and compare the render counters. Prediction: original climbs by hundreds; refactor doesn't move until you click.
2. **Break the discipline on purpose**: in the refactor, add `<p>mouse x: {lastMouseX.current}</p>` inside the box's JSX. Prediction: it displays a *stale* number — it only updates when a click happens to cause a render. That frozen readout is exactly why "never read a ref during render" is a rule: a displayed value belongs in state.
3. **Add a click counter — the right way**: first with a ref (`clicks.current++` in `handleClick`, displayed in JSX) — prediction: it lags one render behind, showing the count as of the last repaint. Then move it to `useState` — prediction: always accurate. You just ran the sorting rule in both directions.
4. **Track total mouse distance (ref-worthy!)**: add `const totalDist = useRef(0);` and in `onMouseMove` do `totalDist.current += Math.abs(e.clientX - lastMouseX.current);` before updating `lastMouseX.current`. Log it inside `handleClick` with `console.log`. Prediction: silky-smooth tracking with zero extra renders, and the console shows the accumulated distance on each click — bookkeeping done in the right drawer.
