# 🏋️ Practice: Mini Store

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Everything here is checkable by reading and reasoning about your code — run the page later when you have internet, since React loads from a CDN.)

All exercises modify `refactored/index.html` unless they say otherwise.

## Exercises

### ⭐ 1. Take one off (warm-up)

Right now the "x" button nukes a whole line, however many you added. Add a `'decremented'` action to `cartReducer` that removes a *single* unit, and a "−" button next to each line in `CartList` that dispatches it. When the last unit goes, the line should disappear entirely — a `Mouse x0` row would be a lie. Decrementing an id that isn't in the cart must change nothing.

**Practices:** extending the rulebook — a new capability that touches the reducer and one leaf component, and no plumbing at all.

**Hint:** three cases in order: not found → return `cart` unchanged; `qty === 1` → `filter` the line out; otherwise → `map` with `{ ...line, qty: line.qty - 1 }`.

**Expected:** add Keyboard twice and Mouse once (`🛒 3`). Press "−" on Keyboard: `Keyboard x1`, badge `🛒 2`. Press "−" on Mouse: the Mouse row vanishes, badge `🛒 1`. The "x" button still removes the whole line in one press.

### ⭐⭐ 2. Predict who re-renders (core)

Put `console.log` at the top of `Layout`, `Header`, `CartBadge`, `ProductPage`, `ProductButton` and `CartList`. Now, on paper: which of them log when you click "add Keyboard" once? Then do it again for a variant where `CartProvider` renders the tree itself instead of accepting it:

```jsx
function CartProvider() {                    // note: no children prop
  const [cart, dispatch] = useReducer(cartReducer, []);
  return (
    <CartContext.Provider value={cart}>
      <CartDispatchContext.Provider value={dispatch}>
        <Layout />
      </CartDispatchContext.Provider>
    </CartContext.Provider>
  );
}
```

Write both lists and, for each component, the reason it did or didn't re-render.

**Practices:** the two separate reasons a component re-renders — a context it reads changed, or its parent re-rendered — and the element-identity bailout that `children` buys you.

**Hint:** in the current code, `App` doesn't re-render when the cart changes, so the `<Layout />` element inside `children` is the *same object* React saw last time. What does React do with a child element that is `===` the previous one?

**Expected:** in the refactor exactly two components log; in the variant all six do — including `ProductButton`, even though it still reads only the never-changing dispatch context.

### ⭐⭐ 3. A quantity tag that doesn't wake the button (core)

Show how many of each product are in the cart, right next to its add button: `add Keyboard  in cart: 2`. The trap is obvious once you see it — calling `useCart()` inside `ProductButton` would subscribe the button to every cart change and undo the read/write split the refactor is built on. Get the number on screen with `ProductButton` still logging only once.

**Practices:** pushing a subscription down to the smallest component that needs it, instead of up to the nearest convenient one.

**Hint:** a component's *children* can subscribe to things it doesn't. Make a `QtyTag` that takes an `id` prop and does its own `useCart()`.

**Expected:** with the logs from exercise 2 still in place, adding Keyboards prints only `QtyTag` lines — never `button render Keyboard`. The Keyboard tag counts up; the Mouse tag stays hidden until you add a Mouse. (You will notice the *Mouse* tag logging on Keyboard clicks too. That's real, it's the limit exercise 5 attacks, and it is not a bug in your code.)

### ⭐⭐ 4. The optimisation that stops the badge (core)

A teammate noticed `'added'` does a whole `map` just to bump one number, and "fixed" it:

```js
case 'added': {
  const existing = cart.find((line) => line.id === action.id);
  if (existing) {
    existing.qty += 1;   // much faster, no copying!
    return cart;
  }
  return [...cart, { id: action.id, name: action.name, qty: 1 }];
}
```

Click "add Keyboard" three times, then "add Mouse" once, and write down exactly what the badge and the list show after each of the four clicks. Then fix it.

**Practices:** why `useReducer` needs a *new* reference to believe you — the mutation trap of project 10, met inside a store.

**Hint:** `useReducer` compares the reducer's result to the current state. If they're the same object, React has nothing to re-render *for* — even though the object's insides quietly changed.

