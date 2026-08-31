# 🏋️ Practice: FLIP Animation

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (The pure-logic exercises can be checked with `node --test`; the rest are checkable by reading and reasoning about your code — run the page later when you have internet, since React loads from a CDN.)

All exercises modify `refactored/index.html` unless they say otherwise; exercises 4 and 5 also change `refactored/flip.js` and `refactored/flip.test.js`.

## Exercises

### ⭐ 1. Respect people who get motion sick (warm-up)

Some users set "reduce motion" in their operating system, and browsers expose that as a media query. Honour it: when it's on, reorder instantly instead of animating. Do it without duplicating the FLIP code, and make sure a user who flips the setting mid-session doesn't have to reload.

**Practices:** treating a guard as one condition on one line, and noticing that "an OS setting" is just another input your effect reads.

**Hint:** `window.matchMedia('(prefers-reduced-motion: reduce)')` gives you an object with `.matches` and an `addEventListener('change', ...)`. Your existing `animate` checkbox is already exactly the shape of the answer.

**Expected:** with reduce-motion on, shuffle is instant and no `style.transform` is ever written — but stars still follow their fruit, because that's keys, not animation. Turning the setting off in system preferences re-enables the slide without a reload.

### ⭐⭐ 2. Predict what renders (and what animates) (core)

On paper, for each of these four interactions in the **refactor**, write down: (a) which components re-render, (b) whether the layout effect runs, (c) what `computeInversions` returns, and (d) whether any `style.transform` is written.

1. Click one tile to star it.
2. Press **shuffle**.
3. Press a button wired to `setItems([...items])` — a *new array* holding the same items in the same order.
4. Press **reset** when the list is already in its original order.

**Practices:** separating React's "did anything change?" from FLIP's "did anything *move*?" — two questions that answer independently, and the reason the refactor does almost no work most of the time.

**Hint:** the effect's dependency array is `[items, animate]`, and React compares dependencies with `Object.is`. For (c) and (d), remember the tiles have a fixed `width: 130px` — think about whether adding a ⭐ to a tile's text changes any tile's position.

**Expected:** two of the four interactions run the layout effect but write no styles at all, one of them doesn't run the effect, and only one actually animates. Also answer this: if `.tile` had `width: auto` instead of a fixed width, which of your answers to case 1 would change, and would the result be a bug or an accidental feature?

### ⭐⭐ 3. Package it as `useFlip` (core)

The layout effect is 25 lines sitting in the middle of a component that is otherwise about fruit. Extract it into a custom hook:

```js
const register = useFlip(items, { duration: 350, enabled: animate });
```

`useFlip` owns both refs and the effect, and returns the ref callback the tiles use. `App` should end up with one line of animation code.

**Practices:** the same "decide vs do" split one level up — a reusable *behaviour* separated from one particular list of fruit. This is project 22's custom-hook move applied to a layout effect.

**Hint:** the hook takes the dependency (`items`) as an argument and passes it straight into its own `useLayoutEffect` deps. `register` must be a function of `id`, so the hook returns `(id) => (el) => {...}` — or a `register(id)` helper that returns the ref callback.

**Expected:** `App` loses both `useRef`s and the whole effect; the tiles become `<Tile key={item.id} item={item} register={register(item.id)} />`. Dropping the same hook into a second, unrelated list animates it with one import — which is the test of whether you extracted a *behaviour* or just moved lines around.

### ⭐⭐ 4. Make it survive a scroll (core)

`getBoundingClientRect()` reports **viewport** coordinates. Put the grid halfway down a long page, shuffle, and scroll during the animation — or simply scroll between two shuffles — and every tile flies in from an absurd offset. Fix it: measure everything relative to the grid container, and add a test that proves the fix.

**Practices:** finding the hidden assumption in a measurement ("nothing else moved") and killing it by choosing a better origin.

**Hint:** measure the container with `getBoundingClientRect()` too, in the same pass, and subtract: `{ left: rect.left - origin.left, top: rect.top - origin.top }`. A tiny pure helper, `toLocal(rect, origin)`, belongs next to `computeInversions`. `computeInversions` itself needs no changes at all — which is the sign you've put the fix in the right place.

**Expected:** with viewport rects, a 300px scroll between measurements adds 300 to every `dy`, so tiles that swapped 50px apart fly 250px and 350px. With container-relative rects the same swap gives `dy: 50` and `dy: -50` regardless of scrolling, and a test can assert exactly that with plain numbers.

