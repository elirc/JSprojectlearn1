# 🏋️ Practice: Derived State

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (All of these can be written and checked by reasoning offline; the page only needs internet on first load for the CDN.)

## Exercises

### ⭐ 1. Show an empty-state message (warm-up)

In the refactored page, searching for something like "zzz" leaves a blank space where the list was. Add a "No products match." message that appears exactly when the list is empty — and disappears the moment anything matches. Do it without adding any state.

**Practices:** deriving UI from an already-derived value; conditional rendering.

**Hint:** `filtered.length === 0` is already computable right where the JSX lives.

**Expected:** Type "zzz": the summary reads "0 products, total $0" and "No products match." appears under it. Delete a "z": the message vanishes and the list returns.

### ⭐⭐ 2. Add an "under $50 only" checkbox (core)

Add a third real input: a checkbox labeled "under $50 only". When checked, the list shows only products cheaper than $50 (on top of the existing query and slider filters). One new `useState`, zero new `useEffect`s — the filter should read the checkbox state directly.

**Practices:** adding an input without adding a sync point; controlled checkboxes.

**Hint:** A checkbox's controlled pair is `checked={cheapOnly}` + `onChange={(e) => setCheapOnly(e.target.checked)}` — note `.checked`, not `.value`.

**Expected:** With an empty search and the slider at 500, checking the box shows exactly Mouse ($25) and Mousepad ($12), summary "2 products, total $37"; unchecking restores all four.

### ⭐⭐ 3. Fix the sort that won't undo (core)

A teammate added sort-by-price like this. Two things go wrong on screen: predict both, then fix the line.

```jsx
const [sortByPrice, setSortByPrice] = useState(false);
const shown = sortByPrice
  ? PRODUCTS.sort((a, b) => a.price - b.price)
  : filtered;
// ...the <ul> maps over `shown`
```

**Practices:** `sort` mutates; deriving from the right source.

**Hint:** Check the box, then *uncheck* it, then look at the order. Also: while checked, does typing a search do anything to the list?

**Expected:** You name both bugs (what the sorted view ignores, and what stays wrong after unchecking), and after your fix, sorting respects the filters and unchecking restores the original Keyboard/Mouse/Monitor/Mousepad order.

### ⭐⭐ 4. Predict what renders (core)

Using the refactored page exactly as it is, the user types `mo` in the search box and drags the slider to 100. Without running it, write down the exact summary line and the exact list items, in order. For each of the four products, say which test (name or price) kept it or cut it.

**Practices:** tracing a derive-during-render pipeline by hand.

**Hint:** The filter keeps a product only if its lowercased name contains "mo" AND its price is at most 100 — walk the `PRODUCTS` array top to bottom.

**Expected:** Your summary line, item list, and per-product reasons match the solution word for word.

### ⭐⭐⭐ 5. Extract `Summary` and `ProductList` (challenge)

Split the display into two stateless components: `Summary({ products })` renders the "N products, total $X" line and computes the total itself; `ProductList({ products })` renders the `<ul>`. `App` keeps the two inputs and the `filtered` computation, and passes `filtered` to both. No component may gain any state.

**Practices:** deriving from props (not just from state); stateless presentational components.

**Hint:** Inside `Summary`, `total` is a `const` computed from the `products` prop with `reduce` — deriving during render works the same one level down.

**Expected:** The page looks and behaves identically — search, slider, summary, and list all still live-update — but `App`'s JSX for them is two lines: `<Summary products={filtered} />` and `<ProductList products={filtered} />`.

## Solutions

### 1. Show an empty-state message

```jsx
<p>{filtered.length} products, total ${total}</p>
{filtered.length === 0 && <p>No products match.</p>}
<ul>
  {filtered.map((p) => <li key={p.id}>{p.name} — ${p.price}</li>)}
</ul>
```

