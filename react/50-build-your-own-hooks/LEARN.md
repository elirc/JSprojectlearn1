# 📘 Learning Guide: Build Your Own Hooks

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

Two pages, two very different demos.

`original.html` is a deliberately broken React app: a page titled "Rules of Hooks, broken live" with a name display, a count, a "count++" button, and a "toggle name" button. Click count++ twice, then "toggle name" — the app crashes, and the browser console shows React's error: *"Rendered more hooks than during the previous render."* We break a famous rule on purpose to ask *why* it's a rule.

`refactored/index.html` answers the question in the boldest way possible: a working counter app with **no React on the page at all**. `useState` and `useEffect` are rebuilt from scratch in about 50 lines of plain JavaScript ("MiniReact") that you can read whole. Once you see how they work inside, the Rules of Hooks stop being rules and become obvious consequences.

## 2. Concepts you need first

**Hooks** — the `use...` functions React gives components: `useState` (project 07's LEARN.md), `useEffect` (projects 09 and 11's LEARN.md). This project is about what they *are* underneath.

**The Rules of Hooks** — two rules React insists on: (1) only call hooks at the *top level* of a component — never inside `if`, loops, or nested functions; (2) only call them from components (or other hooks). Until today, "because the docs say so."

**Closures** — a function remembering the variables around its birthplace (project 11's LEARN.md). MiniReact's entire memory is a closure.

**IIFE (Immediately Invoked Function Expression)** — a function you define and call in the same breath, used to create a private space:

```js
const counter = (() => {
  let n = 0;                        // private — nobody outside can touch it
  return { next: () => ++n };      // only this door in
})();
counter.next(); // 1
```

The outer `( ... )()` runs the function immediately; whatever it returns is the public part. MiniReact uses this to hide `hooks`, `cursor`, and `rerender`.

**Arrays as slots + a cursor** — the heart of the lesson. Store things in an array; keep a counter (the *cursor*) saying which slot the next request gets:

```js
const slots = [];
let cursor = 0;
function claim() { return cursor++; } // returns 0, then 1, then 2...
```

If two rounds of claiming happen in the *same order*, each claimer gets the *same slot* both times — identity by position. If the order changes between rounds, claimers get each other's slots. Hold that thought.

**`in` operator** — checks whether an array/object has something at a key: `0 in [10]` is true, `5 in [10]` is false. MiniReact uses it to ask "was this slot ever initialized?"

**`typeof`** — tells you a value's kind: `typeof 5` is `'number'`, `typeof (() => {})` is `'function'`. This is how one setter supports both `set(7)` and `set(c => c + 1)`.

**`Object.is`** — near-identical to `===`; React's official "did this change?" comparison (project 10's LEARN.md).

**`some`** — array method: "does at least one item pass the test?" Used to compare dependency arrays item by item.

**Template literals** — backtick strings with `${}` holes: `` `count is ${count}` ``. MiniReact components return one big HTML string this way.

**`innerHTML` and `querySelector`** — direct DOM tools: `el.innerHTML = '<p>hi</p>'` replaces an element's contents with HTML text; `container.querySelector('#inc')` finds the element with `id="inc"` inside `container`. Our toy "renderer" is just these two.

**`document.title`** — the browser tab's text; assigning to it changes the tab label. The demo effect uses it as a visible side effect.

## 3. Walking through the original code

One honest hook, then a crime:

```jsx
const [showName, setShowName] = useState(false);

let name = '(hidden)';
if (showName) {
  const [n] = useState('Ada'); // hook call #2... sometimes
  name = n;
}

const [count, setCount] = useState(0); // hook call #2... or #3?
```

Read the comments like a detective. When `showName` is false, this render makes **two** hook calls: `showName`, then `count`. When `showName` is true, it makes **three**: `showName`, then `'Ada'`, then `count`. The *number and order* of hook calls changes between renders — that's exactly what the top-level rule forbids.

The JSX shows `name` and `count`, a `count++` button, and the toggle button that pulls the trigger. The page text tells you the punchline in advance: React will throw, and in subtler versions of this bug, *state swaps between hooks* — your count becomes `'Ada'`. But it can't tell you WHY yet. That's the refactor's job.

