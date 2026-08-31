# 📘 Learning Guide: Infinite Scroll

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A feed: a box about 320 pixels tall with a scrollbar, holding rows that
say `Item 1`, `Item 2`, and so on. Scroll near the bottom and twenty more
appear; after five pages — a hundred items — it says "you've reached the
end". Above the box sit three counters, and those counters are the whole
project. After one flick of the scrollbar the original reads something
like `scroll handler fired: 214 times`, `requests started: 9 | pages of
data: 3`, `duplicate items: 80` — and eighty rows are outlined in red
because they arrived twice. The refactor, same flick and same fake API,
reads `observer callbacks: 7`, `pages of data: 3 | status: idle`,
`duplicate items: 0`. Two things changed: *who does the measuring*, and
*where the "one at a time" rule lives*.

## 2. Concepts you need first

### The scroll event, and how often it fires

A **scroll event** is the browser saying "this element's scroll position
changed". It doesn't fire once per flick — roughly once per animation
frame while movement continues, so about **60 times a second**; a lazy
flick easily produces 200. Your handler runs on the same thread the
browser uses to paint the scroll, so anything slow in it shows up as
**jank**: the stutter of a scroll that can't keep up.

### The geometry of "near the bottom"

```
  ┌──────────────────┐
  │  (scrolled past) │  ← scrollTop     how far you've scrolled
  ├──────────────────┤
  │   what you see   │  ← clientHeight  the visible window
  ├──────────────────┤
  │  (still to come) │     scrollHeight is all of it, top to bottom
  └──────────────────┘
  distance to bottom = scrollHeight - scrollTop - clientHeight
```

`distance < 200` means "within 200 pixels of the end". The arithmetic is
correct — that's not the problem. The *cost* is: reading those properties
forces a layout recalculation (**layout thrashing**) sixty times a second.

### IntersectionObserver, in plain words

You hand the browser an element and it tells you when that element comes
into view. That's it. The browser already knows where everything is — it
has to, in order to paint — so asking costs nothing, while measuring
yourself costs a layout every time.

```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => console.log(entry.isIntersecting)); // on screen?
}, { root: someScrollBox, rootMargin: '120px', threshold: 0 });

observer.observe(myElement);   // start watching
observer.disconnect();         // stop watching everything
```

- **entry** — one report about one observed element; `isIntersecting` is
  the boolean you almost always want.
- **root** — what "in view" is measured against; `null` means the window.
- **rootMargin** — a fake border around the root that grows the "visible"
  area; `'120px'` means *fire 120 pixels early*, so the next page is
  already on its way when the reader arrives.
- **threshold** — how much must be visible to count; `0` = any sliver.

The callback fires when the answer *changes*, not continuously — which is
why seven callbacks replace two hundred handler runs. A **sentinel** is
the deliberately boring element you observe: here a 1-pixel `<div>` after
the last row, so "load more when the reader nears the bottom" becomes
"load more when the sentinel is on screen". You never style it; it exists
to be watched.

### Observers are things you start, so they're things you stop

Project 18's rule again: what an effect *starts*, the cleanup *stops* —
an effect calling `observer.observe(target)` must
`return () => observer.disconnect()`. An observer left running after
unmount leaks exactly like a leaked `setInterval`: it holds a detached
DOM node and a callback into a component that no longer exists.

### "One at a time" is a piece of state

Project 44 taught this about a submit button: while a request is
**in-flight**, refuse to start another. Infinite scroll is the same
problem with a crueller trigger — a scrollbar "presses the button" sixty
times a second. The fact that a load is running must live where both the
trigger and the rules can see it, and the cleanest home is the state
itself, in project 20's shape: one **discriminated status** field,
`'idle' | 'loading' | 'error' | 'done'`, rather than three booleans that
can spell nonsense like `loading && done`.

## 3. Walking through the original code

`fetchPage(n)` is a fake API, unchanged in both versions: 500ms, twenty
items, a `hasMore` flag, dry after page 5. The loader goes wrong first:

```js
function loadMore() {
  setRequests((n) => n + 1);
  fetchPage(page + 1).then((res) => {
    setItems((prev) => [...prev, ...res.items]);
    setPage(page + 1);
    setHasMore(res.hasMore);
  });
}
```

