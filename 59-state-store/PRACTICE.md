# 🏋️ Practice: Reactive State Store

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

For each exercise, create a scratch file (e.g. `practice.test.js`) inside `refactored/` and run it with `node --test 59-state-store/refactored/practice.test.js`. Exercises 2 and 3 edit `cart.js` — undo your edits (or keep a backup) when you're done.

## Exercises

### ⭐ 1. An `itemCount` selector (warm-up)
Write a new derived-data function `itemCount(state)` in the style of `totalCents`: it returns how many items are in the cart, computed fresh from state every call. Test it: after dispatching two `item/added` actions, `itemCount(store.getState())` must be `2`, and `itemCount(initialCart)` must be `0`.
What it practices: derived data is computed from state, never stored beside it.
Hint: it's a one-liner reading `state.items`.

### ⭐⭐ 2. A `coupon/removed` action (core)
Add a `coupon/removed` case to `cartReducer`. Removing a coupon returns a new state with `coupon: null` — but if there is no coupon to remove, return `state` itself (the *same reference*), just like an invalid coupon code does. Expected: after applying `SAVE10` then dispatching `{ type: 'coupon/removed' }`, `state.coupon` is `null` and `items` are untouched; and `cartReducer(initialCart, { type: 'coupon/removed' }) === initialCart` is `true`.
What it practices: extending the one brain, plus the same-reference "nothing changed" contract.
Hint: two branches — one spread, one `return state;`.

### ⭐⭐ 3. Reject duplicate item names (core)
Change the `'item/added'` case so that adding an item whose `name` already exists in the cart changes nothing — return the same state reference. Expected: dispatching `item/added` for `'kb'` twice leaves `items.length === 1`, and the reducer returns the exact same object for the second call (checkable with `===`).
What it practices: business rules live in the reducer, and no-ops return the same reference.
Hint: `state.items.some((i) => i.name === action.name)` before building anything new.

### ⭐⭐ 4. A `once(store, fn)` helper (core)
Write `once(store, fn)`: it subscribes `fn` so that it runs after the *next* state change only, then automatically unsubscribes itself. Expected: with `let calls = 0; once(store, () => calls++)`, dispatching three valid actions leaves `calls === 1`.
What it practices: the unsubscribe-handle contract, and closures that capture their own teardown.
Hint: `subscribe` returns the off-switch — call it *inside* the listener, before running `fn`.

### ⭐⭐⭐ 5. A validator middleware (challenge)
Write a middleware that refuses bad merchandise: any `item/added` action whose `priceCents` isn't a positive integer is swallowed — `next` is never called, so the reducer never sees it and subscribers are not notified. Expected: after dispatching `{ type: 'item/added', name: 'free', priceCents: -100 }`, `store.getState() === initialCart` (same reference!) and a subscribed counter is still `0`; a valid add afterwards works normally.
What it practices: the middleware onion — cross-cutting rules without touching store or reducer.
Hint: shape is `() => (next) => (action) => ...`; "swallow" means `return action` instead of `return next(action)`.

### ⭐⭐⭐ 6. Undo, as a higher-order reducer (challenge)
Write `undoable(reducer)`: it takes any reducer and returns a new reducer whose state has the shape `{ past: [], present }`. Normal actions push the old `present` onto `past` and store the new result; a `{ type: 'undo' }` action pops the last past state back into `present`; undo on an empty history is a safe no-op. Bonus rule: if the inner reducer returned the *same reference* (a no-op like an invalid coupon), don't pollute the history. Expected: add item (4900) → apply `SAVE10` → total is 4410; one `undo` → coupon gone, total 4900; second `undo` → empty cart; third `undo` → still empty, no crash.
What it practices: reducers are just functions — so they compose, and "state changes are data" makes undo almost free.
Hint: create the store with `createStore(undoable(cartReducer), { past: [], present: initialCart })`; read totals via `store.getState().present`.

## Solutions

### 1. `itemCount`
```js
export function itemCount(state) {
  return state.items.length;
}
```
WHY: Same principle as `totalCents` — derived data is a pure computation over state. A stored counter could drift out of sync with `items`; a computed one cannot go stale.

### 2. `coupon/removed`
```js
// in cartReducer's switch:
case 'coupon/removed':
  return state.coupon === null ? state : { ...state, coupon: null };
```
WHY: All coupon rules stay in the one tested brain. Returning `state` itself when there's nothing to remove keeps the project's "no change = same reference" contract, which makes no-ops detectable with a single `===` — the exact trick the invalid-coupon test relies on.

### 3. Duplicate names rejected
```js
case 'item/added':
  if (state.items.some((i) => i.name === action.name)) return state; // no-op
  return {
    ...state,
    items: [...state.items, { name: action.name, priceCents: action.priceCents }],
  };
```
WHY: In the original, this rule would have to be re-decided at every mutation site. In the reducer it exists exactly once, is pure, and is testable with two dispatches and one `===` — no store, no UI.

### 4. `once`
```js
function once(store, fn) {
  const off = store.subscribe(() => {
    off();  // tear down FIRST, so a dispatch inside fn can't re-trigger us
    fn();
  });
  return off;
}
```
WHY: This is the unsubscribe-handle contract (project 38) put to work: the listener closes over its own off-switch. It only works safely because `baseDispatch` notifies a *copy* of the listener set — deleting mid-notify can't break the loop.

### 5. Validator middleware
```js
const validator = () => (next) => (action) => {
  if (
    action.type === 'item/added' &&
    !(Number.isInteger(action.priceCents) && action.priceCents > 0)
  ) {
    return action; // refused: the reducer never sees it
  }
  return next(action);
};
const store = createStore(cartReducer, initialCart, [validator]);
```
WHY: Because actions are plain data flowing through one door, a gatekeeper is three lines of middleware — no edits to `store.js` or `cart.js`. Asserting `store.getState() === initialCart` afterwards reuses the same-reference fact: nothing was dispatched, so nothing changed and nobody re-rendered.

### 6. `undoable`
```js
function undoable(reducer) {
  return (state, action) => {
    if (action.type === 'undo') {
      return state.past.length === 0
        ? state
        : { past: state.past.slice(0, -1), present: state.past.at(-1) };
    }
    const next = reducer(state.present, action);
    return next === state.present
      ? state // inner no-op: keep history clean
      : { past: [...state.past, state.present], present: next };
  };
}

const store = createStore(undoable(cartReducer), { past: [], present: initialCart });
store.dispatch({ type: 'item/added', name: 'kb', priceCents: 4900 });
store.dispatch({ type: 'coupon/applied', code: 'SAVE10' });
// totalCents(store.getState().present) === 4410
store.dispatch({ type: 'undo' });
// coupon is null again, total 4900
store.dispatch({ type: 'undo' });
// items: [] — and further undos are safe no-ops
```
WHY: This is the README's promise ("you get undo almost for free") made concrete. Because the reducer is pure and every past state is an immutable snapshot, "history" is just an array of old references — no copying, no store changes. The same-reference check from exercise 2/3 pays off again: no-op actions are detected with `===` and never pollute the undo stack. (Verified by running it under Node.)