## 4. What's wrong with it (in beginner terms)

Here's the on-screen story. Load the page: "name: (hidden) · count: 0". Click count++ twice: count is 2. Now click "toggle name" — the page goes blank or freezes, and the console (press F12 to open it) shows React's error: *"Rendered more hooks than during the previous render."*

Why does React even *care*? You called a perfectly good function inside a perfectly legal `if`. Every other function in JavaScript is fine with that. The honest answer — and the reason this project exists — is that hooks have no idea which variable you assign them to. `useState(false)` and `useState(0)` look identical from React's side; it tells them apart **only by the order they're called in**. First call gets memory slot 0, second call slot 1, third slot 2. Your `if` made call order differ between renders, so the matching between calls and slots broke.

React caught this one loudly because the *count* of calls changed. The scarier variant: if one conditional hook is swapped for another (count stays the same, order changes), nothing crashes — hooks silently receive *each other's* state. Your `count` displays `'Ada'`. No error, just wrong data.

If that explanation feels like hand-waving — good. The fix for hand-waving is building the machine yourself.

## 5. Try it yourself first!

Different flavor this time: before reading the refactor, try to *design* it.

1. Pretend you're React. `useState(0)` is called and you must return the remembered value on re-renders. Where could you store it? (Hint: some structure that lives *outside* the component function, since the function re-runs from scratch each render.)
2. Now the component calls `useState` three times. How do you know which call is asking for which stored value? You can't see variable names. What's the simplest scheme?
3. If "position in the call sequence" is your answer: what must you reset before every render for positions to line up again?
4. Write the 10-line version: an array, a cursor, a `useState` that claims `cursor++`, initializes the slot on first sight, and returns `[value, setter]`. What must the setter do after storing the new value? (Something must redraw.)
5. Now explain the crash with your own machine: simulate two renders on paper, one with 2 hook calls and one with 3. Which slot does `count` read each time?
6. Stretch: sketch `useEffect(effect, deps)` — what would a slot need to remember to decide "should I re-run?" and to honor cleanup?

## 6. Understanding the refactored solution

MiniReact is an IIFE hiding three private variables:

```js
let hooks = [];        // slot i = state for the i-th hook call
let cursor = 0;        // which slot the NEXT hook call gets
let rerender = null;   // scheduled by setState
```

**`useState` is an array plus a cursor:**

```js
function useState(initialValue) {
  const slot = cursor++;                            // claim my slot
  if (!(slot in hooks)) hooks[slot] = initialValue; // first render only

  const setState = (next) => {
    hooks[slot] = typeof next === 'function' ? next(hooks[slot]) : next;
    rerender();                                     // state changed -> redraw
  };
  return [hooks[slot], setState];
}
```

Line by line: claim the next slot number; if this slot has never been filled, put the initial value in (that's why initial values only matter on the first render — a fact you've been using since project 07). Build a setter that closes over *this* slot number, writes into it, and asks for a redraw. The `typeof` line is the entire implementation of project 11's updater form: if you passed a function, call it with the current slot value. Two lines, mystery gone.

**`useEffect` is a slot holding `{ deps, cleanup }`:**

```js
function useEffect(effect, deps) {
  const slot = cursor++;
  const previous = hooks[slot];
  const changed =
    !previous || !deps || deps.some((d, i) => !Object.is(d, previous.deps[i]));
  if (changed) {
    if (previous && previous.cleanup) previous.cleanup();
    const cleanup = effect() || null;
    hooks[slot] = { deps, cleanup };
  }
}
```

Run the effect if: it's the first render (`!previous`), or no deps array was given (`!deps` — the "run every render" mode), or any dep differs from last time by `Object.is`. Before re-running, call the stored cleanup — project 18's "cleanup before re-run" guarantee is literally one line. Then store the new deps and cleanup for next time.

**`render` rewinds and re-invokes:**