Read it charitably: count the request, fetch the next page, append. But
nothing asks "is a fetch already running?" — and there's nowhere to put
that answer, since `items`, `page` and `hasMore` are three `useState`s
and none means "busy". Then the listener:

```js
useEffect(() => {
  const el = listRef.current;
  function onScroll() {
    setFires((n) => n + 1);
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance < 200 && hasMore) loadMore();
  }
  el.addEventListener('scroll', onScroll);
  return () => el.removeEventListener('scroll', onScroll);
}, [page, hasMore]);
```

The cleanup is correct and the deps are honest — this developer learned
project 18 — but the price is a listener torn down and rebuilt after
every page. And notice what rendering must do about duplicate ids:
`key={`${item.id}-${i}`}`, because a plain `key={item.id}` would collide
when the same item really is in the list twice. Needing an index in a key
is the smell (project 03), here a symptom of the bug two functions up.

## 4. What's wrong with it (in beginner terms)

**The waste is real but survivable.** Two hundred handler runs, each
forcing a layout, is what makes a phone's scroll feel sticky — bad, not
fatal. **The duplicate loads are the actual bug**, and it's about timing.
One flick, millisecond by millisecond:

```
t=0ms    scroll event -> distance 180 -> loadMore() -> fetch page 2 starts
t=16ms   scroll event -> distance 140 -> loadMore() -> fetch page 2 starts
t=32ms   scroll event -> distance 90  -> loadMore() -> fetch page 2 starts
t=500ms  first reply lands  -> 20 items appended, page becomes 2
t=505ms  second reply lands -> the SAME 20 items appended again
t=512ms  third reply lands  -> and again
```

Every fire between t=0 and t=500 sees a world where no load is running,
because there is no "a load is running" to see. Even `if (loading)
return;` with a `useState` boolean wouldn't save it: the fires at 16ms
and 32ms would *still* read `loading === false`, because `setLoading(true)`
at t=0 doesn't change the variable they captured — they all look at the
same render's snapshot (project 11). The guard has to be a rule the
*state updates themselves* obey.

**The page number is stale the same way.** All three fires compute
`page + 1` from the same `page`, so all three ask for page 2 — almost
lucky, since three requests for one page produce *visible* duplicates,
where 2, 3 and 4 would have looked fine until the server slowed down.

## 5. Try it yourself first!

1. **Vague:** the handler runs hundreds of times to answer one yes/no
   question about visibility. Doesn't the browser already know?
2. **Warmer:** `IntersectionObserver`. Put an empty `<div>` at the end of
   the list, observe it, load when it shows up. Set it up in a
   `useEffect` — and remember what the cleanup owes you.
3. **Warmer still:** wrap it in a `useOnScreen(ref)` hook returning a
   boolean. What should its dependency array hold, given that an inline
   `{ rootMargin: '120px' }` is a brand new object every render (30)?
4. **The real fix:** even a perfect observer can fire twice. Where can "a
   load is running" live so a second request is *impossible* rather than
   unlikely? Try `useReducer` with a `status` field, and make the reducer
   itself refuse `'loadStarted'`.
5. **Check your work:** duplicates read 0, and "pages of data" climbs
   1, 2, 3, 4, 5 and stops — even if you scroll like you're angry at it.

## 6. Understanding the refactored solution

**The rulebook first** (`feed.js`, zero React):

```js
case 'loadStarted': {
  if (!canLoadMore(state)) return state;   // the whole fix
  return { ...state, status: 'loading', error: null };
}
```

`canLoadMore` says no while loading, no after an error until someone
retries, no once the feed is done. Returning `state` — the same object
React already holds — is the no-op contract: React sees the same
reference and re-renders nothing, so ten scroll-speed dispatches produce
one state change. `'pageLoaded'` carries the same discipline the other
way (`if (state.status !== 'loading') return state;`), dropping the twin
of a request that already landed — project 19's race, solved in the rules
rather than with a `cancelled` flag in every caller.