**Expected:** click 1 → `🛒 1`, `Keyboard x1`. Clicks 2 and 3 → the screen doesn't move at all. Click 4 → the Mouse arrives and the Keyboard line jumps straight to `x3`, badge `🛒 4`. The data was right the whole time; nobody was told.

### ⭐⭐⭐ 5. Per-field subscriptions (challenge)

The honest scaling note on the page says real stores can wake only the components whose *slice* changed, while context wakes every reader. Build that. Replace the two contexts with one plain JavaScript store object — `getState`, `dispatch`, `subscribe(listener)` returning an unsubscribe — created once, held in a single context, and read through `useSyncExternalStore` with a selector: `useCartSelector(cart => ...)`. Keep `cartReducer` byte-for-byte identical.

**Practices:** the subscription model behind Redux and Zustand, and the one rule `useSyncExternalStore` enforces — `getSnapshot` must return an `Object.is`-stable value when nothing changed.

**Hint:** `useSyncExternalStore(store.subscribe, () => selector(store.getState()))`. Make sure `store.subscribe` is the *same function* on every render (create the store once with `useState(() => createStore(...))`), and make sure your selectors return numbers or objects that already exist in state — never a fresh `{...}` or `.map(...)`.

**Expected:** the shop behaves identically, but the logs change shape: adding Keyboards re-renders the Keyboard `QtyTag` and the badge, and leaves the Mouse `QtyTag` alone completely. Adding a Mouse re-renders the Mouse tag and the badge. A selector like `cart => cart.map(l => l.name)` instead produces a console warning about `getSnapshot` and an app that re-renders forever — try it once, then don't.

## Solutions

### 1. Take one off

```js
case 'decremented': {
  const existing = cart.find((line) => line.id === action.id);
  if (!existing) return cart;                                   // nothing to do
  if (existing.qty === 1) return cart.filter((line) => line.id !== action.id);
  return cart.map((line) =>
    line.id === action.id ? { ...line, qty: line.qty - 1 } : line);
}
```

```jsx
<li key={line.id}>
  {line.name} x{line.qty}{' '}
  <button onClick={() => dispatch({ type: 'decremented', id: line.id })}>−</button>{' '}
  <button onClick={() => dispatch({ type: 'removed', id: line.id })}>x</button>
</li>
```

**Why:** the three branches are the three honest answers to "take one off", and each builds new values instead of editing old ones — `filter` and `map` both return fresh arrays, and the `{ ...line, qty: line.qty - 1 }` copy leaves the archived line object untouched. Returning `cart` itself in the not-found case is the standard no-op contract: same reference in, same reference out, so React re-renders nothing. Notice the total damage: one reducer case and one button. `Layout`, `Header` and `ProductPage` never learned that quantities can now go down.

### 2. Predict who re-renders

**The refactor:** `CartBadge` and `CartList`, and nothing else. `CartProvider` itself re-runs (it owns the `useReducer` state), but the `children` it renders is the *same element object* `App` built on the first render — `App` never re-rendered, so nothing rebuilt it — and React skips re-rendering a child whose element is identical to last time. So the whole `Layout → Header → ProductPage → ProductButton` subtree is bailed out of. `CartBadge` and `CartList` still re-render, because context updates reach consumers directly, straight through parents that bailed out. `ProductButton` reads `CartDispatchContext`, whose value is the same `dispatch` function forever, so it is never notified.

**The variant:** all six. `CartProvider` re-renders and builds a *brand-new* `<Layout />` element, so `Layout` re-renders, which builds new `<Header />` and `<ProductPage />` elements, and so on down to both `ProductButton`s.

**Why:** a component re-renders for exactly two reasons — a context (or state) it reads changed, or its parent re-rendered and handed it a new element. Reading only the stable dispatch context protects `ProductButton` from the first reason and does nothing whatsoever about the second; the `children` prop is what protects it from the second, by keeping the element identity stable across the provider's own re-renders. That's why "pass the tree in as `children`" is a real performance pattern and not just tidiness, and why the variant silently throws away the split the README brags about.

