# 🏋️ Practice: useInterval

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Once for this file: React comes from a CDN, so run the page when you're online; the timer reasoning below is all doable with pen and paper.)

All exercises modify `refactored/index.html`, and each starts from the shipped refactor rather than from the previous answer.

## Exercises

### ⭐ 1. Manual steering (warm-up)

Add ‹ and › buttons that jump to the previous and next slide by hand. Both must wrap around — › on 🌲 forest goes to 🌅 sunrise, ‹ on sunrise goes to forest — and both should use the updater form. Then answer, without running it: after you click ›, how long until the *automatic* advance?

**Practices:** modular arithmetic in both directions, and noticing what the interval effect's deps do and don't react to.

**Hint:** `(i - 1) % 4` is `-1` when `i` is `0`. Add the length before taking the remainder.

**Expected:** the buttons cycle both ways forever. The auto-advance is *not* reset by your click — the interval effect deps only on `[delay]`, so the next tick lands whenever it was already going to, possibly a blink after you clicked. Exercise 5 fixes that.

### ⭐⭐ 2. Predict: the ref-free "simplification" (core)

A colleague deletes the ref — "the deps array already tracks the callback, look" — and adds a fast tick counter to the page. Predict what the screen shows after 10 seconds: the value of `ticks`, and which slide is displayed. Then predict what changes if you delete the 100ms hook and leave only the slideshow.

```jsx
function useInterval(callback, delay) {
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(callback, delay);
    return () => clearInterval(id);
  }, [callback, delay]);
}

function App() {
  const [index, setIndex] = useState(0);
  const [ticks, setTicks] = useState(0);
  useInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 1000);
  useInterval(() => setTicks((t) => t + 1), 100);
  // ...renders SLIDES[index] and ticks
}
```

**Practices:** referential equality of inline functions, and what "restart on every render" does to timers of different periods.

**Hint:** is the arrow passed on this render the same *object* as the one passed on the last render? And what causes a render here, how often?

**Expected:** your prediction matches the solution, including the exact number the counter is near and the fact that one of the two timers never fires even once.

### ⭐⭐ 3. A `useTimeout` sibling (core)

Build `useTimeout(callback, delay)` with the same shape as `useInterval` — latest-ref, `null` means "don't schedule anything" — and use it for a toast: clicking pause shows "Paused — nothing is ticking", which disappears on its own after 2 seconds or immediately if you resume first.

**Practices:** transferring the pattern to a one-shot timer, and reusing `null` as the "no timer" sentinel.

**Hint:** the toast's delay is `toast === null ? null : 2000`, so clearing the toast tears the pending timeout down for free.

**Expected:** pause → the toast appears and fades out after 2s while the slideshow stays frozen; pause then resume quickly → the toast vanishes the moment you resume, with no stray dismissal 2 seconds later.

### ⭐⭐ 4. Play once, then stop (core)

Turn the endless loop into a one-shot playthrough: it advances 🌅 → 🏔 → 🌊 → 🌲 and then stops by itself, with a "play again" button that restarts from the first slide. Rule: no `clearInterval` anywhere in your code, and no new effect — stopping must be expressed as data, the same way pausing already is.

**Practices:** a declarative delay derived from state; "stopped" as a condition, not an action.

**Hint:** the second argument to `useInterval` is an expression, and it can consult `index`.

**Expected:** the show runs through all four slides once, roughly `delay` ms apart, then sits on forest forever. "Play again" sets the index to 0 and the cycle starts over on its own — because the delay stopped being `null` and the effect built a fresh interval.

### ⭐⭐⭐ 5. Restart the countdown on demand (challenge)

Exercise 1 left a rough edge: clicking › may be followed instantly by an automatic advance. Give `useInterval` an optional third argument, `resetKey`, whose change restarts the timer, and bump it from the manual buttons. Existing call sites that pass only two arguments must behave exactly as before.

**Practices:** widening a hook's deps deliberately — "what actually restarts this resource?" — without breaking its current users.

**Hint:** the interval effect's deps become `[delay, resetKey]`; in the app, a counter state that the buttons increment is a perfectly good key.

**Expected:** click › and the next automatic advance is a full `delay` away. A `console.log` in the interval effect's cleanup now fires when you click a button, drag the slider, or toggle pause — and never on a plain tick. Omitting the third argument leaves `resetKey` as `undefined` on every render, so nothing restarts.

### ⭐⭐⭐ 6. Same pattern, different resource: keyboard control (challenge)

The README says the latest-ref idea recurs wherever long-lived things meet fresh state — event listeners first among them. Write `useEventListener(eventName, handler, target = window)` using exactly the pattern from `useInterval`, and wire up: → next slide, ← previous slide, spacebar toggles pause.

**Practices:** proving the pattern is about lifetimes, not about timers, and cleaning up a listener properly.

**Hint:** subscribe with a stable wrapper — `const listener = (event) => saved.current(event)` — so `addEventListener` and `removeEventListener` are handed the same function object.

**Expected:** the arrow keys move slides while the show keeps running; space pauses and resumes without scrolling the page. The listener is added once and removed on unmount, no matter how many times the component re-renders.

## Solutions

### 1. Manual steering

```jsx
const go = (step) =>
  setIndex((i) => (i + step + SLIDES.length) % SLIDES.length);
// ...
<button onClick={() => go(-1)}>‹</button>
<button onClick={() => go(1)}>›</button>
```

**Why:** `%` in JavaScript keeps the sign of the left operand, so `(0 - 1) % 4` is `-1` and `SLIDES[-1]` is `undefined` — adding the length first turns the wrap into an honest 0..3 cycle for both directions. The updater form matters for the same reason it matters inside the interval: it computes from the newest index rather than the one this render captured, so a click landing in the same instant as a tick can't lose one of the two moves. And the auto-advance is unaffected by your click because the interval effect's deps are `[delay]` — nothing you did changed the delay, so the running timer keeps its schedule.

