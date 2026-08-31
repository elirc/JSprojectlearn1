# 📘 Learning Guide: Reactive State Store

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A **state store**: one small object that holds all of an app's data (its **state**), plus strict rules about how that data may change.

The example app is a shopping cart. Run the original with `node original.js` and it prints something like:

```
cart: keyboard
cart: keyboard, mouse
total: 70.20 (coupon)
cart: mouse
total: 26.10 (coupon)
```

Notice the bug baked into the demo: after removing the keyboard, the total was stale until someone manually patched in an extra render call. The refactor rebuilds this as a mini version of **Redux** — a famous state-management pattern — where stale totals become impossible.

## 2. Concepts you need first

### State
**State** is just "the data your program currently remembers" — here, `{ items: [], coupon: null }`. The whole project is about *who is allowed to change it, and how*.

### Mutation vs. immutability
**Mutating** means changing an object in place. **Immutable** style means never changing an object — you build a *new* one instead:

```js
const a = { count: 1 };
const b = { ...a, count: 2 };   // new object, a is untouched
console.log(a.count, b.count);  // prints: 1 2
```

`{ ...a }` is the **spread operator**: "copy all of `a`'s fields into this new object." `[...arr, x]` does the same for arrays (new array = old items + `x`).

Why bother? Because if objects never change, then `oldState === newState` (comparing **references** — whether two variables point at the exact same object) instantly tells you "nothing changed." Cheap change detection.

### Pure functions
A **pure function** always returns the same output for the same input and touches nothing outside itself — no printing, no editing globals:

```js
const double = (x) => x * 2;      // pure
let n = 0;
const bump = () => { n++; };      // NOT pure: changes outside state
console.log(double(4));           // prints: 8, every single time
```

Pure functions are trivial to test: call them, check the return value, done.

### Actions and reducers
An **action** is a plain object describing *what happened*: `{ type: 'item/added', name: 'kb', priceCents: 4900 }`. It's data, not code — so you can log it, save it, replay it.

A **reducer** is a pure function `(state, action) => newState`. It's the single brain that decides how every action changes state:

```js
function counter(state = 0, action) {
  if (action.type === 'inc') return state + 1;
  return state; // unknown actions change nothing
}
console.log(counter(5, { type: 'inc' })); // prints: 6
```

### switch statements
`switch` picks a branch by comparing one value against several `case`s — a tidy alternative to an if/else chain. Each `case` here ends with `return`, so there's no fall-through to worry about.

### The subscriber (observer) pattern
**Subscribing** means "call my function whenever something happens." The store keeps a list of listener functions and calls each one after every change:

```js
const listeners = new Set();
listeners.add(() => console.log("changed!"));
for (const fn of listeners) fn(); // prints: changed!
```

A **Set** is a collection that holds each value at most once — adding the same function twice stores it once. Subscribe returns an **unsubscribe function**: call it and your listener is removed.

### Closures
A **closure** is a function that remembers variables from where it was created, even after that place has finished running:

```js
function makeStore() {
  let secret = 42;
  return { get: () => secret };
}
console.log(makeStore().get()); // prints: 42 — secret is private but reachable
```

This is how `createStore` hides `state`: nothing outside can touch it except through the returned functions.

### reduce and reduceRight
`reduce` boils an array down to one value by feeding each element through a function; `reduceRight` does the same starting from the *end*:

```js
console.log([1, 2, 3].reduce((sum, n) => sum + n, 0));       // prints: 6
console.log(["a", "b"].reduceRight((acc, s) => acc + s, "")); // prints: "ba"
```

### Higher-order functions and currying
A **higher-order function** takes or returns functions. **Currying** means a function returning a function returning a function, each layer capturing one argument. Middleware uses the shape `store => next => action => ...` — three layers. It looks scary; it's just three nested closures.

### Derived data
**Derived data** is anything you can compute from state (like a total from item prices). The rule: *compute it fresh every time, never store it*. A stored copy can go stale; a computation can't.

