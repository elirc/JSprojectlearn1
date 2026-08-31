# 📘 Learning Guide: FLIP Animation

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A grid of eight fruit tiles and four buttons: **shuffle**, **sort A→Z**,
**sort by length**, **reset**. Clicking a tile puts a ⭐ on it.

Both versions reorder the tiles correctly. The difference is what your
eye sees in the 350 milliseconds after you press a button:

- **Original:** the tiles don't move at all. The *words inside them*
  change. It looks like a slot machine, and it's impossible to follow
  where "Fig" went. Star two tiles and shuffle: the stars stay in their
  boxes while the fruit swaps around underneath.
- **Refactor:** the tiles glide to their new positions along straight
  lines, stars and all, and you can watch Fig travel.

The original already has `transition: all 300ms ease` on every tile. It
does nothing. Understanding *why* is the whole project.

## 2. Concepts you need first

### What a CSS transition actually animates

A transition watches **one element** for a change to **one property**
and interpolates between the old and new values:

```css
.box { left: 0; transition: left 300ms; }
.box.moved { left: 200px; }        /* adding the class animates it */
```

That's the entire model. Both requirements matter:

- **One element.** The browser interpolates a property *on a node*. If
  the node stops existing, or a different node takes its place, there
  are no two values to interpolate between.
- **A property change.** Reordering a list changes no property on any
  element. Element 1 is still 130px wide at `position: static` inside a
  flex container. Its *neighbours* changed, so the layout engine
  computes a new position for it — but "position computed by layout" is
  not a property you set, and it is not something a transition watches.

The trap: the list obviously moved, so surely something animated? No —
layout is recomputed from scratch and the new picture is simply painted.

### Keys, one more time (project 03)

`key` tells React which element in a list corresponds to which element
from the previous render.

```jsx
{items.map((item, i) => <Tile key={i} item={item} />)}       // position
{items.map((item)    => <Tile key={item.id} item={item} />)} // identity
```

With `key={i}`, "the tile at position 3" is one long-lived component
that gets a new `item` prop when the list reorders. Its DOM node never
moves; its text is rewritten. Its state (`starred`) stays behind.

With `key={item.id}`, "the tile for f2" is one long-lived component that
React *moves* in the DOM when the order changes. Its state travels with
it. Only now does a sentence like "animate Fig from here to there" mean
anything.

### transform vs top/left

```css
transform: translate(40px, -80px);   /* composited: no layout, no paint */
top: 40px; left: -80px;              /* triggers layout for the whole page */
```

`transform` and `opacity` are the two properties the browser can animate
on the compositor, off the main thread. Everything else costs a layout
or paint pass **per frame**. The rule of thumb — animate `transform` and
`opacity`, nothing else — is not micro-optimisation; it's the difference
between 60fps and a slideshow on a phone.

Crucially, `transform` also *doesn't affect layout*: a translated
element still occupies its original box as far as its neighbours are
concerned. That's exactly what FLIP needs.

### `useLayoutEffect` vs `useEffect`

Both run after React updates the DOM. The difference is *when relative
to the browser painting*:

```
render → React mutates the DOM → useLayoutEffect → browser paints → useEffect
                                  ^^^^^^^^^^^^^^^                   ^^^^^^^^^
                                  user hasn't seen it yet           too late
```