### ⭐⭐⭐ 5. Animate arrivals and departures (challenge)

Add an "×" on each tile and an "add fruit" button. Now items enter and leave, and FLIP alone doesn't cover it: `computeInversions` deliberately skips ids that are missing from either measurement. Make new tiles fade and scale in, and removed tiles fade out *before* they leave the DOM — while the surviving tiles FLIP into their new places.

Write a pure `planTransitions(prevRects, nextRects)` returning `{ moved, entered, exited }` and test it. Then build the React half.

**Practices:** the reason every animation library has an `<AnimatePresence>`. React removes an element the instant state says it's gone; an exit animation needs the element to outlive the state that justified it.

**Hint:** the pure part is four lines on top of what you already have. The React part is the hard bit: keep a `leaving` set in state, render `items` plus any `leaving` ids that are still animating, start the fade for newly-exited ids in the layout effect, and drop them from `leaving` on `transitionend` (or after `duration` ms). An exiting tile must also be taken out of layout flow — `position: absolute` — or the survivors will FLIP to the wrong places.

**Expected:** `planTransitions` reports `{ moved: {b: {dx:0, dy:50}, a: {dx:0, dy:-50}}, entered: ['fresh'], exited: ['gone'] }` for a list where two items swapped, one appeared and one vanished — and `{ moved: {}, entered: [], exited: [] }` when nothing changed. On screen: delete a middle tile and the ones after it slide up while it fades out in place, with no jump at the moment it's finally removed.

## Solutions

### 1. Respect people who get motion sick

```jsx
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setReduced(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);   // project 18
  }, []);
  return reduced;
}

// in App:
const reducedMotion = usePrefersReducedMotion();
const [wantsAnimation, setWantsAnimation] = useState(true);
const animate = wantsAnimation && !reducedMotion;
```

