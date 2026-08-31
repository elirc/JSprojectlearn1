# 📘 Learning Guide: You Might Not Need an Effect

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

A checkout summary. The screen shows: a quantity with a **+** button, a coupon input box, and three money lines — Subtotal, Discount, Total. Click **+** and quantity goes from 1 to 2; subtotal doubles; total follows. Type `SAVE10` into the coupon box and the discount becomes 10%, and the total drops.

Here's the twist: the original and the refactor look **identical in the browser**. Same pixels, same behavior. The difference is all in the code — the original takes three extra state variables and three `useEffect`s to do what the refactor does with three lines of arithmetic. This project is about learning to see that difference, because the extra machinery isn't just ugly: it renders three times per click and briefly shows inconsistent numbers.

## 2. Concepts you need first

### Derived values — compute, don't store

If a value can be **calculated from things you already have**, don't store it in state — calculate it, right in the component body, every render:

```jsx
const [quantity, setQuantity] = useState(1);
const subtotal = quantity * 40;   // derived: recomputed each render, always right
```

A plain `const` in a component body is recomputed on every render. That's not waste — that's the point. It can never be out of date, never disagree with `quantity`, never need "updating." State that merely mirrors other state is called *derived state*, and it's the #1 React code smell (project 09 of this track is devoted to it).

### What effects are actually for

