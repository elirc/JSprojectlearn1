# 📘 Learning Guide: List from Data

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

A release checklist. The page shows a heading, a progress line ("2 of 4 done"), and four clickable steps: "Run the tests", "Update the changelog", "Tag the release", "Tell the team". Click a step and it gets crossed out (strikethrough, gray); click again to un-cross it. The progress line updates as you click. The refactored version adds a "Reset all" button that un-crosses everything at once.

Both versions behave the same for the user (minus that button). The difference is how the *list* is represented in code — or, in the original, how it isn't.

## 2. Concepts you need first

Components, JSX, props, `useState`, rendering, and event handlers are explained from scratch in project 01's LEARN.md. Quick recap, then the new material.

### Recap: `useState` in one breath

```jsx
const [done, setDone] = useState(false);
```

`done` is the current value, `setDone` changes it *and* triggers a re-render (React re-running your component to redraw the screen).

### Boolean state and toggling

A boolean is a value that is either `true` or `false`. The `!` operator flips it: `!true` is `false`. So this is a toggle:

```jsx
const [on, setOn] = useState(false);
<button onClick={() => setOn(!on)}>flip</button>
```

Each click stores the opposite of the current value.

### The ternary operator `? :`

A one-line if/else that produces a value:

```js
const label = isDone ? 'done' : '';   // 'done' if true, '' if false
```

Read `a ? b : c` as "if a, then b, otherwise c." In this project it picks a CSS class name: `className={step1Done ? 'done' : ''}` — the `done` class adds the strikethrough style.

### What is a `Set`?

A `Set` is a built-in JavaScript collection that holds each value at most once — like a bag of unique items. Its main tools:

```js
const s = new Set();
s.add('tag');        // put an item in
s.has('tag');        // true — is it in there?
s.delete('tag');     // take it out
s.size;              // how many items (a number)
new Set(s);          // a fresh COPY of s
```

Perfect for "which step ids are done?" — a step is either in the done-bag or it isn't.

### Immutability: copy, don't mutate

To *mutate* means to change an object in place (`s.add(...)` mutates the set `s`). React has a hard rule: **never mutate state directly**. React decides whether to re-render by checking whether you gave it a *new* object — if you secretly changed the old one, React sees the same object and does nothing. The safe pattern: copy first, change the copy, hand React the copy.

```js
const next = new Set(current);  // copy
next.add(id);                   // change the copy
return next;                    // give React the NEW object
```

(Project 10 shows exactly how things break when you skip this.)

### Updater functions

`setDoneIds` can take a value, or a *function* that receives the current value and returns the next one:

```js
setDoneIds((current) => {
  const next = new Set(current);
  next.add(id);
  return next;
});
```

The function form guarantees `current` is the very latest value, even if several updates are queued. It's a habit worth building now; project 11 shows the bug it prevents.

### Derived values

A derived value is anything you can *compute* from existing state, rather than storing separately. `doneIds.size` IS the done count — there is no second "count" variable that could drift out of sync. Rule: never store what you can compute. (Project 09 is all about this.)

### Rendering a list with `map`

`map` transforms each item of an array into something new. In React, it turns data into UI:

```jsx
const fruits = ['apple', 'pear'];
<ul>
  {fruits.map((f) => <li key={f}>{f}</li>)}
</ul>
```