## 3. Walking through the original code

The state is a shared global that anything can edit:

```js
var state = {
  items: [],
  coupon: null,
};
```

Each "operation" mutates state directly, then tries to remember every render call:

```js
function addItem(name, priceCents) {
  state.items.push({ name: name, priceCents: priceCents });
  renderCart();
  renderTotal();
}

function removeItem(name) {
  state.items = state.items.filter(function (i) { return i.name !== name; });
  renderCart();
  // ...forgot renderTotal(). The total now shows a deleted item.
}
```

`addItem` remembered both renders. `removeItem` forgot one — and nothing warns you.

Business rules live wherever mutation happens:

```js
function applyCoupon(code) {
  if (code === "SAVE10") state.coupon = 0.9;
  renderTotal(); // forgot renderCart(), which shows the coupon badge
}
```

"What counts as a valid coupon?" is answered right here, inline. If three files apply coupons, three files each have their own answer.

The render functions read state and print. The demo at the bottom adds items, applies a coupon, removes an item — then has to call `renderTotal()` by hand to fix the stale display, with the comment "that's the disease, not the cure."

## 4. What's wrong with it (in beginner terms)

**1. Global mutable state.** Anyone can write `state.items = []` from anywhere. *How it bites you:* one day `cart.items` is mysteriously empty. Who did it? Could be any line in the whole codebase. You have no suspect list — you have a phone book.

**2. Every mutation site must remember every render.** With M places that change state and N things to redraw, you have M×N chances to forget one. *How it bites you:* exactly what the demo shows — `removeItem` forgot `renderTotal()`, so the customer sees a total that still includes a deleted keyboard. The bug isn't a typo; it's the architecture demanding perfect memory forever.

**3. Business rules are scattered.** `applyCoupon` decides inline what a valid coupon is. Another screen adds its own coupon check with slightly different rules. *How it bites you:* marketing adds `SAVE25`; someone updates two of the three checks. Customers get different discounts depending on which button they clicked.

**4. Changes leave no trace.** Mutations don't funnel through any single point, so you can't log them. *How it bites you:* a user reports "my cart doubled everything." You'd love a log saying which changes happened in what order — but there's nowhere such a log could even be attached.

## 5. Try it yourself first!

Hints, vaguest first:

1. The core problem is that changes happen *everywhere*. What if there were exactly one function all changes had to pass through?
2. Describe each change as plain data (an object with a `type`), instead of calling a mutation function directly.
3. Write one pure function `(state, action) => newState` containing every rule — adding, removing, coupon validity. Never mutate; return new objects with `...` spread.
4. Build `createStore(reducer, initialState)` returning `{ getState, dispatch, subscribe }`. `dispatch` runs the reducer, replaces the state, then calls all subscribers. Now rendering is just one subscriber — impossible to forget.
5. Don't store the total. Write `totalCents(state)` that computes it on demand.
6. Stretch goal: let `createStore` accept wrapper functions ("middleware") that see each action before the store does — that's your logger.

## 6. Understanding the refactored solution

**`cart.js` — the brain.** `cartReducer` is a pure function with a `switch` on `action.type`. Adding an item builds a new state with a new items array (`[...state.items, newItem]`). The coupon rule lives in exactly one place — a `VALID_COUPONS` lookup table — and an invalid code returns `state` itself, *the same reference*, which is a checkable fact meaning "nothing changed." The `default` case returns state unchanged, so unknown action types are harmless. `totalCents(state)` computes the total fresh each call — derived data, never stored.

**`store.js` — the machinery.** `createStore(reducer, initialState, middlewares)` hides `state` in a closure. `getState` reads it. `subscribe(listener)` adds to a Set and returns an unsubscribe function. `baseDispatch`:

- validates the action (must be an object with a string `type` — garbage in fails loudly, not silently);
- refuses **re-entrant** dispatch (a reducer dispatching mid-reduce would mean state changed while being computed) via the `dispatching` flag, reset in a `finally`;
- runs the reducer to get the new state;
- notifies every listener — looping over a *copy* (`[...listeners]`) so a listener that unsubscribes mid-notify can't break the loop.