### 2. Predict: the ref-free "simplification"

After 10 seconds: `ticks` reads about **100**, and the slide is still **🌅 sunrise**. The 1000ms interval never fires once.

**Why:** an inline arrow is a brand-new function object on every render, so `[callback, delay]` is different every render and *both* effects tear down and rebuild after every commit. The 100ms timer survives that treatment because the only renders on this page are the ones it causes itself: it fires, sets state, and is restarted immediately after — a full 100ms is available before its next due time. The 1000ms timer is destroyed and recreated every 100ms, so it never gets within 900ms of its deadline; it starves. Delete the fast ticker and the slideshow works again, since renders then arrive only on its own ticks — but that is attempt B from the original, restarting the timer every period, with the churn merely hidden. The ref exists precisely so the timer's lifetime stops depending on how often the component happens to render.

### 3. A `useTimeout` sibling

```jsx
function useTimeout(callback, delay) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; });
  useEffect(() => {
    if (delay === null) return;
    const id = setTimeout(() => savedCallback.current(), delay);
    return () => clearTimeout(id);
  }, [delay]);
}

// in App:
const [toast, setToast] = useState(null);

function togglePause() {
  const next = !paused;
  setPaused(next);
  setToast(next ? 'Paused — nothing is ticking' : null);
}

useTimeout(() => setToast(null), toast === null ? null : 2000);
// ...
<button onClick={togglePause}>{paused ? 'resume' : 'pause'}</button>
{toast && <p style={{ color: '#888' }}>{toast}</p>}
```

**Why:** the hook is `useInterval` with two words changed, which is the point — the latest-ref shape is about splitting a long-lived resource from a fresh-every-render callback, and a `setTimeout` has the same split. Resuming sets the toast to `null`, which makes the delay `null`, which makes the effect's cleanup cancel the pending dismissal: "stop the timer" never has to be written as an instruction. One honest limitation to notice: because the deps are just `[delay]`, two consecutive toasts with the same delay and no `null` in between would *not* restart the countdown — the second toast would inherit the first one's remaining time. Here the toast always passes through `null`, and exercise 5 is the general fix.

### 4. Play once, then stop

```jsx
const atEnd = index === SLIDES.length - 1;

useInterval(() => {
  setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
}, (paused || atEnd) ? null : delay);
// ...
{atEnd && <button onClick={() => setIndex(0)}>play again</button>}
```

**Why:** "stopped" is a fact about the current state — you are on the last slide — so it belongs in the delay expression next to "paused", not in an imperative `clearInterval` call somewhere. When the final tick sets the index to 3, React re-renders, `atEnd` flips to `true`, the delay becomes `null`, and the interval effect's cleanup runs and cancels the timer, all long before the next tick was due. "Play again" is the mirror image: the index goes to 0, `atEnd` becomes `false`, and the effect builds a fresh interval, so the show resumes without anyone calling `setInterval` by hand. The `Math.min` is belt and braces — the teardown already lands in time, but a clamp costs nothing and keeps the index in range no matter how the surrounding code is later rearranged.

### 5. Restart the countdown on demand

```jsx
function useInterval(callback, delay, resetKey) {
  const savedCallback = useRef(callback);

  useEffect(() => { savedCallback.current = callback; });

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay, resetKey]);
}

// in App:
const [nudges, setNudges] = useState(0);

function go(step) {
  setIndex((i) => (i + step + SLIDES.length) % SLIDES.length);
  setNudges((n) => n + 1);
}

useInterval(() => {
  setIndex((i) => (i + 1) % SLIDES.length);
}, paused ? null : delay, nudges);
```

**Why:** the deps array is the hook's statement about what genuinely restarts the timer, and "the user just took manual control" is a legitimate second answer to that question — so it goes in the deps rather than being smuggled in as a `clearInterval` call from a click handler. `nudges` is an opaque token: nothing reads its value, only its change matters, which is why any monotonic counter works. Backwards compatibility falls out for free: a two-argument call leaves `resetKey` as `undefined` on every render, and `undefined === undefined`, so React never sees a dep change. The latest-ref half is untouched, so the tick still reads the newest state.

### 6. Same pattern, different resource: keyboard control

```jsx
function useEventListener(eventName, handler, target = window) {
  const saved = useRef(handler);

  useEffect(() => { saved.current = handler; });

  useEffect(() => {
    const listener = (event) => saved.current(event);
    target.addEventListener(eventName, listener);
    return () => target.removeEventListener(eventName, listener);
  }, [eventName, target]);
}

// in App:
useEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') setIndex((i) => (i + 1) % SLIDES.length);
  else if (event.key === 'ArrowLeft') setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length);
  else if (event.key === ' ') { event.preventDefault(); setPaused((p) => !p); }
});
```

**Why:** an event listener has exactly the two lifetimes a timer has — the subscription should last as long as the target does, while the handler must see the newest state — so the same ref/effect split applies unchanged. The wrapper `listener` is created once per subscription and closes only over the never-changing ref box, which is what lets `removeEventListener` receive the identical function object it registered; passing `handler` directly would re-subscribe on every render, because a fresh arrow is a fresh object. `target = window` is a stable default, so the deps `[eventName, target]` are steady in practice. Without the ref you would face the original dilemma one more time: re-subscribe constantly, or subscribe once with `[]` and read frozen state — and `event.preventDefault()` on space is the small courtesy that stops the browser from scrolling the page under you.
