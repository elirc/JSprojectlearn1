# 🏋️ Practice: Build Your Own Hooks

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Once for this file, and it's the good news: `refactored/index.html` has no dependencies at all, so it runs offline — and because MiniReact is plain JS, you can paste it into a `.js` file and drive it under `node` with a fake container like `{ innerHTML: '' }`. Only `original.html` needs the CDN.)

All exercises modify the `MiniReact` IIFE in `refactored/index.html` unless they say otherwise.

## Exercises

### ⭐ 1. Lazy initial state, for one line (warm-up)

Real React lets you write `useState(() => expensiveThing())` so the expensive thing runs once instead of every render. Try it in MiniReact first — change slot 1 to `useState(() => 'Ada')` and load the page — then fix `useState` so a function initial value is *called* and its result stored. Make sure the call still happens only on the first render.

**Practices:** where "initial value" is honored (exactly one line, on exactly one render) and how `typeof` does the whole job.

**Hint:** the setter already has the `typeof next === 'function'` trick; initialization needs the same question asked once, inside the `if (!(slot in hooks))` branch.

**Expected:** before the fix, the paragraph reads `() => 'Ada' has clicked 0 times` — the function's own source text, because a template literal stringifies whatever you give it (the tab title goes the same way). After the fix it reads `Ada has clicked 0 times`, and a `console.log` inside the initializer prints once no matter how many times you click.

### ⭐⭐ 2. Predict: two setters in one click (core)

Stash the value too (`handles.count = count;`) and add a `#plus2` button. Predict, for each handler below, the number on screen afterwards **and** how many times `CounterApp` runs in total (counting the first render). Then say which prediction React 18 would answer differently, and what it would show instead.

```js
// A:  handles.setCount((c) => c + 1);  handles.setCount((c) => c + 1);
// B:  handles.setCount(handles.count + 1);  handles.setCount(handles.count + 1);
```

**Practices:** synchronous re-rendering vs batching, and why "snapshot" is a React idea rather than a JavaScript one.

**Hint:** in MiniReact, `rerender()` runs *inside* the setter — the whole component re-runs before the setter returns. So what has `handles.count` become by the time line B's second statement is evaluated?

**Expected:** your two numbers, your two render counts, and one sentence naming the React 18 difference — including which of A and B React would give a *smaller* answer to.

### ⭐⭐ 3. Bail out when nothing changed (core)

React skips work when you set state to the value it already has. Add the same bail-out to MiniReact: if the new value is `Object.is`-equal to what the slot already holds, write nothing and don't re-render. It must work for both `set(7)` and `set(c => c)` — so compute the value first, then compare.

**Practices:** the difference between "you set state" and "state changed", which is the whole basis of React's render-skipping.

**Hint:** the updater has to run before you can compare, so restructure `setState` into: compute `value`, compare, maybe store, maybe redraw.

**Expected:** clicking "rename" twice in a row still flips Ada→Grace→Ada as before; but a button calling `setName('Ada')` while the name is already Ada leaves the tab title and the page untouched, and a `console.log` in the component body prints nothing.

### ⭐⭐ 4. The dependency check, sabotaged (core)

A teammate replaces the deps comparison with plain `!==`:

```js
const changed = !previous || !deps || deps.some((d, i) => d !== previous.deps[i]);
```

It passes every casual test. Find the two values where it goes wrong — one makes an unchanged dep look changed *every render*, the other makes a real change look unchanged — then prove both in Node with a component whose effect increments a counter.

**Practices:** why React specified `Object.is` and not `===`, demonstrated rather than recited.

**Hint:** two famous oddities of `===`: one value that isn't equal to itself, and two values that are equal but shouldn't be treated as the same. `Object.is` reverses both verdicts.

**Expected:** with `deps: [NaN]`, the `!==` version runs the effect on every render (3 runs after two state changes) while the `Object.is` version runs it once; with a dep going `0` → `-0`, the `!==` version never re-runs (1 run) while the `Object.is` version does (2 runs).

### ⭐⭐⭐ 5. Effects after the paint, not during it (challenge)

Real React runs effects *after* the DOM is updated; MiniReact runs them in the middle of the component call, before `container.innerHTML` is even assigned. Prove it: make the effect read `container.innerHTML` and see it lag a render behind. Then fix it — collect the effects that need to run into a queue during the component call, and run the queue after the DOM write and `bindEvents`.

