# 🏋️ Practice: useSyncExternalStore

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Running the HTML pages needs the CDN, but the store is plain JavaScript: `node --test store.test.js` from inside `refactored/` works with no internet at all.) The store lives twice — in `refactored/store.js`, which the Node tests import, and as a copy inside `refactored/index.html`, which the browser runs — so when an exercise changes the store, change both.

## Exercises

### ⭐ 1. A reset button, tested first (warm-up)

Add `reset()` to `createStore`: it puts the store back to the value it was created with and notifies everyone. Resetting a store that is *already* at its initial value must notify nobody — same rule as `update`. Write the Node tests before the browser button, then wire a "reset" button into the refactored page.

**Practices:** extending a store while keeping its one honest promise — no change, no notification — and proving it in Node instead of by clicking.

**Hint:** `createStore` already closes over `initialValue`; you don't need to store it anywhere new. And you already have a function that does "set the value, notify if it moved" — reuse it rather than re-implementing the comparison.

**Expected:** `node --test store.test.js` passes with your three new tests. In the browser, press "+1" three times then "reset": every panel drops to 0 together, and pressing "reset" a second time changes nothing at all (add a `console.log` in a listener to confirm it isn't even called).

### ⭐⭐ 2. Predict who re-renders and what they print (core)

On paper, for a freshly loaded page with the store at 0 and the extra panel visible. Press **"+1" exactly once**, then press **"re-render App" once**. For each page, write down after *each* click: which components re-rendered, the number in each panel, and what the `panels agree?` line says.

Do the original first, then the refactor. For every component, give the reason it did or did not re-render.

**Practices:** the two reasons a component re-renders — something it subscribes to changed, or its parent re-rendered — and what it costs when a component that *displays* a value subscribes to nothing.

**Hint:** `App` holds only `showLeaky`/`forceRender`; it never reads the store. So when the store changes, does `App` re-render? And if `App` doesn't re-render, what happens to a child that has no subscription of its own?

**Expected:** in the original the two clicks produce a ❌ and then a ✅ — and the ✅ arrives without a single line of the bug being fixed. In the refactor both clicks leave the page saying ✅, and the second click changes nothing visible whatsoever.

### ⭐⭐ 3. The snapshot that never stops changing (planted bug) (core)

A teammate wants the panels to show the count *and* how many listeners are live, so they "improve" the inlined store in `refactored/index.html`:

```js
getSnapshot: () => ({ count: state, listeners: listeners.size }),
```

and read `snapshot.count` in the panels. Predict what the page does before you try it. Then explain the mechanism in one sentence, and fix it so the panels can still show both numbers.

**Practices:** rule 1 of the contract — `getSnapshot` must be `Object.is`-stable when nothing changed — and the difference between *deriving a value* and *storing one*.

**Hint:** React calls `getSnapshot`, compares the result to the previous one, and re-renders if they differ. What does `{} === {}` evaluate to? Two ways out: keep the object *in* `state` so it's the same reference until something really changes, or select a primitive per component.

**Expected:** the page hangs or spins on load and the console warns that the result of `getSnapshot` should be cached to avoid an infinite loop. After the fix the two numbers appear and the page is calm.

### ⭐⭐ 4. A store you didn't write: `navigator.onLine` (core)

The browser already keeps a piece of state you can't put in `useState`: whether you have a network connection. It publishes changes as `online` and `offline` events on `window`. Build `useOnlineStatus()` on top of it with `useSyncExternalStore`, and show "🟢 online / 🔴 offline" at the top of the refactored page. Pass the third argument, `getServerSnapshot`, too, and say in a comment why it exists.

**Practices:** recognising that "external store" is a *shape*, not a library — anything with subscribe + read qualifies — plus the third argument you'll need the first time you server-render.

**Hint:** `subscribe` here adds two `window` listeners and returns a function that removes both. `getSnapshot` is just `() => navigator.onLine`. Define both **outside** your component so their identities are stable (rule 2). Test it by toggling your machine's wifi, or by running `window.dispatchEvent(new Event('offline'))` in the console.

**Expected:** the badge flips the instant connectivity changes, with no polling and no effect of your own. Without `getServerSnapshot`, a server render would crash on `navigator` — the argument exists so the server can answer "assume online" and the browser can correct it on hydration.

### ⭐⭐⭐ 5. Per-slice subscriptions with selectors (challenge)

Make the store hold `{ keyboards: 0, mice: 0 }` with `add('keyboards')`-style updates, and render two counters. Right now *every* subscribed component re-renders on *every* update — the same limitation project 41 hit with context. Fix it with a selector:

```js
const keyboards = useStoreSelector((s) => s.keyboards);
```

so the keyboards counter sits out every change to `mice`. Then make it survive a selector that builds a new value, like `(s) => Object.keys(s)`, by accepting an optional equality function. Put the caching logic in `store.js` as a pure function so the Node tests can hold it to account.

**Practices:** the caching layer real store libraries put between `getSnapshot` and your selector — and why `useSyncExternalStore` alone can't do this for you.

**Hint:** you cannot pass `() => selector(store.getSnapshot())` straight to the hook: for object-returning selectors that's a fresh value every call (exercise 3's bug). Build a `makeSelectorSnapshot(store, selector, isEqual)` that remembers the last store snapshot *and* the last selected value, and returns the **previous** selected value whenever the new one is equal. Create it once per component with `useMemo(..., [])`.

