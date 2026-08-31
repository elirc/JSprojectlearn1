# 📘 Learning Guide: useSyncExternalStore

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A page with one number on it — a counter — displayed in two or three
panels at once, plus four buttons: "+1", "burst: 5 rapid updates",
"re-render App", and "hide/show panel".

The number does not live in React. It lives in a plain variable at the
top of the script, with a small object around it so other code can
watch it change. Every panel is trying to display that one variable.

In the original they don't all manage it. Press "+1" and the top panel
reads 1 while the panel beneath it still reads 0 — same number, same
screen, two answers. The page prints `panels agree? ❌ no` so you don't
have to squint, plus a live listener count that climbs and never falls.

In the refactor the panels are incapable of disagreeing and the
listener count matches the panels on screen exactly. The difference is
one hook.

## 2. Concepts you need first

### What "external store" means

Almost everything in this track so far kept state *inside* React:
`useState`, `useReducer`, context. React created those values, so it
knows the instant they change and can re-render for them.

An **external store** is state that lives somewhere else — React
doesn't own it and cannot see it move:

- a plain module-level variable (what this project uses);
- a browser API: `localStorage`, `navigator.onLine`, the current URL,
  `window.matchMedia('(prefers-color-scheme: dark)')`;
- a state library (Redux, Zustand, MobX) or a websocket pushing in.

They share one shape: something out there changes on its own schedule,
and your components must be looking at the current value.

### Publish/subscribe

Since React can't watch the variable, the store has to *announce*
changes. That's the **publish/subscribe** pattern (js#38's
EventEmitter, in miniature):

```js
const listeners = new Set();
let count = 0;

function subscribe(listener) {                 // "tell me when it changes"
  listeners.add(listener);
  return () => listeners.delete(listener);     // "stop telling me"
}

function update(next) {
  count = next;
  listeners.forEach((listener) => listener()); // announce
}
```

Two details that matter later: `subscribe` returns an **unsubscribe
function**, the only way back out of the Set, and listeners take no
arguments — a doorbell, not a delivery. "Something changed, go look."

### A snapshot

A **snapshot** is the store's current value, read on demand:
`getSnapshot()` returns whatever `count` is right now. The word is
deliberate — a photograph of a moving thing, possibly out of date the
instant after you take it. This whole project is about the gap between
taking that photograph and painting it.

### Tearing

**Tearing** is when one piece of data shows up as two different values
in the same painted frame: part of the screen says 3, another part says
5, and both are "the counter". The name comes from graphics — a monitor
that draws half of one video frame and half of the next produces an
image torn across the middle.

Tearing is a *consistency* bug, not a *staleness* bug: a screen that is
uniformly one update behind is merely late, but a half-updated screen
tells you two contradictory things and no user can tell which to
believe.

### Effects run after paint

Recall from project 18: `useEffect` callbacks run *after* React has
committed to the DOM and the browser has painted. That ordering makes
effects safe for subscriptions and cleanup — and wrong for *reading* a
value you are about to display.

## 3. Walking through the original code

The store is the pub/sub object from section 2, plus a `burst()` that
fires five `update` calls through `setTimeout(..., 0)` — as fast as the
browser will schedule them.

Then the hand-rolled subscription — the version nearly everyone writes
first, because it is the obvious composition of two hooks you know:

```js
function useStoreValue() {
  const [value, setValue] = useState(store.getSnapshot());
  useEffect(() => {
    const unsubscribe = store.subscribe(() => setValue(store.getSnapshot()));
    return unsubscribe;
  }, []);
  return value;
}
```

Read it charitably: it initialises from the store, subscribes once on
mount, copies each new value into state, and returns the unsubscribe as
cleanup. Nothing here is sloppy. It is still wrong, and section 4 says
why.

`SubscribedPanel` uses that hook. `DirectPanel` does something simpler
— `const value = store.getSnapshot();` right in the render body. No
state, no effect, no copy; it just reads the variable. It also never
subscribes, so nothing ever tells it to re-render.