**Why:** the guard costs one `&&` because the refactor already had an off switch — `if (!prev || !animate) return;` sits above every style write, so "don't animate" and "there's nothing to compare to" take the same exit. That's not luck; a boolean that gates an effect early is the cheapest place to add policy later. Reading the media query as *state* rather than checking `.matches` inline is what makes it live: the subscription re-renders the component when the user changes the setting, and the cleanup (project 18) stops the listener leaking. Note the split between `wantsAnimation` (the user's choice on this page) and `reducedMotion` (the user's choice for their whole machine) — keeping them as separate values means neither one can silently overwrite the other.

### 2. Predict what renders (and what animates)

**1. Star a tile.** Only that `Tile` re-renders — the `starred` state lives inside it, and `App` knows nothing about it. `App` doesn't re-render, so `items` is the same array, so the layout effect **does not run**. No measurement, no inversions, no styles. (And the fixed `width: 130px` is why this is safe: adding "⭐ " to the text doesn't change the tile's size, so nothing on the page actually moves.)

**2. Shuffle.** `App` re-renders with a new `items` array, all eight `Tile`s re-render, the effect runs, `computeInversions` returns entries for every tile whose position changed — typically all eight, minus any the shuffle happened to leave in place — and each of those gets two `style` writes. This is the one case that animates.

**3. `setItems([...items])`.** A new array, so `Object.is` says the dependency changed and the effect **runs**. But the tiles are in the same order, so every measured rect equals its previous value, `computeInversions` returns `{}`, the `ids.length === 0` guard returns early, and **not one style is written**.

**4. Reset when already reset.** `setItems(FRUITS)` — and `FRUITS` is the same array object it always was. If `items` is already `FRUITS`, React bails out of the re-render entirely, and the effect doesn't even run. If the list is currently shuffled, this is case 2 with a known destination.

**The `width: auto` question.** With auto width, adding "⭐ " to a tile widens it, which pushes every later tile along in the flex row. Those tiles genuinely move — but the layout effect **still doesn't run**, because `items` didn't change, so nothing animates and `prevRects` is now stale. The next shuffle would compute its inversions from measurements taken before the star existed, and every tile would fly in slightly wrong. So: a bug, and a sneaky one. The honest fixes are to keep the tile's size independent of its content (what the refactor does), or to make the effect depend on everything that can affect layout — which is a good argument for a `ResizeObserver` and a bad argument for putting `starred` in `App`.

**Why:** these four cases separate two questions that beginners fuse into one. "Did React re-render?" is about state and props. "Did anything move?" is about layout, and only measurement can answer it. The refactor gets to be cheap precisely because it asks them in that order: no new `items` means no measuring at all, and measuring that finds nothing means no compositor layers. Case 4 is worth remembering on its own — passing the *same* array reference back to `setItems` is React's bail-out, and it's why `FRUITS` being a module-level constant is a small design decision with a visible effect.

### 3. Package it as `useFlip`

```jsx
function useFlip(dep, { duration = 350, enabled = true } = {}) {
  const nodes = useRef(new Map());
  const prevRects = useRef(null);

  useLayoutEffect(() => {
    const nextRects = {};
    nodes.current.forEach((el, id) => {
      const box = el.getBoundingClientRect();
      nextRects[id] = { left: box.left, top: box.top };
    });

    const prev = prevRects.current;
    prevRects.current = nextRects;
    if (!prev || !enabled) return;

    const inversions = computeInversions(prev, nextRects);
    const ids = Object.keys(inversions);
    if (ids.length === 0) return;

    ids.forEach((id) => {
      const el = nodes.current.get(id);
      el.style.transition = 'none';
      el.style.transform =
        `translate(${inversions[id].dx}px, ${inversions[id].dy}px)`;
    });
    void document.body.offsetHeight;
    ids.forEach((id) => {
      const el = nodes.current.get(id);
      el.style.transition = `transform ${duration}ms ease`;
      el.style.transform = '';
    });
  }, [dep, enabled, duration]);

  return (id) => (el) => {
    if (el) nodes.current.set(id, el);
    else nodes.current.delete(id);
  };
}

// App, entire animation surface:
const register = useFlip(items, { enabled: animate });
...
{items.map((item) => (
  <Tile key={item.id} item={item} register={register(item.id)} />
))}
```

**Why:** the hook is the same code with its two hidden inputs — "what change should trigger a measurement" and "may I animate" — promoted to arguments. That promotion is the whole extraction: before it, the effect knew about fruit; after it, it knows about a dependency and a flag, and a second list can reuse it untouched. The two refs move *inside* because they're implementation detail no caller should hold — a hook that made you declare your own `nodesRef` would be a function with extra steps. `register` returning a function per id looks odd until you notice the alternative is the hook needing to know how your list is keyed. One honest wart: `register(item.id)` builds a new callback on every render, so React detaches and reattaches every ref each time; harmless here (delete then set the same id, before layout effects run), and fixable with a memoised map of callbacks if you ever profile it.

### 4. Make it survive a scroll

```js
/** Re-express a viewport rect relative to some origin rect. */
export const toLocal = (rect, origin) => ({
  left: rect.left - origin.left,
  top: rect.top - origin.top,
});
```

```jsx
const grid = useRef(null);
...
useLayoutEffect(() => {
  const origin = grid.current.getBoundingClientRect();   // same pass, same layout
  const nextRects = {};
  nodes.current.forEach((el, id) => {
    nextRects[id] = toLocal(el.getBoundingClientRect(), origin);
  });
  ...   // everything below is unchanged
}, [items, animate]);
...
<div className="grid" ref={grid}>
```

```js
test('container-relative rects ignore scrolling; viewport rects do not', () => {
  // Two tiles 50px apart swap. Between the measurements the page scrolls
  // 300px, so every viewport coordinate drops by 300.
  const viewportPrev = { f1: { left: 0, top: 200 }, f2: { left: 0, top: 250 } };
  const viewportNext = { f2: { left: 0, top: -100 }, f1: { left: 0, top: -50 } };
  assert.deepEqual(computeInversions(viewportPrev, viewportNext), {
    f2: { dx: 0, dy: 350 },     // should have been 50
    f1: { dx: 0, dy: 250 },     // should have been -50
  });

  const gridBefore = { left: 0, top: 200 };
  const gridAfter = { left: 0, top: -100 };
  const localPrev = { f1: toLocal(viewportPrev.f1, gridBefore),
                      f2: toLocal(viewportPrev.f2, gridBefore) };
  const localNext = { f2: toLocal(viewportNext.f2, gridAfter),
                      f1: toLocal(viewportNext.f1, gridAfter) };
  assert.deepEqual(computeInversions(localPrev, localNext), {
    f2: { dx: 0, dy: 50 },
    f1: { dx: 0, dy: -50 },
  });
});
```

**Why:** `getBoundingClientRect()` answers "where is this relative to the window", and FLIP is asking "where is this relative to its neighbours". Those agree only while the window doesn't move, which is an assumption nobody wrote down and the user breaks with a scroll wheel. Subtracting the container's own rect converts both measurements into the same local frame, and any whole-page movement cancels out of the subtraction — the container moved by exactly as much as its children did. Notice `computeInversions` didn't change: it was always doing correct arithmetic on the numbers it was given, and the bug was in what those numbers *meant*. That's the recurring shape of pure-function debugging — the answer is usually at the boundary where values are produced, not in the function everyone stares at. Measuring the origin in the same pass as the tiles matters too: read it later and a scroll mid-loop would reintroduce the same skew you're removing.

### 5. Animate arrivals and departures

The pure half:

```js
export function planTransitions(prevRects, nextRects, epsilon = 0.5) {
  const { entered, exited } = diffKeys(prevRects, nextRects);
  return { moved: computeInversions(prevRects, nextRects, epsilon), entered, exited };
}
```

```js
test('a plan splits moved, entered and exited ids', () => {
  const prev = { a: at(0, 0), b: at(0, 50), gone: at(0, 100) };
  const next = { b: at(0, 0), a: at(0, 50), fresh: at(0, 100) };
  assert.deepEqual(planTransitions(prev, next), {
    moved: { b: { dx: 0, dy: 50 }, a: { dx: 0, dy: -50 } },
    entered: ['fresh'],
    exited: ['gone'],
  });
});

test('a steady state plans nothing', () => {
  const rects = { a: at(0, 0) };
  assert.deepEqual(planTransitions(rects, rects), { moved: {}, entered: [], exited: [] });
});
```

The React half, in outline:

```jsx
const [items, setItems] = useState(FRUITS);
const [leaving, setLeaving] = useState([]);          // items mid-exit
const rendered = [...items, ...leaving.filter((it) => !items.some((i) => i.id === it.id))];

function remove(id) {
  const doomed = items.find((i) => i.id === id);
  setItems(items.filter((i) => i.id !== id));
  setLeaving((l) => [...l, doomed]);                 // keep rendering it
  setTimeout(() => setLeaving((l) => l.filter((i) => i.id !== id)), DURATION);
}

// in the layout effect, after the FLIP writes:
plan.exited.forEach((id) => {
  const el = nodes.current.get(id);
  if (!el) return;
  const box = prev[id];
  el.style.position = 'absolute';                    // out of flow: survivors
  el.style.left = `${box.left}px`;                   // FLIP to their real slots
  el.style.top = `${box.top}px`;
  requestAnimationFrame(() => {
    el.style.transition = `opacity ${DURATION}ms, transform ${DURATION}ms`;
    el.style.opacity = '0';
    el.style.transform = 'scale(0.8)';
  });
});
plan.entered.forEach((id) => {
  const el = nodes.current.get(id);
  el.style.transition = 'none';
  el.style.opacity = '0';
  el.style.transform = 'scale(0.8)';
  void document.body.offsetHeight;
  el.style.transition = `opacity ${DURATION}ms, transform ${DURATION}ms`;
  el.style.opacity = '';
  el.style.transform = '';
});
```

**Why:** the pure half is four lines because the two hard questions were already answered — `computeInversions` knows how far things moved and `diffKeys` knows who's new. Putting them in one function isn't a shortcut; it's naming the thing the effect actually needs, so the effect reads as "here is the plan, execute it" rather than as three interleaved loops. The React half is where the real difficulty lives, and it's worth naming precisely: **React deletes an element the moment state says it's gone, but an exit animation needs the element to outlive the state that justified it.** Every solution to that is the same trick — a second, animation-owned list (`leaving`) that keeps rendering the corpse for exactly as long as the transition lasts. That's all `<AnimatePresence>` is, and knowing that is worth more than the twelve lines above. Two details that look optional and aren't: an exiting tile must go `position: absolute` or it keeps taking up space and the survivors FLIP to positions that are about to be wrong; and entering tiles need `transition: none` before their starting styles, or they animate *from* their default state, which is the same batching problem the forced reflow solves in the main path. Finally, the `setTimeout` cleanup is the honest-but-fragile version — a `transitionend` listener is more correct and needs its own guard for interrupted transitions, which is exactly the sort of accumulating edge case that eventually justifies reaching for a library.
