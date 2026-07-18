# React 18 — Effect cleanup

**Lesson: every effect that starts something must return the function that stops
it — or your components leave ghosts behind.**

## Run it

Open `original.html` and watch the **tab title**: toggle the clock off/on five
times, then hide it. The tick counter keeps climbing — six intervals running,
zero components visible. In the refactor the title shows *live interval count*:
1 when shown, 0 when hidden, always.

## What's wrong with the original?

The effect starts a `setInterval` and returns nothing. So:

1. **The interval outlives the component.** Unmounting removes pixels, not
   timers. Each show/hide cycle mints another immortal interval — after five
   toggles, six are running (the tab title proves it, ticking faster than
   1/sec).
2. **Each ghost holds memory forever** — the interval's closure keeps the whole
   component's world alive (js#27's closure mechanics, working against you), and
   keeps calling `setNow` on an unmounted component (React warns in the
   console). In a real app — a chat page with a socket subscription, toggled for
   an hour — this is the slow-tab, duplicate-message, phantom-listener class of
   bug.

## What changed in the refactor

- **The effect returns its own undo**: `return () => clearInterval(id)`. React
  calls it on unmount *and before every re-run* of the effect — so even effects
  with changing deps never double-subscribe. Setup and teardown sit in the same
  block, checkable at a glance like matched brackets.
- **The pairs to memorize** are printed on the page: `setInterval/clearInterval`,
  `addEventListener/removeEventListener`, `subscribe/unsubscribe`,
  `AbortController/abort`. Note the js#38 connection: the event emitter's
  `on()` *returned the unsubscribe function* precisely so it could sit on this
  `return` line — `useEffect(() => emitter.on('x', fn), [])` is a complete,
  leak-free subscription.
- The leak detector itself is the teaching device: making the invisible
  (running intervals) visible (tab title) is how you'd *diagnose* this in a
  real app too.

## Key takeaway

Read every effect asking one question: **"does this start anything that keeps
going?"** A timer, a listener, a subscription, a request. If yes, the return
statement writes itself — and if you can't say what the cleanup would be, you
don't understand what the effect starts yet.