**Expected:** `console.log` in each counter shows adding a keyboard re-rendering only the keyboards counter. With `(s) => Object.keys(s)` and a shallow `isEqual`, the selector returns the identical array reference across unrelated updates, so that component never re-renders — and without `isEqual` it would re-render on every update forever.

## Solutions

### 1. A reset button, tested first

```js
export function createStore(initialValue) {
  let state = initialValue;
  const listeners = new Set();

  const api = {
    getSnapshot: () => state,
    subscribe(listener) { /* unchanged */ },
    listenerCount: () => listeners.size,
    update(next) { /* unchanged */ },
    reset() { return api.update(initialValue); },   // one line, one source of truth
  };
  return api;
}
```

```js
test('reset returns the store to its initial value', () => {
  const s = createStore(5);
  s.update(42);
  assert.equal(s.reset(), true);
  assert.equal(s.getSnapshot(), 5);
});

test('resetting an untouched store notifies nobody', () => {
  const s = createStore(5);
  const listener = spy();
  s.subscribe(listener);
  assert.equal(s.reset(), false);
  assert.equal(listener.calls, 0);
});

test('reset notifies every subscriber when it does move', () => {
  const s = createStore(0);
  const a = spy(), b = spy();
  s.subscribe(a); s.subscribe(b);
  s.update(9);
  s.reset();
  assert.equal(a.calls, 2);
  assert.equal(b.calls, 2);
});
```

**Why:** `reset` delegates to `update` instead of assigning `state` itself, so the "did it actually move?" comparison exists in exactly one place. Write it the other way — `state = initialValue; notify();` — and you have two update paths, one of which wakes every component to tell it nothing happened. The tests are the interesting part of this exercise: three rules, three assertions, no browser. That's the whole argument for keeping `store.js` free of React.

### 2. Predict who re-renders and what they print

**The original, after "+1":** `store.update` runs the listeners; the three subscribed components — `SubscribedPanel`, `LeakyPanel` and `Status` — each call `setValue`, so those three re-render. `App` does not: it reads `showLeaky` and `forceRender`, neither of which changed. `DirectPanel` does not either — it has no subscription, and its parent didn't re-render, so nothing on earth tells it to. Subscribed panel: **1**. Direct panel: still **0**. The line reads **❌ no — subscribed panel shows 1, direct panel shows 0**.

**The original, after "re-render App":** `forceRender` changes `App`'s state, so `App` re-renders and rebuilds every child element. All four children re-render, and `DirectPanel` re-reads `store.getSnapshot()` — now 1. The line reads **✅ yes**.

**The refactor, after "+1":** the store notifies React, which synchronously re-renders every component holding a `useSyncExternalStore` subscription: `PanelA`, `PanelB`, the toggleable panel, and `Status`. `App` again does not re-render. Every panel shows **1**; the line reads **✅ yes**.

**The refactor, after "re-render App":** `App` re-renders and all four children re-render, read the same snapshot they already had, and paint identical output. Nothing on screen changes.

**Why:** the original's ✅ on the second click is the point of the exercise. Nothing was fixed — an unrelated state change happened to re-render a component that reads a mutable variable during render, and it *coincidentally* picked up the right number. That's what makes this class of bug so durable in real codebases: it appears under some interaction orders and vanishes under others, so it gets filed as "couldn't reproduce". `DirectPanel` displays a value it never subscribed to, and displaying without subscribing is the bug, whatever the screen happens to show at any given moment.

### 3. The snapshot that never stops changing

```js
// The fix: put the object IN state, so its reference changes only when
// the contents actually do. createStore is otherwise untouched.
const store = createStore({ count: 0, listeners: 0 });

// getSnapshot: () => state   — the same object until update() runs
store.update((s) => ({ ...s, count: s.count + 1 }));
```