**The hook** turns an imperative browser API into a boolean (the page's
version also takes an `onCallback`, routed through a latest ref — project
25 — so counting callbacks can't rebuild the observer):

```js
function useOnScreen(targetRef, { rootRef, rootMargin = '0px' } = {}) {
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => setOnScreen(entries[entries.length - 1].isIntersecting),
      { root: rootRef ? rootRef.current : null, rootMargin },
    );
    observer.observe(targetRef.current);
    return () => observer.disconnect();
  }, [targetRef, rootRef, rootMargin]);
  return onScreen;
}
```

The dependency array holds a **ref object and a string** — refs from
`useRef` are the same object forever and strings compare by value, so the
effect runs once and the observer is built once. Had the options object
been a dependency, the caller's inline `{ rootMargin: '120px' }` would be
new every render and the observer rebuilt every render — project 30's
trap in an observer costume.

**The component** is now almost boring, which is the goal:

```jsx
const sentinelVisible = useOnScreen(sentinelRef, { rootRef: listRef, rootMargin: '120px' });
const allowed = canLoadMore(state);

useEffect(() => {
  if (!sentinelVisible || !allowed) return;
  dispatch({ type: 'loadStarted' });
  fetchPage(state.page + 1).then(
    (res) => dispatch({ type: 'pageLoaded', items: res.items, hasMore: res.hasMore }),
    (err) => dispatch({ type: 'loadFailed', error: String(err) }),
  );
}, [sentinelVisible, allowed, state.page]);
```

There's no separate mount effect for the first page: at mount the list is
empty, so the sentinel is on screen, so page 1 loads. The moment
`'loadStarted'` lands, `allowed` flips false and the next run returns.

## 7. Words you learned (glossary)

- **Scroll event:** a scroll position change; fires ~60 times a second.
- **Jank:** stutter caused by work blocking the frame being painted.
- **Layout thrashing:** forcing repeated layout recalculation by reading
  geometry like `scrollTop`.
- **IntersectionObserver:** a browser API reporting when an element enters
  or leaves a viewport, with no measuring on your side.
- **Entry:** one visibility report for one observed element.
- **isIntersecting:** the entry's boolean — is this element on screen?
- **rootMargin:** a fake margin around the viewport, to fire early or late.
- **threshold:** how much must be visible to count (0 = a sliver, 1 = all).
- **Sentinel:** a placeholder element that exists only to be observed.
- **Disconnect:** stopping an observer; the cleanup half of the pairing.
- **In-flight:** started and not yet finished.
- **Race:** two operations whose finishing order isn't guaranteed.
- **Idempotent:** doing it twice has the same effect as doing it once —
  what the `'loadStarted'` guard makes the trigger.
- **Discriminated status:** one field naming the current state instead of
  several booleans that can contradict each other.
- **Cursor pagination:** asking for "20 after item 4213" instead of
  "page 3", so inserts and deletes can't duplicate or skip rows.

## 8. Experiments to try on the plane (no internet needed)

Edit and reason offline; note the pages load React from a CDN (shared
library servers), so actually *running* them in a browser needs internet
on first load. The reducer, though, is plain JavaScript, and
`node --test refactored/feed.test.js` works with no internet at all.

1. **Count the waste yourself.** In the original, add
   `console.log(distance)` inside `onScroll`. Expected: several hundred
   lines for one gesture. Then the same in the refactor's observer
   callback: single digits, each a genuine change of answer.
2. **Delete the guard.** Make `'loadStarted'` return
   `{ ...state, status: 'loading' }` with no `canLoadMore` check.
   Expected: duplicates come straight back — the observer didn't save
   you, the rule did. Put it back.
3. **Delete the cleanup.** Remove `return () => observer.disconnect()`.
   Expected: nothing visibly breaks in this small demo, which is exactly
   why leaks survive code review. Now reason about a feed you leave
   twenty times: twenty live observers, each holding a detached node and
   a callback into a dead component.
4. **Make rootMargin enormous.** Set it to `'2000px'`. Expected: the
   sentinel counts as visible from the start, so pages chain-load to the
   end with no scrolling — the dial between "preload aggressively" and
   "wait until they're really there".
5. **Break the page counter.** In `'pageLoaded'`, use `page: state.page +
   2`. Expected: rows 21–40 never appear and the ids jump — the reducer
   holds the *only* copy of "where we are", so bugs there surface at once
   instead of hiding in a closure.
