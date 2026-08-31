# 📘 Learning Guide: Mini Store

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A tiny online shop. On screen you see nested boxes: a "Layout" box
containing a "Header" (with a cart badge like 🛒 2) and a "Products"
box with two buttons — "add Keyboard" and "add Mouse" — plus a list of
what's in your cart, each line with an "x" button to remove it.

Click "add Keyboard" twice and the badge reads 🛒 2 and the list shows
"Keyboard x2". Both versions look and behave *identically*. The
difference is invisible on screen: it's how the cart data travels
through the code. The original hand-carries it through every component;
the refactor builds a tiny "store" any component can reach into.

## 2. Concepts you need first

### Reducers and dispatch (quick recap)

A **reducer** is a pure function `(state, action) => newState`: given
the current state and an **action** (an object describing what
happened), it returns the next state. `useReducer` gives you the state
plus a `dispatch` function that sends actions to the reducer. Project
13's LEARN.md covers this fully.

```js
const [cart, dispatch] = useReducer(cartReducer, []);
dispatch({ type: 'added', id: 'kb', name: 'Keyboard' });
```

### Props drilling (the courier problem)

**Props** are the values a parent passes to a child, like function
arguments. **Prop drilling** is when a value must pass through
components that don't use it, just to reach a distant grandchild:

```jsx
function App()    { return <Layout cart={cart} />; }   // owns it
function Layout({ cart })  { return <Header cart={cart} />; } // courier
function Header({ cart })  { return <Badge cart={cart} />; }  // courier
function Badge({ cart })   { return <b>{cart.length}</b>; }   // uses it!
```

Layout and Header are **couriers** — they carry a suitcase they never
open. Every new consumer means re-plumbing every layer in between.

### Context (a broadcast channel through the tree)

**Context** is React's way to make a value available to ANY descendant
without passing props. Three parts:

```jsx
const MyContext = createContext(null);          // 1. create the channel

<MyContext.Provider value={42}>                 // 2. broadcast a value
  <Anything />
</MyContext.Provider>

const value = useContext(MyContext);            // 3. tune in, any depth
```

Any component below the Provider can call `useContext` and get the
value — no props involved. When the Provider's `value` changes, every
component that reads that context re-renders. Project 34's LEARN.md
goes deeper.

### A "store" (the big idea of this project)

A **store** is a single shared home for app-wide state, with rules for
changing it. The recipe here:

1. a **reducer** — the rulebook (how state may change);
2. a **Provider component** — the scope (who can access it);
3. **custom hooks** — the access points (`useCart()` to read,
   `useCartDispatch()` to write).

This is, genuinely, the core architecture of famous libraries like
Redux. Build it once by hand and those libraries stop being magic.

### Custom hooks

A **custom hook** is just a function whose name starts with `use` and
that calls other hooks inside. It packages hook logic for reuse:

```js
function useCart() {
  const cart = useContext(CartContext);
  if (cart === null) throw new Error('useCart needs <CartProvider>');
  return cart;
}
```