`LeakyPanel` breaks the effect's contract:

```js
useEffect(() => {
  store.subscribe(() => setValue(store.getSnapshot()));   // returns nothing
}, []);
```

`store.subscribe` returns an unsubscribe function and this code throws
it away. The effect returns `undefined`, so React has no cleanup to
call at unmount. Finally `Status` reports whether the two panels
painted the same number, and shows `store.listenerCount()` next to the
number of panels that ought to be subscribed.

## 4. What's wrong with it (in beginner terms)

**Why the two panels disagree.** They're on different update schedules
for the same fact:

- `SubscribedPanel` shows a *copy* of the value. The copy is refreshed
  by an effect, and effects run after paint. So the sequence for every
  update is: store changes → listeners fire → `setValue` → React
  re-renders → paint. There is a real window in there where the
  variable says one thing and the pixels say another.
- `DirectPanel` doesn't copy anything, but it never subscribed. It
  re-renders only when its parent re-renders, so after a "+1" it goes
  on displaying a number the store has already replaced — indefinitely.

Put them side by side and you have tearing: 1 above, 0 below, at the
same moment. Press "re-render App" and the bottom panel silently
catches up, which is the worst possible outcome — the bug looks fixed
by an unrelated action, so nobody learns it was there.

**Why reading during render is unsafe even when it looks right.** React
18 can start rendering, pause, do something more urgent, and resume. So
two components in one render pass can read a mutable variable at two
different moments and get two different values — and React can't
notice, because it never saw the variable at all. A render that reads
mutable outside data isn't a pure function of props and state any more,
and React's whole model assumes it is.

**Why the leak leaks.** `useEffect`'s return value *is* the cleanup.
Return nothing and there is none, so unmounting `LeakyPanel` removes it
from the screen but not from the store's `Set`. Toggle it a few times
and the count climbs: 3, 4, 5. Every dead listener is called on every
update and pushes state into a component that no longer exists —
invisible work, plus a closure holding memory that can never be
collected. Project 18's lesson, with a different victim.

**What's NOT wrong:** the store itself — a perfectly reasonable pub/sub
object. The bug is entirely in how React was wired to it.

## 5. Try it yourself first!

1. **Vague:** two panels show the same number differently, and one
   forgets to clean up. Both problems are about *when* React learns
   something. Is there a React hook whose entire job is "watch
   something React doesn't own"?
2. **Warmer:** yes — `useSyncExternalStore`. Its two required arguments
   are a `subscribe` function and a `getSnapshot` function: exactly the
   two functions your store already exports.
3. **Warmer still:** replace `useStoreValue`'s body with a single call
   to it, and make `DirectPanel` use the same hook instead of reading
   the variable. Delete the `useState`/`useEffect` pair — you are not
   keeping a copy any more.
4. **The leak:** don't fix `LeakyPanel` by remembering to return the
   unsubscribe. Fix it by giving it the same hook as everyone else, so
   there is no cleanup left for a human to forget.
5. **Check your work:** press "burst" and then "re-render App". Every
   panel should read the same number at every moment, and the listener
   count should equal the number of subscribed panels on screen — and
   drop when you hide one.

## 6. Understanding the refactored solution

The whole fix:

```js
function useCount() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
```

**What React does with those two functions.** It calls `subscribe` to
sign up, and calls the returned unsubscribe on unmount — the leak fixed
by construction. It calls `getSnapshot` during render *and again right
before it commits*; if the snapshot moved in between, React throws that
render away and re-renders with the newer value rather than painting
something stale. When the store announces a change it re-renders
synchronously instead of waiting for an effect. So nothing is painted
from an expired copy, and every component reading the store in one pass
sees the same snapshot.

**The two rules your store must keep.** They're not decoration; break
either and the hook misbehaves loudly:

