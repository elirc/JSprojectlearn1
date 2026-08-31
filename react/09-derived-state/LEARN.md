# 📘 Learning Guide: Derived State

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A tiny product search page. You see a heading ("Products"), a text box where you can type a search word, a slider labeled "Max price", and a list of four products (Keyboard, Mouse, Monitor, Mousepad) with their prices. Above the list is a summary line like "4 products, total $466".

When you type in the search box, the list shrinks to matching products and the summary updates. When you drag the price slider, products above that price *should* disappear. In the original version, the slider does nothing at all — that's the bug we study.

## 2. Concepts you need first

**Components, JSX, and `useState`** — the basics of writing a React component are explained fully in project 01's LEARN.md, and `useState` in project 07's. Quick reminder: `useState` gives a component a memory slot plus a function to change it, and changing it makes React redraw the screen.

**Derived value** — a value you can *calculate* from other values you already have. If you know a list of prices, the total is derived: you can always add them up. You don't need to write the total down anywhere; you can recompute it any time.

```js
const prices = [10, 20, 30];
const total = prices.reduce((sum, p) => sum + p, 0); // 60 — derived!
```

**`filter`** — an array method (a built-in function that lives on arrays) that builds a *new* array containing only the items that pass a test:

```js
const nums = [1, 5, 10, 20];
const small = nums.filter((n) => n < 10); // [1, 5]
```

**`reduce`** — an array method that boils an array down to one value. It walks the array keeping a running result (here, a running sum):

```js
const nums = [1, 2, 3];
const sum = nums.reduce((runningTotal, n) => runningTotal + n, 0); // 6
```

The `0` at the end is the starting value of the running total.

**`useEffect`** — a React hook (a special function starting with `use`) that says "after the screen updates, run this extra code." It takes a function and a *dependency array*:

```js
useEffect(() => {
  console.log('query changed to', query);
}, [query]); // <- dependency array: re-run only when query changes
```

The dependency array lists the values the effect watches. If a value it uses is *missing* from that list, the effect won't re-run when that value changes — a classic source of bugs, and exactly the bug in this project.

**Re-render** — React calling your component function again to redraw the screen. Every `useState` change triggers one. Any plain `const` inside the component is recalculated fresh on every re-render — that fact is the whole lesson here.

**Keeping things "in sync"** — when the same information is stored in two places, you must update both every time. Forget one, and they disagree. The fix taught here: store it in *one* place and compute the rest.

## 3. Walking through the original code

Ignore the `<head>` section — it just loads React from the internet (a CDN, explained in section 8) and sets a font. The interesting part starts with the data:

```jsx
const PRODUCTS = [
  { id: 1, name: 'Keyboard', price: 89 },
  { id: 2, name: 'Mouse', price: 25 },
  ...
];
```

A plain array of product objects, defined once, outside the component. It never changes.

```jsx
const [query, setQuery] = useState('');
const [maxPrice, setMaxPrice] = useState(500);
```

Two pieces of *real* state: what the user typed, and where the slider sits. These are genuinely things only the user knows — React must remember them.

```jsx
const [filtered, setFiltered] = useState(PRODUCTS);
const [total, setTotal] = useState(466);   // hand-computed. stale bait.
const [count, setCount] = useState(4);
```

Three *more* state slots — but look closely: all three could be calculated from `query`, `maxPrice`, and `PRODUCTS`. The starting values `466` and `4` were computed by a human with a calculator. If anyone ever edits the `PRODUCTS` list, these numbers become lies.

```jsx
useEffect(() => {
  const next = PRODUCTS.filter(
    (p) => p.name.toLowerCase().includes(query.toLowerCase()),
  );
  setFiltered(next);
  setCount(next.length);
  setTotal(next.reduce((sum, p) => sum + p.price, 0));
}, [query]);
```

This effect's whole job is keeping the three copies in sync: whenever `query` changes, re-filter, then write all three state slots. Notice two things: the filter test only checks the *name* — it never looks at `maxPrice` — and the dependency array only lists `query`. The slider was added later, and whoever added it forgot to update this effect. That's the bug.

The rest is display: an input tied to `query`, a range slider tied to `maxPrice`, the summary line reading `count` and `total`, and a `map` turning `filtered` into `<li>` list items.

## 4. What's wrong with it (in beginner terms)

**The dead slider.** Open the page, drag "Max price" from 500 down to 20. You'd expect the Monitor ($340) and Keyboard ($89) to vanish. Instead: nothing. The list doesn't blink. Why? Dragging the slider changes `maxPrice`, which re-renders the component — but the *list on screen comes from `filtered`*, and `filtered` only gets rewritten by the effect, and the effect only wakes up when `query` changes. `maxPrice` changed, nobody told the effect, the copy stayed stale.