**Why:** "Is the list empty?" is derivable from `filtered`, which is itself derived from `query` and `maxPrice` — so the message needs no state and no effect; it recomputes on every render along with everything else. `filtered.length === 0` is a real boolean, so the `&&` is safe (it renders nothing, not a stray `0`, when the list has items). A stored `isEmpty` state would be one more copy waiting to go stale.

### 2. Add an "under $50 only" checkbox

```jsx
const [cheapOnly, setCheapOnly] = useState(false);

const filtered = PRODUCTS.filter(
  (p) =>
    p.name.toLowerCase().includes(query.toLowerCase()) &&
    p.price <= maxPrice &&
    (!cheapOnly || p.price < 50),
);

// in the JSX, near the slider:
<label>
  <input
    type="checkbox"
    checked={cheapOnly}
    onChange={(e) => setCheapOnly(e.target.checked)}
  />
  {' '}under $50 only
</label>
```

**Why:** The checkbox is a genuine user input, so it earns a state slot — but everything downstream stays derived. Because the filter reads `cheapOnly` directly during render, there is no dependency array to forget: this is exactly the step where the original's author broke the slider, and here the mistake is unrepresentable. `(!cheapOnly || p.price < 50)` means "either the box is off, or the product must be cheap" (verified: it keeps Mouse and Mousepad, total $37).

### 3. Fix the sort that won't undo

Bug 1: while checked, the sorted view is built from `PRODUCTS`, not `filtered` — so the search box and slider do nothing to the list. Bug 2: `.sort()` mutates the array it's called on, so it reorders the shared `PRODUCTS` array in place *permanently* — after unchecking, the list still shows Mousepad, Mouse, Keyboard, Monitor forever (verified in node: `PRODUCTS` stays reordered). The fix sorts a copy of the filtered list:

```jsx
const shown = sortByPrice
  ? [...filtered].sort((a, b) => a.price - b.price)
  : filtered;
```

**Why:** Deriving must start from the right source (`filtered`, so the other inputs still apply) and must not damage any source (`[...filtered]` makes a fresh copy for `sort` to rearrange, leaving `filtered` and `PRODUCTS` untouched). `sort` is one of the sneaky mutators — it returns the same array it just reordered, so the buggy version even *looks* functional. Copy-then-sort is the safe idiom, and project 10 turns that into a house rule.

### 4. Predict what renders

Summary line: **"2 products, total $37"**. List, in this order:

- Mouse — $25
- Mousepad — $12

Per product: **Keyboard** — cut by the *name* test ("keyboard" doesn't contain "mo"; its $89 would have passed). **Mouse** — kept: "mouse" contains "mo", 25 ≤ 100. **Monitor** — passes the name test ("monitor" contains "mo") but is cut by the *price* test (340 > 100). **Mousepad** — kept: "mousepad" contains "mo", 12 ≤ 100.

**Why:** `filter` walks `PRODUCTS` in array order and keeps items passing *both* tests, so the output preserves the original Mouse-before-Mousepad order — no sorting happens anywhere. `filtered.length` is 2 and `reduce` sums 25 + 12 = 37 (verified by running the exact filter and reduce in node). Note the summary and the list can't disagree: both derive from the same `filtered` in the same render.

### 5. Extract `Summary` and `ProductList`

```jsx
function Summary({ products }) {
  const total = products.reduce((sum, p) => sum + p.price, 0);
  return <p>{products.length} products, total ${total}</p>;
}

function ProductList({ products }) {
  return (
    <ul>
      {products.map((p) => <li key={p.id}>{p.name} — ${p.price}</li>)}
    </ul>
  );
}

// in App's return, replacing the old summary <p> and <ul>:
<Summary products={filtered} />
<ProductList products={filtered} />
```

**Why:** Both children are pure views: props in, JSX out, no `useState` — so when `App` re-renders with a new `filtered`, they re-render with it and can't hold a stale copy. `Summary` computing `total` from its prop shows that "derive during render" isn't only about state: any value computable from what you already have (state *or* props) should be a `const`, not a stored thing. `App` shrinks to what it truly owns — the two inputs and the one derivation.