```js
function render(component, container) {
  rerender = () => render(component, container);
  cursor = 0;                        // rewind: slots re-claimed in order
  const html = component();          // hook calls run: slot 0, 1, 2...
  container.innerHTML = html;
  if (component.bindEvents) component.bindEvents(container);
}
```

`cursor = 0` is the load-bearing line of the whole project. Every render replays the component; hook calls claim slots 0, 1, 2… in order; as long as the order is identical every render, each call finds its own state. **And now the Rules explain themselves**: a hook inside `if {}` shifts every later call's position, so later hooks read *earlier hooks' slots* — `count` receives `'Ada'`. "Top level only" isn't ritual; it's keeping the cursor honest.

**The demo app** uses our hooks exactly like React's: two `useState` calls (slots 0 and 1), one `useEffect` (slot 2) that writes `document.title`. The component returns an HTML string, and `bindEvents` wires the buttons by hand afterwards (`querySelector('#inc').onclick = ...`), stashing setters in a shared `handles` object so the wiring code can reach them. That crudeness is fine — the *renderer* is a stand-in; the *hooks* are the lesson.

Honest scope note, echoing the README: real React keeps a hooks list per component (on a tree structure called a *fiber*), batches updates, and redraws surgically instead of rewriting `innerHTML`. What you built is the *architecture* of hooks; the industrial engineering around it is what React adds.

## 7. Words you learned (glossary)

- **Rules of Hooks**: only call hooks at a component's top level, only from components/hooks.
- **Top level**: directly in the component body — not inside `if`, loops, or nested functions.
- **Slot**: one array position holding one hook call's state.
- **Cursor**: the counter deciding which slot the next hook call claims; reset to 0 per render.
- **Call order**: the sequence of hook calls in a render — the *only* identity hooks have.
- **IIFE**: a function defined and immediately called, creating a private scope.
- **Module pattern**: hiding private variables in a closure, exposing only chosen functions.
- **`typeof`**: operator revealing a value's kind (`'function'`, `'number'`, ...).
- **`Object.is`**: React's "did it change?" comparison, close cousin of `===`.
- **Dependency comparison**: checking each dep against last render's to decide re-running.
- **Cleanup**: the function an effect returns; runs before the effect re-runs.
- **`innerHTML`**: property that replaces an element's contents with an HTML string.
- **Template literal**: backtick string with `${}` interpolation.
- **Fiber**: real React's per-component bookkeeping structure (name-drop only!).

## 8. Experiments to try on the plane (no internet needed)

The usual caveat, inverted: `original.html` loads React from a CDN, so it needs internet (or a cached copy) to run. But `refactored/index.html` has **zero external dependencies — it runs fully offline**. It's the perfect plane toy. All of these are for the refactor:

1. **Recreate the crash — silently**: inside `CounterApp`, wrap the `name` hook in a condition: `let name = 'x', setName = () => {}; if (count < 2) { [name, setName] = useState('Ada'); }`. Click count++ a few times. Prediction: once count hits 2, the hook calls shift — the effect now claims slot 1, where `'Ada'` lives — and things garble with *no error at all*. MiniReact has no rule-checker; you just watched why React bothered to build one.
2. **Log the machine**: add `console.log(slot, hooks[slot])` at the top of `useState`. Prediction: every click prints `0 <count>` then `1 <name>` — the cursor marching in order, render after render.
3. **Break the cursor rewind**: comment out `cursor = 0;` in `render`, then click "count++". Prediction: the second render claims slots 3, 4, 5 — all fresh — so count resets to 0 on-screen with every interaction. You just proved the rewind is what makes state *persist*.
4. **Test dependency skipping**: change the effect's deps from `[count, name]` to `[name]`, and add `console.log('effect ran')`. Prediction: clicking count++ never re-runs the effect (the tab title freezes at the old count); clicking rename runs it. You've rebuilt project 17's stale-deps bug from the inside.
5. **Add `useRef` in three lines**: `function useRef(initial) { const slot = cursor++; if (!(slot in hooks)) hooks[slot] = { current: initial }; return hooks[slot]; }`. Prediction: it just works — a ref (project 26) is a slot holding a box, with no `rerender()` call. Notice how little separates the hooks once you own the array.