`useEffect` (taught from scratch in project 17's LEARN.md) runs code *after* render. Its legitimate job is **synchronizing React with the outside world**: fetching from a server, starting timers, writing `document.title` or localStorage, subscribing to browser events. The test for any effect: **is the outside world involved?**

- No, it computes a value from state → it's a calculation; do it in render (this project).
- No, it responds to a user action → do it in the event handler.
- Yes → effect, with deps (17) and cleanup (18).

### The effect chain — how the anti-pattern cascades

When someone stores derived values in state and "syncs" them with effects, updates travel like dominoes. Here's a two-link chain:

```jsx
const [a, setA] = useState(1);
const [b, setB] = useState(2);
useEffect(() => { setB(a * 2); }, [a]);   // link: a -> b
```

Click something that calls `setA(5)`. Sequence: render (a=5, **b still 2** — wrong pair on screen!) → effect runs → `setB(10)` → *another* render (a=5, b=10). Two renders, and the middle one showed inconsistent numbers. Chain three links and you get three renders with two inconsistent frames. Each extra derived value adds a domino, and the author must keep the whole domino order straight in their head.

### Renders are cheap; extra renders that show wrong data are not

A *render* is React running your component to compute the screen. One render per user action is the natural rhythm. Effect chains break that rhythm: one click, multiple renders, with the in-between renders showing half-updated data — usually as an imperceptible flicker, occasionally as a visible glitch, always as wasted work.

### Basics assumed here

`useState` and event handlers: project 14's LEARN.md. Controlled inputs (`value` + `onChange`): project 19's LEARN.md mentions them; the coupon box here is one. Ternaries: `cond ? a : b`.

## 3. Walking through the original code

**The real state — what the user controls:**

```jsx
const [quantity, setQuantity] = useState(1);
const [coupon, setCoupon] = useState('');
const PRICE = 40;
```

Quantity and coupon text. These two are genuine state: they exist only because the user typed/clicked them. `PRICE` is a constant.

**Effect #1 — "sync" the subtotal:**

```jsx
const [subtotal, setSubtotal] = useState(PRICE);
useEffect(() => {
  setSubtotal(quantity * PRICE);
}, [quantity]);
```

A state variable for something that is literally `quantity * PRICE`, plus an effect to keep it updated. Note the bug-in-waiting: the initial value `PRICE` is only correct because quantity starts at 1.

**Effect #2 — "sync" the discount:**

```jsx
const [discount, setDiscount] = useState(0);
useEffect(() => {
  setDiscount(coupon === 'SAVE10' ? 0.1 : 0);
}, [coupon]);
```

Same disease: `discount` is a pure function of `coupon`, stored and synced.

**Effect #3 — the chain deepens:**

```jsx
const [total, setTotal] = useState(PRICE);
useEffect(() => {
  setTotal(subtotal * (1 - discount));
}, [subtotal, discount]);
```

`total` depends on the *other two derived states*, so its effect must run after theirs. The file's comment counts the cost of one + click: render (new quantity) → effect 1 sets subtotal → render → effect 3 sets total → render. **Three renders**, and the middle one displays new subtotal with old total.

## 4. What's wrong with it (in beginner terms)

1. **The screen briefly lies.** Click + with quantity 1: for one render, Subtotal says $80 while Total still says $40. It's usually too fast to see with the naked eye — but it's real (a slow device, or React DevTools, reveals it), and code that shows inconsistent money for any duration is wrong on principle.
2. **Triple work for single changes.** One click, three renders. In this toy it's harmless; in a big page where each render touches many components, effect chains are a classic hidden performance drain.
3. **The mental load is the real killer.** The three effects form a dependency graph: 3 depends on 1 and 2. The author must keep that graph *topologically sorted* in their head (fancy term: ordered so every effect runs after the things it reads). Want to add tax? You must figure out where a fourth state+effect slots into the chain, and what its deps are. Compare: in the refactor, adding tax is one `const` line placed anywhere after `total`... no wait — placed after the values it reads. Order is enforced *by JavaScript itself*, visibly, in the code.
4. **Six things can now disagree.** Two real states plus three stored copies of arithmetic = extra places for bugs to live. E.g., initialize `total` wrong and it's wrong until the first effect run.

## 5. Try it yourself first!

1. **Vague hint:** for each of the three extra states, ask: could I compute this from `quantity` and `coupon` right now, in one expression? If yes, it isn't state.
2. **More specific:** delete `subtotal`'s `useState` and `useEffect`; replace with `const subtotal = quantity * PRICE;` in the component body. The JSX below doesn't need to change at all — it still says `{subtotal}`.
3. **Repeat** for `discount` (`coupon === 'SAVE10' ? 0.1 : 0`) and `total` (`subtotal * (1 - discount)`). Note you can use one `const` in the next — plain top-to-bottom code.
4. **Victory check:** the `useEffect` import should now be unused. Delete it. If your component still imports `useEffect`, ask what outside-world thing that effect touches; if the answer is "none," keep deleting.
5. **Stretch:** add 8% tax as `const tax = total * 0.08;` and a final line `const grandTotal = total + tax;`. Feel how it's just... arithmetic.

## 6. Understanding the refactored solution

**Two states, three consts, zero effects:**

```jsx
const [quantity, setQuantity] = useState(1);
const [coupon, setCoupon] = useState('');
const PRICE = 40;

const subtotal = quantity * PRICE;
const discount = coupon === 'SAVE10' ? 0.1 : 0;
const total = subtotal * (1 - discount);
```

Everything below the state lines is a spreadsheet: formulas that recompute from the two inputs on every render. The three values are **always mutually consistent**, because they're computed together, in order, from the same snapshot of state, within a single render. One click → one render → one coherent screen. There is nothing to wire, nothing to sync, no order to memorize — JavaScript's top-to-bottom evaluation *is* the dependency order, and it's visible.

Notice what deleting `useEffect` deleted: the extra renders, the inconsistent frames, the initial-value traps, and the whole "which effect runs first?" puzzle. A bug *class* died, not a bug.

**The decision rule the refactored page prints** (worth memorizing verbatim):

> When IS an effect right? When you synchronize with something OUTSIDE React: a server (17–20), a timer (18), the document title, localStorage (23), a browser API (25). The test: "outside world involved?" No → compute it, or do it in the event handler. Yes → effect, with deps and cleanup.

**The other common not-an-effect** (from the README): "when X changes, update state Y" where both are React state. If Y is computable from X → derive it (this project). If Y should *reset* when a prop changes → that's the `key` technique (project 31). Effects that shuttle React state into other React state are always the wrong tool — they're how effect chains are born.

**How to say the project-17 sentence here:** "keep `subtotal` synchronized with `quantity`" — notice both blanks name React state. That's the tell. The sentence only justifies an effect when the second blank names something *outside* React.

## 7. Words you learned (glossary)

- **Derived value / derived state** — a value computable from existing state; should be a `const`, not state.
- **Code smell** — code that works but whose shape hints at deeper problems.
- **Effect chain** — effects triggering state changes that trigger other effects, domino-style.
- **Cascade / cascading renders** — the multiple re-renders an effect chain causes per user action.
- **Inconsistent frame** — a render where related values disagree (new subtotal, old total).
- **Dependency graph** — which values depend on which; chains force you to track it mentally.
- **Topological order** — an ordering where everything comes after the things it depends on.
- **Single source of truth** — each fact stored once; everything else computed from it.
- **Outside world** — anything that isn't React state/props: servers, timers, storage, browser APIs.
- **Spreadsheet model** — inputs in cells, everything else formulas; the refactor's shape.
- **Render snapshot** — the fixed set of state values one render computes from.

## 8. Experiments to try on the plane (no internet needed)

CDN note (once): the pages load React from the internet on first load; everything else is local. Predict offline, verify later or with cached pages.

1. **Count the renders.** Add `let renders = 0;` above `App` and `renders++;` inside, and render `{renders}` somewhere. Prediction: in the original, one + click advances the counter by 3 (sometimes 2 — React batches when it can); in the refactor, by exactly 1. The cleanest possible proof of the lesson.
2. **Catch the inconsistent frame.** In the original, add `console.log(subtotal, total)` in the component body and click +. Prediction: a logged pair like `80 40` appears — new subtotal with stale total — before the final `80 80`. The refactor never logs a mismatched pair.
3. **Add tax to both versions.** Original: new state + new effect with deps `[total]` — and note you must think about chain position. Refactor: `const tax = total * 0.08;`. Prediction: both work; one took thought, one took arithmetic. (Also watch the original's render count climb to 4 per click.)
4. **Break the original's initial value.** Change `useState(PRICE)` for `total` to `useState(0)`. Prediction: the page loads showing Total: $0 until effects run (a flash of $0 on a $40 order). The refactor has no initial-value to get wrong — formulas don't have startup lag.
5. **Find the legit effect.** Add "sync the browser tab title to the total": `useEffect(() => { document.title = `$${total}`; }, [total]);` in the *refactor*. Prediction: the tab shows the price. Then say the project-17 sentence: "keep *the document title* synchronized with *total*" — second blank is outside React, so this effect earns its place. Now you've seen both a fake effect and a real one in the same file.