**The hand-typed numbers.** `total: 466` and `count: 4` were typed in by a person. Imagine your teammate adds a fifth product, "Webcam, $60", to `PRODUCTS`. On first load the page now shows five items in the list but still says "4 products, total $466" — until you type something, which finally wakes the effect. The page contradicts itself.

**Double work.** Every keystroke in the search box renders the page twice: once because `query` changed, then again because the effect wrote `filtered`/`count`/`total`. You can't *see* this one, but it's wasted work, and in bigger apps it causes flicker and slowness.

The deep problem: the app stores five things when only two are real. Copies need a sync point; sync points get forgotten.

## 5. Try it yourself first!

Before reading the solution, try to fix `original.html` yourself (edit a copy!). Hints, vaguest first:

1. Count how many `useState` calls there are. How many does the app *truly* need?
2. Ask about each state slot: "could I calculate this from the others?" If yes, it doesn't need to be state.
3. What if `filtered` were just a plain `const` computed right there in the component body, using both `query` AND `maxPrice`?
4. If `filtered` is a `const`, then `total` can be a `const` too (`filtered.reduce(...)`), and `count` doesn't even need a name — `filtered.length` works in the JSX.
5. Once nothing is copied, the whole `useEffect` block can be deleted. If your fix still has a `useEffect`, keep going.

## 6. Understanding the refactored solution

Open `refactored/index.html`. The state section is now honest:

```jsx
const [query, setQuery] = useState('');
const [maxPrice, setMaxPrice] = useState(500);
```

Two inputs, two state slots. That's the entire memory of this app.

```jsx
const filtered = PRODUCTS.filter(
  (p) =>
    p.name.toLowerCase().includes(query.toLowerCase()) &&
    p.price <= maxPrice,
);
const total = filtered.reduce((sum, p) => sum + p.price, 0);
```

`filtered` and `total` are plain `const`s, computed fresh on every render. Because component functions re-run on every state change, these lines re-run too — automatically, always with current values. There is no copy to forget, so there is no sync bug possible. Notice the filter now checks `p.price <= maxPrice` directly: the slider works not because someone remembered to wire it up, but because there's no wiring to forget.

The summary line uses `filtered.length` right in the JSX — `count` never needed a name at all.

Think of a spreadsheet: cell C1 says `=A1+B1`. You never "update" C1; it can't be out of date. That's what a derived `const` in render is.

**"But isn't recomputing wasteful?"** Filtering 4 items takes nanoseconds. React's rule of thumb: derive by default; only optimize (with `useMemo`, project 27) when something is *measured* to be slow. A wrong cached value is worse than a cheap recomputation.

## 7. Words you learned (glossary)

- **State**: a value React remembers between renders; changing it redraws the screen.
- **Derived value / derived state**: anything calculable from existing state — should be a `const`, not state.
- **Re-render**: React running your component function again to update the screen.
- **`useEffect`**: hook that runs extra code after render, watching a dependency array.
- **Dependency array**: the list of values an effect watches; the effect re-runs when one changes.
- **Stale**: out of date — a stored copy that no longer matches the source.
- **In sync**: two copies of data agreeing; requires someone to update both.
- **`filter`**: array method returning a new array of items that pass a test.
- **`reduce`**: array method that combines all items into one value (like a sum).
- **CDN**: a server that hands your browser a library (React here) over the internet.

## 8. Experiments to try on the plane (no internet needed)

Heads-up once: these pages load React from a CDN, so *running* them needs internet (or a previously cached load). You can still read, edit, and reason about the code offline — predict the outcome, then verify when you land.

1. **Break the refactor on purpose**: in `refactored/index.html`, remove `&& p.price <= maxPrice` from the filter. Prediction: the slider goes dead again — but notice the summary and list stay consistent with each other, because they both derive from the same `filtered`.
2. **Add a product**: add `{ id: 5, name: 'Webcam', price: 60 }` to `PRODUCTS` in *both* files. Prediction: the refactor shows "5 products, total $526" immediately; the original shows the new item in the list but still claims "4 products, total $466" until you type a character.
3. **Fix the original the other way**: add `maxPrice` to the effect's dependency array AND add `&& p.price <= maxPrice` to its filter. Prediction: the slider works — but you had to change two places, which is exactly the fragility the lesson warns about.
4. **Add a derived "cheapest" line**: in the refactor, add `const cheapest = filtered.length ? Math.min(...filtered.map(p => p.price)) : 0;` and show it in a `<p>`. Prediction: it updates instantly with every search/slide, with zero new state.