**Why:** `() => ({ count: state, listeners: listeners.size })` builds a brand-new object on every call, and `Object.is({}, {})` is `false`, so React's "did the snapshot change?" check answers yes *every single time it asks* — including the check it does immediately after re-rendering. Render, compare, differ, render, compare, differ: an infinite loop, which React eventually stops with a warning telling you to cache `getSnapshot`. The deeper lesson is that `getSnapshot` is a **read**, not a computation: it must hand back something that already exists. Derive things above it (store the object in state) or below it (let each component select a primitive), never inside it.

### 4. A store you didn't write: `navigator.onLine`

```js
// Defined once, at module level: both functions keep stable identities,
// which is rule 2 of the contract.
const onlineStore = {
  subscribe(onStoreChange) {
    window.addEventListener('online', onStoreChange);
    window.addEventListener('offline', onStoreChange);
    return () => {
      window.removeEventListener('online', onStoreChange);
      window.removeEventListener('offline', onStoreChange);
    };
  },
  getSnapshot: () => navigator.onLine,   // a boolean: Object.is-stable for free
  // On a server there is no `navigator`. This is the value the HTML is
  // rendered with; the browser re-reads the real one on hydration.
  getServerSnapshot: () => true,
};

function useOnlineStatus() {
  return useSyncExternalStore(
    onlineStore.subscribe,
    onlineStore.getSnapshot,
    onlineStore.getServerSnapshot,
  );
}

function OnlineBadge() {
  const online = useOnlineStatus();
  return <span>{online ? '🟢 online' : '🔴 offline'}</span>;
}
```

**Why:** nothing here is a "store" in the library sense, and yet it fits the contract perfectly — a way to be told about changes, and a way to read the current value. That's all `useSyncExternalStore` ever wanted, which is why the same six lines cover `matchMedia`, the URL, `localStorage`, and a websocket. Note what you did *not* write: no `useState` holding a copy, no effect, no cleanup you could forget, and no risk of the badge disagreeing with another component reading the same thing. `getSnapshot` returning a boolean satisfies rule 1 without any effort, because primitives compare by value — a reminder that the snapshot-stability rule only bites when you build objects.

### 5. Per-slice subscriptions with selectors

```js
// store.js — pure, and therefore testable
export function makeSelectorSnapshot(store, selector, isEqual = Object.is) {
  let lastSnapshot;
  let lastSelected;
  let primed = false;

  return () => {
    const snapshot = store.getSnapshot();
    if (primed && Object.is(snapshot, lastSnapshot)) return lastSelected;

    const selected = selector(snapshot);
    lastSnapshot = snapshot;
    if (primed && isEqual(selected, lastSelected)) return lastSelected; // keep the OLD reference
    lastSelected = selected;
    primed = true;
    return selected;
  };
}

export const shallowEqualArrays = (a, b) =>
  Array.isArray(a) && Array.isArray(b) &&
  a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
```

```jsx
function useStoreSelector(selector, isEqual) {
  // Created once per component: the hook needs a stable getSnapshot.
  const getSelection = useMemo(() => makeSelectorSnapshot(store, selector, isEqual), []);
  return useSyncExternalStore(store.subscribe, getSelection);
}

function Counter({ name }) {
  const n = useStoreSelector((s) => s[name]);
  console.log('render', name);
  return <div className="box">{name}: <b>{n}</b></div>;
}
```

```js
test('a selector ignores updates to other slices', () => {
  const s = createStore({ keyboards: 0, mice: 0 });
  const get = makeSelectorSnapshot(s, (v) => v.keyboards);
  assert.equal(get(), 0);
  s.update((v) => ({ ...v, mice: v.mice + 1 }));
  assert.equal(get(), 0);                    // unchanged: no re-render
  s.update((v) => ({ ...v, keyboards: v.keyboards + 1 }));
  assert.equal(get(), 1);
});

test('an object-building selector keeps its reference with isEqual', () => {
  const s = createStore({ keyboards: 0, mice: 0 });
  const get = makeSelectorSnapshot(s, Object.keys, shallowEqualArrays);
  const first = get();
  s.update((v) => ({ ...v, mice: 1 }));
  assert.equal(get(), first);                // same array: React sees no change
});
```

**Why:** `useSyncExternalStore` compares whole snapshots, so it can only answer "did the store change?", never "did *my part* change?" — the per-slice question needs a memory of the last selected value, which is what `makeSelectorSnapshot` is. Two caches, in order: the cheap one skips the selector entirely while the store snapshot is untouched, and the `isEqual` one handles selectors that build fresh values by returning the *previous* reference when the contents match. That second cache is what makes `Object.keys` safe; without it you've written exercise 3's infinite loop by another route. Keeping the whole thing a pure function of `(store, selector, isEqual)` means the trickiest code in the project is also the easiest to test — no rendering, just call it and assert. And this is, essentially, what `useSyncExternalStoreWithSelector` and every Redux `useSelector` do for you; you now know what's inside.
