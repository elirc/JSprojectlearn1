# 📘 Learning Guide: Effect Cleanup

*Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.*

## 1. What are we building?

A live digital clock with a show/hide button. When shown, the clock displays the current time and updates every second. Click "hide clock" and it disappears; click "show clock" and it's back.

The bug isn't visible on the page itself — it's visible in the **browser tab title**. The original uses the title as a leak detector: toggle the clock off and on five times, then hide it completely... and the title keeps counting ticks, faster and faster. Six invisible clocks are still running. The refactor's title shows the count of *live* timers: 1 when the clock is shown, 0 when hidden. Always.

## 2. Concepts you need first

### `setInterval` and `clearInterval`

`setInterval(fn, ms)` runs `fn` repeatedly, every `ms` milliseconds, forever — until someone stops it. It returns an id number; `clearInterval(id)` is the off switch.

```js
const id = setInterval(() => console.log('tick'), 1000); // tick every second
// ...later:
clearInterval(id); // silence
```

Key fact: the browser keeps the interval alive on its own. Nothing about your component's life or death affects it. If you lose the `id`, the interval is *immortal* — nothing can ever stop it (short of closing the tab).

### Mounting and unmounting (again)

Mounting = React inserting a component into the page; unmounting = removing it. `{visible && <Clock />}` mounts a fresh `Clock` every time `visible` becomes true, and unmounts it when false. Each mount runs the component's effects again. Unmounting removes the *pixels* — it does not magically stop timers the component started.

### The cleanup function

Here's the feature this project exists to teach. The function you pass to `useEffect` may **return another function**. That returned function is the *cleanup*, and React promises to call it:

- when the component **unmounts**, and
- **before re-running** the effect (when deps changed).

```jsx
useEffect(() => {
  const id = setInterval(tick, 1000);  // SETUP: start something
  return () => clearInterval(id);      // CLEANUP: stop that exact thing
}, []);
```

Setup and its undo sit in the same block, like matched brackets. The cleanup closes over `id` — it remembers the exact timer it must kill (that "remembering" is a closure; next paragraph).

### Closures — functions remember their birthplace

A *closure* is a function that keeps access to the variables that existed where it was created:

```js
function start() {
  const id = setInterval(() => {}, 1000);
  return () => clearInterval(id);  // this function REMEMBERS id
}
const stop = start();
stop(); // works — id is still reachable through the closure
```

Closures are why cleanup works — and also why leaks hurt: an interval's callback is a closure over the whole component world it was born in, so a leaked interval keeps all that memory alive too.

### Memory leaks

A *memory leak* is memory (or work) your program can never release because something forgotten still references it. Here: every leaked interval holds its closure forever, and fires forever. Symptoms in real apps: tabs getting slower over hours, duplicate chat messages (two leaked socket listeners), warnings about updating unmounted components.

### `document.title`

One line of vanilla JavaScript: `document.title = 'hello'` sets the browser tab's text. Both versions use it as a display for something you can't otherwise see — this file's best trick, honestly: *make the invisible visible* when debugging.

### Basics assumed here

`useState` and event handlers: project 14's LEARN.md. `useEffect` and the deps array: project 17's LEARN.md. Conditional rendering (`&&`): project 15's.

## 3. Walking through the original code

**A global tick counter (the leak detector):**

```jsx
let tickCount = 0; // page-global tick counter
```

Declared outside any component, so it survives everything and counts every tick from every interval that ever existed.

**The Clock — setup with no cleanup:**

```jsx
function Clock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setInterval(() => {
      tickCount++;
      document.title = `ticks: ${tickCount}`;
      setNow(new Date());
    }, 1000);
  }, []);

  return <h2>{now.toLocaleTimeString()}</h2>;
}
```

On mount (`[]` = once), start a one-second interval that bumps the counter, writes the tab title, and updates the displayed time. Two things to notice: the return value of `setInterval` — the id, the only off switch — is **thrown away**, and the effect **returns nothing**. This interval can never be stopped by anyone.

**The App with the toggle:**

```jsx
const [visible, setVisible] = useState(true);
...
<button onClick={() => setVisible(!visible)}>
  {visible ? 'hide' : 'show'} clock
</button>
{visible && <Clock />}
```

Each "show" mounts a brand-new Clock → runs the effect → starts *another* immortal interval. Each "hide" unmounts the Clock → removes the `<h2>` → the interval keeps going.

## 4. What's wrong with it (in beginner terms)

1. **The interval outlives the component.** What you see: toggle the clock off and on five times, then hide it. The page shows nothing — but the tab title keeps counting, and noticeably faster than once per second, because SIX intervals are ticking (one per mount, zero ever stopped). Unmounting removed the pixels; the timers never heard about it.
2. **Each ghost interval keeps calling `setNow` on a component that's gone.** React notices and prints a console warning about updating an unmounted component. Harmless-looking, but it's the smoke from the fire.
3. **Each ghost holds memory forever.** The interval callback is a closure over the Clock's whole world — that memory can never be freed. One clock, who cares; a chat page with a leaked socket subscription toggled all day is a slow tab with duplicated messages.
4. **The bug is invisible by default.** Nothing on the page looks wrong. That's why the demo hijacks the tab title — and why this class of bug ships to production so often.