**Practices:** the render/commit split — the reason `useEffect` may touch the DOM and a component body may not.

**Hint:** push a closure into a `pending` array instead of running it, and drain that array at the end of `render`. Copy the array to a local and clear `pending` before draining, so an effect that calls `setState` can't corrupt the list it's being run from.

**Expected:** before the fix the effect sees `''` on the first render and the *previous* HTML afterwards; after it, the effect always sees the HTML that's on screen right now. Cleanup ordering is unchanged: `run 0`, `cleanup 0`, `run 1`, `cleanup 1`, `run 2`.

### ⭐⭐⭐ 6. Two counters, two hooks arrays (challenge)

MiniReact can host exactly one component, because `hooks` and `cursor` are single variables in the closure — render two counters and the second one reads the first one's state. Fix it: give every root its own `{ hooks, cursor }`, and let the hooks find "the root currently rendering" through one module-level pointer that `render` sets and restores. Prove it with two independent counters in two containers.

**Practices:** the last piece of the mystery — how React knows *whose* state slot 0 is, which is what a fiber is for.

**Hint:** `useState` should read the pointer once (`const root = current;`) and let the returned setter close over `root`, not over `current` — a click happens long after rendering has finished, when the pointer is null again.

**Expected:** clicking counter A moves only A; both keep their own counts across each other's re-renders; and calling `useState` from outside a render now throws, which is precisely the error real React gives you for calling a hook outside a component.

## Solutions

### 1. Lazy initial state, for one line

```js
function useState(initialValue) {
  const slot = cursor++;
  if (!(slot in hooks)) {
    hooks[slot] = typeof initialValue === 'function' ? initialValue() : initialValue;
  }
  // ...setState unchanged...
}
```

**Why:** the `in` check is already the "first render only" gate, so putting the `typeof` test inside it gives you exactly React's contract: the initializer runs once and is ignored forever after. Before the fix the function itself sat in the slot — no error, just a function being stringified into your HTML, which is the flavor of failure you get when a slot holds "whatever you passed". The cost of this feature is a known React wart you now understand from the inside: you can no longer store a function *as* state directly, because the slot can't tell your value from an initializer — you'd write `useState(() => myFn)`.

### 2. Predict: two setters in one click

**A (updater form): screen shows 2; `CounterApp` runs 3 times** (1 initial + 2). The first setter writes `hooks[0] = 1` and calls `rerender()` — a complete re-render, synchronously, before the setter returns. The second setter's updater then reads `hooks[0]`, which is already 1, and writes 2.

**B (direct form): screen shows 2; `CounterApp` runs 3 times** — the same answer, for a suspicious reason. `handles.count` is re-stashed during the re-render that happened inside the first setter, so the second statement reads the *new* 1 rather than the value from the render the click started in.

**React 18 answers B differently: it shows 1, with one re-render.** In a real component, `count` is a `const` captured in that render's closure — a snapshot — so `setCount(count + 1)` twice is `setCount(1)` twice, and updates in an event handler are batched into a single render. A stays 2 in React, because updaters receive the pending value rather than the snapshot.

**Why:** MiniReact reaches the right answer for B by cheating twice: it re-renders synchronously and it reads a live mutable global instead of a per-render snapshot. That's why the fixes for stale-closure bugs (project 11) are invisible here — there are no snapshots to be stale. Worth noticing too: `container.innerHTML = html` runs inside the first setter, destroying the very button you clicked; the handler keeps running because it's already on the call stack, and `bindEvents` wires a fresh button afterwards.

### 3. Bail out when nothing changed

```js
const setState = (next) => {
  const value = typeof next === 'function' ? next(hooks[slot]) : next;
  if (Object.is(value, hooks[slot])) return;   // nothing changed: no redraw
  hooks[slot] = value;
  rerender();
};
```