One `<li>` template, however many items the array has. Each item needs a `key` — a unique label so React can tell items apart across renders (project 03 shows why this matters; here just use the data's `id`).

## 3. Walking through the original code

After the CDN script tags (React, ReactDOM, Babel — see project 01), the component starts with four separate states:

```jsx
const [step1Done, setStep1Done] = useState(false);
const [step2Done, setStep2Done] = useState(false);
const [step3Done, setStep3Done] = useState(false);
const [step4Done, setStep4Done] = useState(false);
```

One boolean per checklist item. Notice the names are numbered — a smell: numbered variables usually mean "this wanted to be an array."

```jsx
const doneCount =
  (step1Done ? 1 : 0) + (step2Done ? 1 : 0) +
  (step3Done ? 1 : 0) + (step4Done ? 1 : 0);
```

The progress count, summed by hand. Each ternary turns a boolean into 1 or 0. If a fifth step is ever added, this line must be found and edited too.

```jsx
<p>{doneCount} of 4 done</p>
```

And the total "4" is a hardcoded number in the text — a *third* place that must be edited for step 5.

```jsx
<li className={step1Done ? 'done' : ''} onClick={() => setStep1Done(!step1Done)}>
  Run the tests
</li>
```

One list item: if its boolean is true, it gets the `done` CSS class (strikethrough); clicking flips the boolean. This block is pasted **four times**, each wired to its own state pair.

The closing comment in the file says it best: the *list* doesn't exist anywhere in the program — only four individuals do. You can't loop over it, ask its length, reset it, or load it from a server, because there's no "it."

## 4. What's wrong with it (in beginner terms)

1. **Adding step 5 is a three-place edit.** New `useState`, new `<li>`, *and* updating `doneCount` *and* the "of 4" text. Here's the on-screen failure: someone adds the state and the `<li>` but forgets `doneCount`. Now you check all five boxes and the page proudly says "4 of 4 done" while five items are crossed out. Nothing crashes — the page just quietly lies.
2. **"Reset all" would be four setter calls.** `setStep1Done(false); setStep2Done(false); ...` — and a fifth when step 5 arrives. Forget one, and reset leaves one item mysteriously still crossed out.
3. **The steps can never come from anywhere else.** A server sends you a list of steps? You can't write `useState` calls at runtime — the number of states is frozen into the code. Reordering, sorting, or letting the user add steps: all structurally impossible.
4. **The code grows linearly with the data.** 40 steps = 40 `useState`s and 40 `<li>`s. The refactor stays the same size whether there are 4 steps or 400.

## 5. Try it yourself first!

Open `original.html` and try the fix before reading on:

1. **Vague hint:** four numbered variables that all behave identically... what single data structure holds many peers?
2. **The list:** make a `STEPS` array of `{ id, label }` objects, and render it with `STEPS.map(...)` — one `<li>` template.
3. **The state:** you don't need one boolean per step. What ONE piece of state records "which steps are done"? (An array of ids works; a `Set` of ids is even neater.)
4. **The count:** once state is a collection, can `doneCount` and the total both be *derived* — no stored numbers at all?
5. **Checkpoint:** if adding a fifth step to your version requires anything beyond one new row in `STEPS`, keep refactoring.

## 6. Understanding the refactored solution

**The data:**

```jsx
const STEPS = [
  { id: 'tests', label: 'Run the tests' },
  { id: 'changelog', label: 'Update the changelog' },
  ...
];
```

The list of steps is plain data, outside the component. It never changes while the app runs, so it's not state — it's just a constant.

**The one state:**

```jsx
const [doneIds, setDoneIds] = useState(new Set());
```

The insight: state should record only *what the user did* — which ids they marked done. The steps themselves aren't state; the user can't change them. Starting value: an empty `Set` (nothing done).

**The toggle:**

```jsx
function toggle(id) {
  setDoneIds((current) => {
    const next = new Set(current);       // copy, never mutate
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
}
```

Copy the set, then either remove the id (if it was there) or add it (if it wasn't), and return the copy. One function handles every step — no numbered setters. The ternary here is used for its side effects (delete vs add), a compact idiom.

**Derived numbers:**

```jsx
<p>{doneIds.size} of {STEPS.length} done</p>
```

Both numbers are computed on the spot. Add a step to `STEPS` and "of 5" appears by itself. Check a box and `size` updates by itself. Neither can ever disagree with reality, because neither is stored.

**The rendered list:**

```jsx
{STEPS.map((step) => (
  <li key={step.id}
      className={doneIds.has(step.id) ? 'done' : ''}
      onClick={() => toggle(step.id)}>
    {step.label}
  </li>
))}
```

One template. Each `<li>` asks the set "am I done?" for its class, and clicking calls `toggle` with its own id. `key={step.id}` uses the data's identity, not the position.

**Reset:**

```jsx
<button onClick={() => setDoneIds(new Set())}>Reset all</button>
```

One line, forever, no matter how many steps exist: replace the done-bag with an empty one.

## 7. Words you learned (glossary)

- **Boolean** — a `true`/`false` value.
- **Toggle** — flipping a boolean to its opposite (`!on`).
- **Ternary (`a ? b : c`)** — inline if/else that produces a value.
- **`Set`** — collection of unique values; `add`, `has`, `delete`, `size`.
- **Mutate** — change an object in place. Forbidden on React state.
- **Immutability** — the copy-then-change discipline React state requires.
- **Updater function** — `setX((current) => next)`: compute the next state from the guaranteed-latest current one.
- **Derived value** — computed from state during render, never stored (`doneIds.size`).
- **`map`** — array method turning each data item into (here) a piece of UI.
- **`key` prop** — unique per-item label React uses to track list items.
- **Smell** — code that works but hints at a design problem (numbered variables!).
- **Constant** — data that never changes at runtime (`STEPS`), written ALL-CAPS by convention.

## 8. Experiments to try on the plane (no internet needed)

Note once: these pages load React from a CDN, so *running* them needs internet on first load (if you opened them before the flight, your browser may have React cached). Reading and editing the code works offline regardless — write the prediction first, verify when you can.

1. **Add a fifth step to `STEPS`** in the refactor: `{ id: 'party', label: 'Celebrate' }`. Prediction: a fifth row appears, clickable and crossed-out-able, and the text says "of 5" — zero other edits. Then list every edit the original would need (there are at least four).
2. **In the original, add a step 5 but "forget" to update `doneCount`.** Prediction: with all five clicked, the page says "4 of 5 done". A quiet lie, exactly as described in section 4.
3. **Sabotage the copy:** in the refactor's `toggle`, replace the three-line body with `current.add(id); return current;` (mutating, returning the same set). Prediction: clicking a step does nothing visible — the data changed but React saw the same object and skipped the re-render. This is project 10's bug, previewed.
4. **Make done items sort last:** before the `map`, build `const ordered = [...STEPS].sort((a, b) => (doneIds.has(a.id) ? 1 : 0) - (doneIds.has(b.id) ? 1 : 0));` and map over `ordered`. Prediction: clicking a step drops it to the bottom of the list. Try to imagine writing this feature in the original — there's no array to sort.
5. **Show a finished banner:** add `{doneIds.size === STEPS.length && <p>🎉 Ready to ship!</p>}` after the list. Prediction: the banner appears only when every step is crossed out, and vanishes if you un-check one.