## 5. Try it yourself first!

1. **Vague hint:** every effect that *starts* something ongoing must also be able to *stop* it. What does this effect start, and what's the off switch called?
2. **More specific:** `setInterval` returns an id you're currently discarding. Catch it in a `const`.
3. **The React part:** how do you tell React "run this when the component goes away"? (It's not another hook — it's something the effect function can *return*.)
4. **Check your fix:** with cleanup in place, toggle five times, then hide. The title should show a live count that ends at 0 — try maintaining an `activeIntervals` counter: `++` in setup, `--` in cleanup.
5. **Bonus thought:** why does React also run cleanup *before every re-run* of an effect (when deps change), not just at unmount? Imagine deps `[speed]` on a timer — what would happen without that rule? (Two timers at once.)

## 6. Understanding the refactored solution

**The gauge:**

```jsx
let activeIntervals = 0; // live-interval gauge: our leak detector
```

Instead of counting ticks forever, the refactor counts *currently running* intervals — a number that can go down.

**Setup and cleanup, together:**

```jsx
useEffect(() => {
  const id = setInterval(() => setNow(new Date()), 1000);
  activeIntervals++;
  document.title = `live intervals: ${activeIntervals}`;

  return () => {
    clearInterval(id);
    activeIntervals--;
    document.title = `live intervals: ${activeIntervals}`;
  };
}, []);
```

The three-part shape to internalize:

1. **Catch the handle**: `const id = setInterval(...)` — the off switch is kept.
2. **Return the undo**: the cleanup function closes over `id` and stops exactly that timer.
3. **Symmetry you can check at a glance**: everything the setup does (start interval, increment gauge), the cleanup un-does (clear interval, decrement gauge). Like matched brackets.

Now the lifecycle story is: mount → interval starts, gauge reads 1. Unmount → React calls the cleanup → interval stops, gauge reads 0. Toggle fifty times: the gauge just flips 1, 0, 1, 0.

**The pairs to memorize** (the refactored page prints these — they're the everyday cleanup vocabulary):

- `setInterval` → `clearInterval`
- `setTimeout` → `clearTimeout`
- `addEventListener` → `removeEventListener` (listening for browser events like window resize)
- `subscribe` → `unsubscribe` (data feeds, sockets)
- `new AbortController()` → `.abort()` (cancelling fetches — project 19 territory)

A lovely design detail from the JS track: an event emitter whose `on()` method *returns* the unsubscribe function makes `useEffect(() => emitter.on('x', fn), [])` a complete, leak-free subscription — the return value lands exactly on the cleanup slot.

## 7. Words you learned (glossary)

- **`setInterval(fn, ms)`** — run `fn` every `ms` milliseconds until cleared.
- **Interval id** — the number `setInterval` returns; the only way to stop it.
- **`clearInterval(id)`** — stops that interval.
- **Cleanup function** — the function an effect returns; React runs it at unmount and before each effect re-run.
- **Mount / unmount** — component entering / leaving the page.
- **Closure** — a function that retains access to variables from where it was created.
- **Memory leak** — memory or ongoing work that can never be reclaimed because something forgotten still holds it.
- **Ghost / leaked interval** — a timer whose owner is gone but which still runs.
- **`document.title`** — the browser tab's text; settable from JavaScript.
- **Subscription** — an ongoing "tell me whenever X happens" arrangement; must be ended explicitly.
- **`addEventListener` / `removeEventListener`** — start/stop listening for a browser event.
- **AbortController** — a built-in object whose `.abort()` cancels an in-flight fetch.
- **Teardown** — another word for cleanup.

## 8. Experiments to try on the plane (no internet needed)

CDN note (once): the page needs internet on first load to fetch React itself; the clock logic runs locally. Predict outcomes offline, verify when connected (or with cached pages).

1. **Count the ghosts.** In `original.html`, toggle hide/show exactly 4 times, then hide. Prediction: 5 clocks were mounted, so 5 intervals run; the tab title advances ~5 ticks per second while the page shows nothing. Watch the console for React's unmounted-update warning too.
2. **Break the refactor's symmetry.** Delete just the `clearInterval(id)` line (keep the `activeIntervals--`). Prediction: the gauge lies — title says 0 but ticking continues. A reminder that the gauge is only as honest as the cleanup.
3. **Cleanup order on re-run.** In the refactor, add a `speed` state, use it as the interval delay, put `[speed]` as deps, and add `console.log('setup')` / `console.log('cleanup')` in the two halves. Change speed. Prediction: the console shows `cleanup` *then* `setup` — old timer dies before the new one starts, so there's never a moment with two.
4. **Leak on purpose, then measure.** In the refactor, toggle 10 times fast. Prediction: gauge always ends where it started (1 or 0). Do the same in the original: the title's tick speed roughly multiplies by the number of mounts.
5. **Add a mousemove listener with cleanup.** In the refactor's Clock effect, add `const onMove = () => {}; window.addEventListener('mousemove', onMove);` and `window.removeEventListener('mousemove', onMove)` in the cleanup. Prediction: no visible change — the exercise is writing the pair correctly, same variable in both lines. (Passing a *different* arrow to remove would silently fail to unhook — a classic trap: the remove must receive the *same function object*.)