1. **`getSnapshot()` must be `Object.is`-stable when nothing changed.**
   React calls it constantly and compares results. Return
   `state.items.map(...)` — a fresh array every call — and every
   comparison says "changed", so React re-renders, calls it again, and
   loops until it gives up with a warning about caching `getSnapshot`.
   Return the stored reference itself and this never happens.
2. **`subscribe` must be one stable function identity.** React tears
   down and rebuilds the subscription whenever that function changes,
   so an inline `(cb) => store.subscribe(cb)` written in the component
   body means unsubscribe-and-resubscribe on *every render*. Building
   the store once at module level gives stability for free.

**The store stayed pure.** `store.js` has no React in it, so
`store.test.js` proves all of this in Node: snapshots are
reference-stable, a no-op update wakes nobody, unsubscribing twice is
safe and touches no one else, and a listener that unsubscribes *during*
a notification doesn't corrupt the round — the update loop iterates a
copy of the Set, which hand-written stores routinely forget to do.

**Where you've seen this before.** Project 41's challenge exercise
built a `getState`/`subscribe`/`dispatch` store and read it through
this very hook, to get the per-slice subscriptions context could not
do. That was the *use* of the API; this project is the API itself.

## 7. Words you learned (glossary)

- **External store:** state that lives outside React — a module
  variable, a browser API, a state library.
- **Publish/subscribe (pub/sub):** a pattern where interested parties
  register listeners and the owner announces changes to all of them.
- **Listener:** the callback `subscribe` registers — a doorbell, not a
  delivery. **Unsubscribe function:** what `subscribe` returns; it
  removes that listener and nobody else's.
- **Snapshot:** the store's current value, read on demand by
  `getSnapshot()`. **Stale:** a value that has since been replaced.
- **Tearing:** one value showing up as two different numbers in the
  same painted frame.
- **`Object.is`-stable:** returning the very same reference when
  nothing changed, so `===`-style comparison can detect "no change".
- **Commit:** the moment React applies a finished render to the DOM.
- **Concurrent rendering:** React 18's ability to start, pause, and
  resume a render — why reading mutable data mid-render is unsafe.
- **Subscription leak:** a listener left registered after the component
  that added it is gone.
- **`useSyncExternalStore(subscribe, getSnapshot)`:** the hook that
  subscribes, reads, re-checks before committing, and unsubscribes on
  unmount.
- **`getServerSnapshot`:** the optional third argument, used when the
  markup is rendered on a server where the browser store doesn't exist.

## 8. Experiments to try on the plane (no internet needed)

Edit and reason offline; note the pages load React from a CDN (shared
library servers), so actually *running* them in a browser needs
internet on first load. The Node tests need nothing at all:
`node --test store.test.js` from inside `refactored/` works on a plane.

1. **Measure the tear.** In the original, press "+1" ten times without
   touching anything else. Expected: the subscribed panel reads 10, the
   direct panel still reads 0, and the status line names both numbers.
   Now press "re-render App": they agree again, having fixed nothing.
2. **Make the leak grow.** In the original, hide and show the leaky
   panel five times, then press "+1". Expected: `live listeners` sits
   several above `mounted subscribers` and the console prints a LEAK
   line. Add `console.log('woken')` inside the leaky subscription and
   count how many times one click prints it.
3. **Fix the leak the manual way.** Change `LeakyPanel`'s effect to
   `return store.subscribe(...)`. Expected: the count falls on unmount.
   The bug is gone; the *class* of bug isn't, because it still depends
   on a human remembering. That's the argument for the hook.
4. **Break rule 1 on purpose.** In the refactor, change the inlined
   `getSnapshot` to `() => ({ count: state })` and read `.count` in the
   panels. Expected: the page spins and the console warns that the
   result of `getSnapshot` should be cached — a fresh object every call
   means "changed" every call.
5. **Break rule 2 on purpose.** Change `useCount` to
   `useSyncExternalStore((cb) => store.subscribe(cb), store.getSnapshot)`.
   Expected: it still works, but `console.log` inside `subscribe` shows
   the subscription torn down and rebuilt on every render.