### 3. A quantity tag that doesn't wake the button

```jsx
function QtyTag({ id }) {
  const cart = useCart();
  const line = cart.find((l) => l.id === id);
  if (!line) return null;
  return <small style={{ color: '#666' }}> in cart: {line.qty}</small>;
}

function ProductButton({ id, name }) {
  const dispatch = useCartDispatch(); // still writes only
  return (
    <span>
      <button onClick={() => dispatch({ type: 'added', id, name })}>add {name}</button>
      <QtyTag id={id} />
    </span>
  );
}
```

**Why:** `ProductButton` renders `<QtyTag id={id} />` but doesn't read the cart, so it stays subscribed only to the never-changing dispatch context; the tag underneath does the subscribing. A parent re-rendering forces its children to re-render, but a child re-rendering never forces its parent to — so pushing the subscription *down* is always safe and pushing it *up* is what costs you. The `return null` guard keeps the tag silent for products that aren't in the cart (project 04's job). The remaining wart is honest and worth feeling: both tags wake on any cart change, because context has one channel and no idea which line you care about.

### 4. The optimisation that stops the badge

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

**Why:** `useReducer` decides whether to re-render by comparing the reducer's return value with the current state. The "optimisation" returns `cart` — the very array React is already holding — so React concludes nothing happened and skips the render entirely, while `existing.qty` climbs in secret. Clicks 2 and 3 therefore do real damage to the data and nothing to the screen; click 4 takes the `[...cart, ...]` path, produces a genuinely new array, and the accumulated lie surfaces all at once. This is why immutability isn't a style preference in React: the new reference *is* the notification, and mutation is how you change state without telling anyone.

### 5. Per-field subscriptions

```jsx
const { useState, useContext, createContext, useSyncExternalStore } = React;

function createStore(reducer, initialState) {
  let state = initialState;
  const listeners = new Set();
  return {
    getState: () => state,
    dispatch(action) {
      const next = reducer(state, action);
      if (next === state) return;                 // no-op: wake nobody
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);    // React calls this on unmount
    },
  };
}

const StoreContext = createContext(null);

function CartProvider({ children }) {
  const [store] = useState(() => createStore(cartReducer, [])); // created exactly once
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

function useStore() {
  const store = useContext(StoreContext);
  if (store === null) throw new Error('useStore needs <CartProvider>');
  return store;
}

function useCartSelector(selector) {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

function useCartDispatch() {
  return useStore().dispatch;
}

// consumers pick exactly the slice they need:
function CartBadge() {
  const count = useCartSelector((cart) => cart.reduce((sum, line) => sum + line.qty, 0));
  return <span>🛒 {count}</span>;
}

function QtyTag({ id }) {
  const qty = useCartSelector((cart) => cart.find((l) => l.id === id)?.qty ?? 0);
  if (qty === 0) return null;
  return <small style={{ color: '#666' }}> in cart: {qty}</small>;
}

function CartList() {
  const cart = useCartSelector((cart) => cart);   // the whole array, as-is
  const dispatch = useCartDispatch();
  return (
    <ul>
      {cart.map((line) => (
        <li key={line.id}>
          {line.name} x{line.qty}{' '}
          <button onClick={() => dispatch({ type: 'removed', id: line.id })}>x</button>
        </li>
      ))}
    </ul>
  );
}
```

**Why:** the store's value now lives in a closure variable instead of React state, and the context carries only the store *object* — which never changes, so no component re-renders because of the context any more. Updates travel the other road: `dispatch` notifies every listener, `useSyncExternalStore` re-reads that component's snapshot, and React re-renders only where `Object.is(oldSnapshot, newSnapshot)` is false. The Mouse tag's snapshot is a number that didn't move, so it sits out every Keyboard click — the per-field subscription context can't do. Two rules keep it honest: `store.subscribe` must be one stable function (hence `useState(() => createStore(...))`, which runs the initializer once rather than building a new store per render), and every selector must return something that already exists — a number, or an object straight out of state. Return `cart.map(l => l.name)` and each call produces an equal-but-new array, `Object.is` says "changed" forever, and React loops and warns that `getSnapshot` should be cached.
