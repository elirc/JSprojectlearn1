# React 51 — useSyncExternalStore

**Lesson: state that lives outside React cannot be subscribed to by hand —
`useState` + `useEffect` tears and leaks. `useSyncExternalStore` is the one
correct way in.**

## Run it

```
open original.html and refactored/index.html in a browser
node --test react/51-use-sync-external-store/refactored/store.test.js   <- the subscription contract, tested in Node
```

Press "+1" in the original: two panels showing *the same counter* print
different numbers, and the page says so out loud. Hide the leaky panel and the
listener count refuses to come back down. Do both in the refactor: always ✅,
and the count tracks the mounted panels exactly.

## What's wrong with the original?

One counter lives in a module variable — an **external store**, invisible to
React. Three components read it, each in its own hand-rolled way, and the page
ends up disagreeing with itself:

- **The subscribed panel** keeps a *copy* in `useState` and refreshes it from an
  effect. Effects run after the browser paints, so the copy is structurally one
  paint behind the thing it copies.
- **The direct-read panel** calls `store.getSnapshot()` during render and never
  subscribes, so it re-renders only when its parent happens to. It sits on a
  number the store abandoned, then "fixes itself" the next time anything else
  re-renders — correctness by luck.
- **The leaky panel** subscribes in an effect and returns no cleanup (project
  18's exact bug, now aimed at a store). Unmount it and the listener stays in
  the `Set` forever, woken on every update to push state into a component that
  no longer exists.

The result on screen is **tearing**: one value, two answers, in the same paint.
No amount of care inside these components fixes it — the missing piece is that
React is never told the store changed until *after* it has already painted.

## What changed in the refactor

- **One hook replaces the whole pattern**: `useSyncExternalStore(store.subscribe,
  store.getSnapshot)`. React subscribes, re-reads the snapshot *before* it
  commits, forces a synchronous re-render when the store moves, and unsubscribes
  on unmount. Every reader now paints the same value, by construction.
- **The unsubscribe stopped being your problem.** The leak isn't fixed by
  remembering the cleanup — it's fixed by nobody having to remember it. The
  listener count on the page drops the moment a panel unmounts.
- **`store.js` contains zero React** — so `store.test.js` proves the contract in
  Node: snapshot stability, notify-all, unsubscribe-affects-only-me, double
  unsubscribe, no-op updates waking nobody, and listeners that subscribe or
  unsubscribe *during* a notification.
- **Two rules the store must keep**, both enforced by the tests: `getSnapshot()`
  returns an `Object.is`-stable value when nothing changed (a fresh object per
  call means "changed" every call, and React loops), and `subscribe` is one
  stable function identity (a module-level store gives that free).
- This is the API project 41's challenge exercise reached for when context
  couldn't do per-slice subscriptions — and it is how Redux, Zustand, and every
  `useOnlineStatus`-style browser-API hook talk to React underneath.

## Key takeaway

The moment state lives outside React — a module variable, `localStorage`,
`navigator.onLine`, a real store library — the honest-looking `useState` +
`useEffect` subscription is a bug with a delay on it. Hand React the two
functions it asks for, `subscribe` and `getSnapshot`, and let it own the timing.
It is the only reader that knows when it's about to paint.