**The middleware onion.** A middleware has the curried shape `({getState, dispatch}) => (next) => (action) => ...`: given store access, given the *next* dispatch in line, return your wrapped dispatch. `reduceRight` assembles `[a, b]` into `a(b(baseDispatch))` — so `a` sees each action first, and `baseDispatch` runs last. Logging, crash reporting, and async support become wrappers, with the store and reducer untouched.

**The tests** (using Node's built-in `node:test` and `assert`) mirror the design:
- Reducer tests call `cartReducer` directly — no store, no UI — and check originals are untouched (immutability) and invalid coupons return the same reference.
- Store tests count listener calls (2 dispatches ⇒ 2 renders — rendering *can't* be forgotten), verify unsubscribe, and verify bad actions throw.
- Middleware tests build a five-line logger, check that order is first-middleware-first, and build a three-line **thunk**: a middleware that, when dispatch is given a *function* instead of an action, calls it with `dispatch` — turning async workflows ("fetch price, then add item") into something the store supports without changing a line of the store.

## 7. Words you learned (glossary)

- **State** — the data a program currently remembers.
- **Store** — the object that holds state and controls changes to it.
- **Mutation** — changing an object in place.
- **Immutable** — never changed; updates create new objects.
- **Spread (`...`)** — copies an object's/array's contents into a new one.
- **Reference** — which object a variable points at; `a === b` checks same-object.
- **Pure function** — same input ⇒ same output, no outside effects.
- **Action** — a plain data object describing one change (`{type: ...}`).
- **Reducer** — pure function `(state, action) => newState`; the one brain.
- **Dispatch** — the single door: send an action into the store.
- **Subscriber / listener** — a function called after every state change.
- **Unsubscribe function** — returned by subscribe; call it to stop listening.
- **Set** — a collection holding each value at most once.
- **Closure** — a function that remembers variables from its birthplace.
- **Higher-order function** — takes or returns functions.
- **Currying** — layered functions, each taking one argument (`a => b => c => ...`).
- **Middleware** — a wrapper around dispatch adding behavior (logging, async).
- **Thunk** — a function dispatched instead of an action, for async workflows.
- **Derived data** — values computed from state (totals), never stored.
- **Stale** — a stored copy that no longer matches the real data.
- **Re-entrant** — a function called again while it's still running.
- **Redux** — the popular library this pattern comes from.

## 8. Experiments to try on the plane (no internet needed)

All offline — just Node. Run tests with `node --test 59-state-store/refactored/`.

1. **Recreate the original's bug — and watch it be impossible.** After building a store in a scratch file, subscribe once: `store.subscribe(() => console.log('total:', totalCents(store.getState())))`. Dispatch add, add, coupon, remove. Expected: the total prints correctly after *every* change, including the remove — there is no render call to forget.
2. **Add a `cart/cleared` action.** In `cart.js`, add a case returning `{ ...state, items: [] }`. Write a test: add two items, dispatch `cart/cleared`, assert `items.length === 0` and the coupon survived. Expected: passes — and notice you never touched `store.js`.
3. **Break immutability on purpose.** In the `'item/added'` case, replace the return with `state.items.push({...}); return state;`. Expected: the "add/remove items immutably" test fails, because `initialCart` itself got polluted. Undo it, and you've *seen* why mutation is banned.
4. **Build an action-history middleware.** `const history = []; const recorder = () => (next) => (action) => { history.push(action); return next(action); };` Pass it to `createStore`, dispatch a few actions, then `console.log(history)`. Expected: a full replayable log — the exact thing the README says the original "couldn't even attempt."
5. **Prove the invalid-coupon fact.** In a scratch file: `const s = cartReducer(initialCart, { type: 'coupon/applied', code: 'HAX' }); console.log(s === initialCart);` Expected: `true` — same reference, meaning "nothing changed" is detectable with one `===`.