**Why:** "set" and "changed" are different events, and only the second one needs a redraw — which is why a reducer returning `state` unchanged (project 49's blank-todo rule) costs nothing. The updater must be called *before* the comparison, since `set(c => c)` is only discoverable as a no-op once you've run it. `Object.is` rather than `===` is deliberate and is exactly the choice exercise 4 puts under the microscope; real React additionally reserves the right to render one more time before settling down, so treat the bail-out as an optimization, never as a guarantee your component won't re-run.

### 4. The dependency check, sabotaged

```js
// node harness: paste the MiniReact IIFE above this, then:
const { useState, useEffect, render } = MiniReact;
const container = { innerHTML: '' };            // a fake DOM node is enough
let effectRuns = 0;
const handles = {};

function App() {
  const [tick, setTick] = useState(0);
  handles.setTick = setTick;
  useEffect(() => { effectRuns++; }, [NaN]);   // an unchanging dep
  return `${tick}`;
}
render(App, container);
handles.setTick(1);
handles.setTick(2);
console.log(effectRuns);   // Object.is: 1   |   !==: 3
```

Swap the effect's deps for `[z]` where `z` starts at `0` and a click sets it to `-0`, and the verdicts flip: `Object.is` re-runs (2 total), `!==` doesn't (1 total).

**Why:** `NaN !== NaN` is `true`, so a dep that never changes looks changed on every single render — the effect fires forever, and if it set state you'd have an infinite loop. In the other direction `0 === -0` is `true`, so a genuine change slips past unnoticed. `Object.is` is `===` with exactly these two verdicts corrected, which is why React specifies it for dependency arrays, `useState` bail-outs, and `React.memo`'s prop comparison alike. Both bugs are invisible until the day your dep is a computed number — parsing `''` gives `NaN`, and dividing by a negative gives `-0`.

### 5. Effects after the paint, not during it

```js
let pending = [];

function useEffect(effect, deps) {
  const slot = cursor++;
  const previous = hooks[slot];
  const changed =
    !previous || !deps || deps.some((d, i) => !Object.is(d, previous.deps[i]));
  if (!changed) return;
  pending.push(() => {                       // queue it; don't run it yet
    if (previous && previous.cleanup) previous.cleanup();
    hooks[slot] = { deps, cleanup: effect() || null };
  });
}

function render(component, container) {
  rerender = () => render(component, container);
  cursor = 0;
  pending = [];
  const html = component();                  // "render phase": no DOM yet
  container.innerHTML = html;                // "commit phase"
  if (component.bindEvents) component.bindEvents(container);
  const queued = pending;                    // drain from a private copy
  pending = [];
  queued.forEach((run) => run());            // effects, after the DOM is real
}
```

**Why:** the closure captures `slot`, `previous`, `effect`, and `deps` at call time, so deferring the work changes *when* it runs without changing *what* it sees — and cleanup still runs immediately before the re-run, in call order. Splitting `render` into "compute the HTML" and "commit, then run effects" is the render/commit distinction React is built around, and it's what makes `useEffect` the legal place to measure or focus a DOM node while the component body is not. Draining a copy matters because an effect may call `setState`, which re-enters `render` synchronously here and would otherwise reset the very array being iterated.

### 6. Two counters, two hooks arrays

```js
const MiniReact = (() => {
  let current = null;                      // the root currently rendering

  function useState(initialValue) {
    const root = current;                  // captured now; setters click later
    const slot = root.cursor++;
    if (!(slot in root.hooks)) {
      root.hooks[slot] =
        typeof initialValue === 'function' ? initialValue() : initialValue;
    }
    const setState = (next) => {
      const value = typeof next === 'function' ? next(root.hooks[slot]) : next;
      if (Object.is(value, root.hooks[slot])) return;
      root.hooks[slot] = value;
      root.render();
    };
    return [root.hooks[slot], setState];
  }

  // useEffect changes the same way: const root = current; then root.hooks[slot].

  function createRoot(component, container) {
    const root = { hooks: [], cursor: 0, render: null };
    root.render = () => {
      const parent = current;
      current = root;                      // "I am rendering now"
      root.cursor = 0;
      const html = component();
      container.innerHTML = html;
      if (component.bindEvents) component.bindEvents(container);
      current = parent;                    // restore, don't just null it
    };
    root.render();
    return root;
  }

  return { useState, useEffect, createRoot };
})();
```

**Why:** the cursor was never the limitation — the *single* hooks array was. Moving `hooks` and `cursor` onto a per-root object and pointing at "who's rendering" with one module-level variable is, in miniature, what React's fiber tree plus its hook dispatcher do: the pointer is set on entry and restored on exit, so nesting works. The load-bearing subtlety is `const root = current` at the top of each hook: a click arrives long after rendering finished, when `current` is null again, so the setter must have captured its root rather than looked it up. And you get React's famous error for free — call a hook outside a render and `current` is null, so `root.cursor` throws, which is exactly the class of mistake the Rules of Hooks exist to prevent.