`useLayoutEffect` is synchronous and blocking: React will not let the
browser paint until it returns. That makes it the wrong tool for almost
everything (you're blocking a frame) and the *only* tool for the small
set of jobs that must not be seen: measuring the DOM and immediately
adjusting it. FLIP is the textbook case. Use `useEffect` here and the
user sees a single frame of the teleport before the animation starts —
a flash you can't unsee once you know it's there.

### `getBoundingClientRect()`

Returns an element's position and size **in viewport coordinates**:
`{ left, top, width, height, ... }`. It forces the browser to compute
layout if anything is pending, which is why measuring in a loop is slow
— and why this project measures everything first, then writes styles.

### Forcing a reflow (the line that looks like a typo)

```js
void document.body.offsetHeight;
```

Reading a layout property forces the browser to flush any pending style
and layout work *right now*. Browsers batch style changes made in the
same tick: if you set `transform: translate(...)` and then immediately
set `transform: ''`, the browser only ever sees the final value and
concludes nothing changed. Reading a layout property in between makes it
commit the first value first, so the second becomes a real transition.

## 3. Walking through the original code

The tile owns its star:

```jsx
function Tile({ item }) {
  const [starred, setStarred] = useState(false);
  return <div className={'tile' + (starred ? ' starred' : '')} ...>
```

The list uses the index:

```jsx
{items.map((item, index) => (
  <Tile key={index} item={item} />
))}
```

And the CSS makes its offer:

```css
.tile { transition: all 300ms ease; }
```

Shuffling is honest and pure:

```js
const shuffle = (list) => { const copy = [...list]; /* Fisher–Yates */ };
setItems(shuffle(items));
```

So: correct state update, correct re-render, a transition declared on
every tile — and a teleport on screen. Nothing here is a *bug* in the
"it crashes" sense. Every line does exactly what it says.

## 4. What's wrong with it (in beginner terms)

**The transition has nothing to animate.** After the shuffle, tile
number 3 is still at the same place on the page, the same size, the
same colour. Its `textContent` changed, and text content is not an
animatable property. `transition: all` faithfully animates all zero of
the properties that changed.

**The keys make sure it stays that way.** Even if transitions could see
a reorder, there'd be nothing to move: React never moves a node here. It
keeps eight tiles in eight fixed slots and rewrites their words. "Slide
Fig from slot 6 to slot 2" is not a sentence about this DOM, because no
node is Fig — each node is a *slot*.

**And the state proves it.** Star the tile in slot 1, shuffle, and the
star is still in slot 1 with a different fruit in it — React kept
`starred: true` on the position. Project 03's bug, doubling as a
diagnostic: if state belongs to positions, so does motion.

**The obvious next fix digs the hole deeper.** The usual second attempt
is `position: absolute` on every tile, `top`/`left` from the index, and
`transition: top 300ms, left 300ms`. That does animate — and (a)
discards flex/grid so you hand-compute every coordinate, (b) animates
two layout properties, so every frame re-runs layout, and (c) still
shows the star bug, because it changed nothing about keys.

**What isn't wrong:** the state, the shuffle, the sorts, the render.
This project doesn't move logic out of a component — it adds the one
thing React deliberately doesn't do. React's job ends at "the DOM now
matches the new state". The *journey* from the old picture to the new
one is not part of that contract, and never will be.

## 5. Try it yourself first!

1. **Vague:** before anything can slide, something has to *be* the thing
   that slides. What change makes React move a tile instead of rewriting
   it?
2. **Warmer:** with stable keys, tiles now genuinely change position. But
   the browser still paints the new positions instantly — you get no say
   in the journey. Where in the React lifecycle could you get between
   "the DOM has changed" and "the user sees it"?
3. **The trick:** you can't slow the browser down, but you can *lie*. If
   a tile has moved 200px up, and you immediately offset it 200px down
   with `transform`, where does it appear to be? What happens if you
   then remove the offset with a transition running?
4. **The measuring:** to compute that offset you need each tile's
   position *before* and *after*. You only get one measurement per
   render — so where do you keep the previous one? (It must not cause a
   re-render when it changes.)
5. **Extract the decision:** the difference between two lists of
   rectangles is arithmetic, not DOM work. Pull it into a pure
   `computeInversions(prevRects, nextRects)` and unit-test it: what
   should it do for a tile that didn't move, or one that just appeared?
6. **The gotcha you will hit:** set the offset and remove it in the same
   function, and nothing animates. Look up "forced reflow" before you
   assume your maths is wrong.

## 6. Understanding the refactored solution

**Step 0: stable keys.** `key={item.id}`. Everything below depends on
React moving real elements, and stars now follow their fruit for free.

**Two refs, holding things that must not trigger renders** (project 26):

```jsx
const nodes = useRef(new Map());   // id -> the element showing it
const prevRects = useRef(null);    // id -> where it was last commit
```

The `nodes` map is filled by a ref callback on each tile:

```jsx
register={(el) => {
  if (el) nodes.current.set(item.id, el);
  else nodes.current.delete(item.id);
}}
```

React calls it with the element on mount and with `null` on unmount, so
the map stays exactly in sync with what's on screen.

**The four steps, in one layout effect:**

```js
useLayoutEffect(() => {
  // LAST: measure where everything is now
  const nextRects = {};
  nodes.current.forEach((el, id) => {
    const box = el.getBoundingClientRect();
    nextRects[id] = { left: box.left, top: box.top };
  });

  const prev = prevRects.current;
  prevRects.current = nextRects;      // this LAST is next render's FIRST
  if (!prev || !animate) return;

  const inversions = computeInversions(prev, nextRects);
  const ids = Object.keys(inversions);
  if (ids.length === 0) return;       // nothing moved: do no work at all

  // INVERT
  ids.forEach((id) => {
    const el = nodes.current.get(id);
    el.style.transition = 'none';
    el.style.transform =
      `translate(${inversions[id].dx}px, ${inversions[id].dy}px)`;
  });

  void document.body.offsetHeight;    // the forced reflow

  // PLAY
  ids.forEach((id) => {
    const el = nodes.current.get(id);
    el.style.transition = `transform ${DURATION}ms ease`;
    el.style.transform = '';
  });
}, [items, animate]);
```

Notice there is no "First" step in the code. There doesn't need to be:
every render's Last measurement *is* the next render's First. One
measurement per commit, stored in a ref.

**The extracted decision** is four lines of arithmetic with three rules:

```js
const dx = prev.left - next.left;    // previous minus current
if (!prev) continue;                 // no "before" -> nothing to fly from
if (Math.abs(dx) < epsilon && Math.abs(dy) < epsilon) continue;  // stood still
```

Previous minus current, because the offset must *undo* the move: a tile
that slid 200px right needs `translateX(-200px)` to look like it hasn't
gone yet. Skipping unmoved tiles isn't tidiness — each animated element
gets its own compositor layer. The epsilon exists because browsers lay
out on fractional pixels, so "didn't move" measures as 0.0001 often
enough to matter. And because it's pure, an *animation* has a test
suite: `computeInversions({a: at(0,0)}, {a: at(40,100)})` must equal
`{ a: { dx: -40, dy: -100 } }`.

**Why the reflow line is there.** Between INVERT and PLAY the browser
must be made to believe the tile really is at its old position. Without
`void document.body.offsetHeight` both style writes land in the same
batch, the browser compares "before this tick" to "after this tick",
sees `transform: none` → `transform: none`, and animates nothing. It's
one line, it looks like dead code, and every FLIP implementation on
earth has it. Comment it.

**Is poking `style.transform` a violation of project 15?** No, and the
distinction is worth keeping. Project 15's rule is that *truth* about
your app must live in state, because state has the right lifetime and
everything else can be derived from it. A FLIP transform is truth about
nothing: it exists for 350ms, no feature will ever read it, it's
recomputed from scratch on the next commit, and losing it costs a
missing animation rather than a wrong answer. Refs are for talking to
the DOM (project 26) — this is that conversation.

## 7. Words you learned (glossary)

- **FLIP:** First, Last, Invert, Play — measure before, measure after,
  offset back, transition home.
- **Inversion:** the transform that makes a moved element *appear* not
  to have moved yet.
- **CSS transition:** interpolation of one property on one element
  between an old and a new value.
- **Composited property:** `transform` and `opacity`, which the browser
  can animate without re-running layout or paint.
- **Layout thrash:** repeatedly triggering layout (usually by animating
  `top`/`left`), making frames slow.
- **Reflow (forced synchronous layout):** making the browser compute
  layout immediately by reading a layout property.
- **`getBoundingClientRect()`:** an element's box in viewport
  coordinates.
- **`useLayoutEffect`:** an effect that runs after DOM mutation and
  before paint — the only place a change can be made invisibly.
- **Stable key:** a key derived from the item's identity, not its
  position, so React moves elements instead of rewriting them.
- **Ref callback:** a function passed as `ref`; React calls it with the
  element on mount and `null` on unmount.

## 8. Experiments to try on the plane (no internet needed)

Edit and reason offline; note the pages load React from a CDN (shared
library servers), so actually *running* them in a browser needs
internet on first load.

1. **Prove the keys are the blocker.** In `original.html`, change
   `key={index}` to `key={item.id}` and change nothing else. Expected:
   the stars now follow their fruit — and the reorder is *still* an
   instant teleport, because `transition: all` still has no property
   change to watch. Stable keys are necessary and nowhere near enough.
2. **Delete the reflow.** In the refactor, remove `void
   document.body.offsetHeight`. Expected: everything teleports again,
   with no error and no warning, because both style writes collapsed
   into one. This is the bug that makes people conclude "FLIP doesn't
   work in React".
3. **Swap the effect.** Change `useLayoutEffect` to `useEffect`.
   Expected: a visible flicker on every shuffle — one frame of the new
   layout, then the tiles snap back and slide in. That flicker is
   precisely the difference between the two hooks.
4. **Flip the subtraction.** In `computeInversions`, change
   `prev.left - next.left` to `next.left - prev.left` (both axes).
   Expected: tiles fly *away* from their destinations and then snap
   back, doubling every distance. Then run
   `node --test react/57-flip-animation/refactored/flip.test.js` with
   the same change: the first test names the mistake in one line.
5. **Animate the wrong property.** In the PLAY step, use
   `el.style.transition = 'left 350ms ease'` and set `el.style.left`
   instead of `transform`. Expected: nothing moves, because these tiles
   are statically positioned and `left` does nothing without
   `position: relative/absolute` — the second-most-common FLIP failure.
6. **Stagger it.** Give each tile a delay based on its index:
   `transition: transform 350ms ease ${index * 30}ms`. Expected: the
   grid ripples instead of moving as a block. Note that the
   *arithmetic* didn't change at all — staggering is presentation, and
   it lives entirely in the Play step.