The `throw` is a deliberate design choice: if someone uses the hook
outside the Provider, they get a clear error immediately ("fail
loudly") instead of a mysterious `null` crash three files later.

### The children prop

`children` is whatever you put *between* a component's tags. A
Provider component uses it to wrap the whole app without knowing
what's inside:

```jsx
function CartProvider({ children }) {
  // ...set up state...
  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}
// used as: <CartProvider><App stuff /></CartProvider>
```

### Splitting read and write into two contexts

Key React facts: (1) a context re-renders its readers when its value
changes; (2) the `dispatch` function from `useReducer` is **guaranteed
by React to be the same function forever** — it never changes.

So the refactor uses TWO contexts: one carrying `cart` (changes often)
and one carrying `dispatch` (never changes). A component that only
*writes* — like an "add" button — subscribes only to the dispatch
context, so it **never re-renders when the cart changes**. Free
performance, from structure alone. (Project 33 teaches this splitting.)

### Small syntax notes

- `cart.find(line => line.id === action.id)` — first matching item, or
  `undefined`.
- `cart.filter(line => line.id !== action.id)` — new array without the
  matching items.
- `cart.reduce((sum, line) => sum + line.qty, 0)` — fold the array to
  one number (here: total quantity).
- `{ ...line, qty: line.qty + 1 }` — copy an object with one field
  changed (immutability — never edit state in place).

## 3. Walking through the original code

The reducer is genuinely good — keep reading it until it feels plain:

```js
case 'added': {
  const existing = cart.find((line) => line.id === action.id);
  if (existing) {
    return cart.map((line) =>
      line.id === action.id ? { ...line, qty: line.qty + 1 } : line);
  }
  return [...cart, { id: action.id, name: action.name, qty: 1 }];
}
```

"Added": if the product is already in the cart, bump its quantity
(building new objects, not editing); otherwise append a new line with
qty 1. "Removed" filters the line out.

`App` owns the state and starts the hand-carrying:

```js
const [cart, dispatch] = useReducer(cartReducer, []);
return <Layout cart={cart} dispatch={dispatch} />;
```

Then look at the signatures going down the tree:

```js
function Layout({ cart, dispatch }) { ... }      // courier
function Header({ cart, dispatch }) { ... }      // courier (uses cart only)
function ProductPage({ cart, dispatch }) { ... } // courier
```

`Layout` receives both values and does nothing with them except pass
them on. `Header` passes `cart` to `CartBadge` and ignores `dispatch`
entirely — yet still has to accept it. `ProductPage` forwards to three
children. Only the leaves actually *use* the values:

```js
function ProductButton({ id, name, dispatch }) {
  return (
    <button onClick={() => dispatch({ type: 'added', id, name })}>
      add {name}
    </button>
  );
}
```

Count them: `cart` and `dispatch` appear in **seven** component
signatures, and three components are pure couriers.

## 4. What's wrong with it (in beginner terms)

Nothing is wrong on screen — the shop works. The pain is in the code's
future.

**The courier tax.** Imagine you want to add a "checkout" button in
the footer, three levels deep. To give it `dispatch`, you must edit
the footer, its parent, and its grandparent — three files changed to
deliver one value. Multiply that by every new cart consumer.

**Refactors re-plumb everything.** Move `CartBadge` from the Header
into a new Sidebar? Now Sidebar and everything above it need
`cart` added to their signatures, and Header can drop it. The plumbing
changes every time the layout changes — even though the *logic*
didn't change at all.

**Misleading signatures.** `Header({ cart, dispatch })` *looks* like
Header uses both. It uses neither directly. Readers of the code can't
tell couriers from consumers without tracing every prop.

**What's NOT wrong:** the reducer. The state rules were already pure
and testable. This project is about *distribution* — how state reaches
components — not about the rules themselves. (Project 34 showed this
problem with one value; here it's worse because there are two.)

## 5. Try it yourself first!

1. **Vague:** the leaves need `cart` and `dispatch`, but the middle
   layers don't. Is there a React feature that skips the middle?
2. **Warmer:** Context. Create one with `createContext`, wrap the app
   in a `Provider`, and have `CartBadge`, `ProductButton`, and
   `CartList` read it with `useContext`. Delete the props.
3. **Warmer still:** don't scatter `useContext(CartContext)` calls.
   Write custom hooks — `useCart()` and `useCartDispatch()` — that do
   the `useContext` call and throw a clear error if there's no
   provider.
4. **The performance touch:** should `cart` and `dispatch` share one
   context? Remember: `dispatch` never changes, `cart` changes on
   every click. What happens to a button that only needs `dispatch`
   if it also subscribes to `cart`? Try two separate contexts.
5. **Check your work:** Layout, Header, and ProductPage should end
   with *zero* parameters.

## 6. Understanding the refactored solution

The store section is about 25 lines with four parts.

**The reducer** — unchanged, byte for byte. Rules and plumbing are
separate concerns; fixing the plumbing didn't touch the rules.

**Two contexts:**

```js
const CartContext = createContext(null);
const CartDispatchContext = createContext(null);
```

`null` is the default — the "you forgot the provider" signal the hooks
check for.

**The Provider packages the state:**

```js
function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, []);
  return (
    <CartContext.Provider value={cart}>
      <CartDispatchContext.Provider value={dispatch}>
        {children}
      </CartDispatchContext.Provider>
    </CartContext.Provider>
  );
}
```

One component now owns the cart *and* broadcasts it. Nesting the two
Providers just makes both values available to everything inside.

**Two hooks, failing loudly:**

```js
function useCart() {
  const cart = useContext(CartContext);
  if (cart === null) throw new Error('useCart needs <CartProvider>');
  return cart;
}
```

`useCartDispatch()` is the mirror image. Why hooks instead of raw
`useContext` everywhere? One place to change, one clear error message,
and the component code reads as intent: "this component uses the cart."

**The tree, de-plumbed.** `Layout()`, `Header()`, `ProductPage()` now
take no parameters at all. The consumers reach in directly:

```js
function ProductButton({ id, name }) {
  const dispatch = useCartDispatch(); // writes only
  ...
}
```

Because `ProductButton` reads only the dispatch context — whose value
never changes — it never re-renders when the cart updates. `CartBadge`
reads `useCart()`, so it *does* re-render on cart changes — which is
exactly right, it displays the count. Read/write splitting made the
"who re-renders" question a design decision instead of an accident.

**The honest scaling note** (printed on the page): real libraries add
conveniences — debugging tools, and finer-grained subscriptions
(context wakes *all* readers when the cart changes, even a component
that only cares about one line item). When you feel those needs, adopt
a library — and you'll recognize this exact recipe inside it.

## 7. Words you learned (glossary)

- **Store:** one shared home for app-wide state plus the rules and
  access points for it.
- **Reducer:** pure function `(state, action) => newState` — the
  rulebook.
- **Action:** object describing an event, e.g. `{ type: 'added', ... }`.
- **dispatch:** function that sends an action to the reducer; from
  `useReducer` it is stable (never changes identity).
- **Props:** values a parent passes into a child component.
- **Prop drilling:** passing props through components that don't use
  them, just to reach deeper ones.
- **Courier component:** a component that only forwards props.
- **Context:** React's mechanism for sharing a value with all
  descendants without props.
- **Provider:** the component form of a context that supplies its
  value: `<X.Provider value={...}>`.
- **useContext:** hook that reads the nearest provider's value.
- **children:** the prop holding whatever was nested between a
  component's tags.
- **Custom hook:** a `use...` function that wraps other hooks for
  reuse.
- **Fail loudly:** throw a clear error at the mistake, instead of
  letting a bad value cause confusion later.
- **Immutability:** building changed copies instead of editing state.
- **Subscription:** being signed up to re-render when a value changes.

## 8. Experiments to try on the plane (no internet needed)

Edit and reason offline; note the pages load React from a CDN (shared
library servers), so actually *running* them in a browser needs
internet on first load.

1. **Prove the buttons don't re-render.** In the refactor, add
   `console.log('button render', name)` inside `ProductButton`. Click
   "add Keyboard" a few times. Expected: the log appears on first load
   only — cart changes never re-run the buttons. Do the same in the
   original: it logs on every click.
2. **Merge the two contexts.** Broadcast `{ cart, dispatch }` in ONE
   context and read it everywhere. Expected: the shop still works, but
   your `ProductButton` log now fires on every cart change — you've
   re-created the problem project 33 warns about.
3. **Break the provider on purpose.** In the refactor, remove
   `<CartProvider>` from `App` (keep its children). Expected: a clear
   error — "useCart needs <CartProvider>" — the moment the page loads.
   That's the fail-loudly guard earning its keep.
4. **Add a new consumer with zero re-plumbing.** Write a
   `TotalItems()` component that calls `useCart()` and shows the item
   count; drop it inside `Layout`. Expected: it works immediately —
   you edited exactly one place. Then imagine doing this in the
   original (three signatures to touch).
5. **Add a 'cleared' action.** Extend `cartReducer` with
   `case 'cleared': return [];` and a "empty cart" button in
   `CartList` dispatching it. Expected: badge drops to 0. Notice the
   change touched only the rulebook and one leaf — no plumbing at all.
