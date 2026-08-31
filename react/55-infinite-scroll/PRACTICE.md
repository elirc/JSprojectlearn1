# 🏋️ Practice: Infinite Scroll

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Running the HTML pages needs the CDN, but the rulebook is plain JavaScript: `node --test feed.test.js` from inside `refactored/` works with no internet at all.) The reducer lives twice — in `refactored/feed.js`, which the Node tests import, and as a copy inside `refactored/index.html`, which the browser runs — so when an exercise changes the reducer, change both.

## Exercises

### ⭐ 1. A button that obeys the same rule (warm-up)

Infinite scroll is hostile to keyboard users and puts the footer permanently out of reach, so real feeds keep a "Load more" button too. Add one under the list. It must share the guard rather than inventing its own: disabled whenever `canLoadMore(state)` is false, and dispatching exactly the actions the observer dispatches.

**Practices:** one rule, many triggers — the point of extracting `canLoadMore` as a pure function instead of writing `if (!loading && hasMore)` at each call site.

**Hint:** the load logic is currently inline in the effect. Pull it into a `loadNextPage()` function in the component and call it from both places.

**Expected:** clicking the button loads exactly one page. Holding the mouse on it and mashing it during a load does nothing at all — the button is disabled, and even if it weren't, `'loadStarted'` would no-op. At the end of the data it stays disabled and the row reads "You've reached the end".

### ⭐⭐ 2. Predict the state, action by action (core)

Here is a sequence of actions applied to `initialFeedState`, in order. Before running anything, write down for each step: the resulting `status`, `page`, the ids in `items`, and whether the reducer returned a **new** state or the **same reference**.

```js
 1. { type: 'loadStarted' }
 2. { type: 'loadStarted' }
 3. { type: 'pageLoaded', items: [{id:1},{id:2}], hasMore: true }
 4. { type: 'pageLoaded', items: [{id:1},{id:2}], hasMore: true }
 5. { type: 'loadStarted' }
 6. { type: 'loadFailed', error: 'network' }
 7. { type: 'loadStarted' }
 8. { type: 'retried' }
 9. { type: 'loadStarted' }
10. { type: 'pageLoaded', items: [{id:3},{id:4}], hasMore: false }
11. { type: 'loadStarted' }
```

Then check yourself by folding the array with `actions.reduce(feedReducer, initialFeedState)` in Node, logging after each step.

**Practices:** reading a state machine as a machine — four of these eleven actions change nothing, and knowing *which* four is the difference between trusting the guard and hoping it works.

**Hint:** steps 2, 4, 7 and 11 are the interesting ones. For each, ask what `canLoadMore` or the status check said at that moment.

**Expected:** the feed ends with four items, `page: 2`, `status: 'done'`. Exactly four steps return the same reference, and one of them is a `'pageLoaded'` — a real reply carrying real data that gets thrown away on purpose.

### ⭐⭐ 3. Make page 3 fail, then recover (core)

Change `fetchPage` so page 3 rejects (`return Promise.reject(new Error('server exploded'))` after the same delay). Wire the UI so the failure shows a message and a "retry" button, and make sure the feed doesn't spin: the sentinel is still on screen, so the effect will re-run — it must not fire a new request until the human asks.

**Practices:** why `'error'` is a status rather than an extra boolean, and why `canLoadMore` returns false for it. An error state that still allows loading is an infinite retry loop against a server that is already unhappy.

**Hint:** the reducer already has `'loadFailed'` and `'retried'`. This exercise is mostly about trusting them — check what `canLoadMore` says while `status === 'error'` before writing any new logic.

**Expected:** pages 1 and 2 load, then "server exploded" appears with a retry button and everything stops — the observer keeps reporting the sentinel is visible and *nothing happens*. Clicking retry loads page 3 (change the fake API to succeed the second time, or watch it fail again on demand). The twenty items from pages 1 and 2 stay on screen throughout.

### ⭐⭐ 4. The planted bug: an observer that never settles (core)

A teammate "simplified" the hook to take a plain options object:

```js
function useOnScreen(targetRef, options) {
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => setOnScreen(entries[0].isIntersecting), options);
    observer.observe(targetRef.current);
    return () => observer.disconnect();
  }, [targetRef, options]);          // looks honest!
  return onScreen;
}
// called as: useOnScreen(sentinelRef, { root: listRef.current, rootMargin: '120px' })
```

Predict what the "observer callbacks" counter does, explain why, and fix it without giving up the honest dependency array.

**Practices:** project 30's lesson in a new costume — an inline object is a *new* object every render, and a dependency array compares by identity.

**Hint:** what does `Object.is(prevOptions, nextOptions)` say about two `{ rootMargin: '120px' }` objects with identical contents?

**Expected:** the counter climbs without end even when nothing moves, because every render destroys and rebuilds the observer, and every fresh observer immediately reports the sentinel's current visibility, which sets state, which renders. Two honest fixes exist and the solution shows both.

### ⭐⭐⭐ 5. Cursor pagination that survives a shifting feed (challenge)

Page numbers are a lie when the list can change while you read it: if someone posts a new item while you're on page 2, the server's page 3 starts one item later than it used to and you either see a row twice or miss it entirely. Real feeds ask "give me 20 after item 4213" instead — a **cursor**.

Add to `feed.js` a pure `mergePage(items, incoming)` that appends only ids not already present, keeps order, de-duplicates *within* `incoming` too, and returns the **same array reference** when nothing is new. Add `cursorOf(items)` returning the last id (or `null`). Use `mergePage` in `'pageLoaded'`, and write tests for all of it — including the shifting-feed scenario where page 2 re-sends the last item of page 1.

**Practices:** making correctness structural. Once the merge itself refuses duplicates, the feed is right even if the observer misbehaves, the network retries, or the server overlaps its pages.

**Hint:** a `Set` of the ids you already have, and add to it as you walk `incoming` so a page containing the same id twice can't slip through. The same-reference return is the no-op contract again.

**Expected:** six tests pass. `mergePage(it(1,2,3), it(3,4,5))` gives ids `1,2,3,4,5`; `mergePage(items, it(1,2))` where `items` already holds 1 and 2 returns `items` itself (`assert.equal`, not `deepEqual`); and the reducer keeps its no-mutation guarantee.

## Solutions

### 1. A button that obeys the same rule

```jsx
function Feed() {
  const [state, dispatch] = useReducer(feedReducer, initialFeedState);
  // ...refs and useOnScreen as before...
  const allowed = canLoadMore(state);

  function loadNextPage() {
    if (!allowed) return;
    const nextPage = state.page + 1;
    dispatch({ type: 'loadStarted' });
    fetchPage(nextPage).then(
      (res) => dispatch({ type: 'pageLoaded', items: res.items, hasMore: res.hasMore }),
      (err) => dispatch({ type: 'loadFailed', error: String(err) }),
    );
  }

  useEffect(() => {
    if (sentinelVisible) loadNextPage();
  }, [sentinelVisible, allowed, state.page]);

  return (
    <div>
      {/* ...stats and list... */}
      <button onClick={loadNextPage} disabled={!allowed}>
        {state.status === 'loading' ? 'loading…' : 'Load more'}
      </button>
    </div>
  );
}
```

**Why:** the button and the observer are two *triggers* for one *rule*, and the rule stays in one pure function that both consult. `disabled={!allowed}` is the courteous half — it tells the user the button is unavailable — and the reducer's `if (!canLoadMore(state)) return state;` is the load-bearing half, because a disabled attribute is a UI hint, not a guarantee. This is the general shape: make the interface honest for humans *and* make the state machine refuse anyway.

### 2. Predict the state, action by action

```
 1. loadStarted  -> status=loading page=0 ids=[]        new
 2. loadStarted  -> status=loading page=0 ids=[]        SAME REFERENCE
 3. pageLoaded   -> status=idle    page=1 ids=[1,2]     new
 4. pageLoaded   -> status=idle    page=1 ids=[1,2]     SAME REFERENCE
 5. loadStarted  -> status=loading page=1 ids=[1,2]     new
 6. loadFailed   -> status=error   page=1 ids=[1,2]     new
 7. loadStarted  -> status=error   page=1 ids=[1,2]     SAME REFERENCE
 8. retried      -> status=idle    page=1 ids=[1,2]     new
 9. loadStarted  -> status=loading page=1 ids=[1,2]     new
10. pageLoaded   -> status=done    page=2 ids=[1,2,3,4] new
11. loadStarted  -> status=done    page=2 ids=[1,2,3,4] SAME REFERENCE
```

**Why:** the four no-ops are the four ways this feed defends itself. Step 2 is the duplicate-request bug being refused — `canLoadMore` is false because the status is already `'loading'`. Step 4 is subtler and the most important one here: it's a genuine reply carrying genuine data, and it is *discarded*, because the status is `'idle'` and therefore nobody is waiting for it. That single line is what makes a doubled request harmless instead of merely unlikely. Step 7 stops an error from being retried by an observer that doesn't know any better; only a human's `'retried'` (step 8) reopens the door. Step 11 is `'done'` being permanent. Notice also what never happens: `page` only ever advances on a `'pageLoaded'` that was actually awaited, so the page counter can't drift no matter how the triggers fire.

### 3. Make page 3 fail, then recover

```js
let failNextThree = true;
function fetchPage(page) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (page === 3 && failNextThree) {
        failNextThree = false;          // succeed on the retry
        return reject(new Error('server exploded'));
      }
      // ...normal path...
    }, 500);
  });
}
```

```jsx
{state.status === 'error' && (
  <div className="row note">
    {state.error}{' '}
    <button onClick={() => dispatch({ type: 'retried' })}>retry</button>
  </div>
)}
```

**Why:** almost nothing needed writing, which is the lesson. The effect already reads `allowed`, `canLoadMore` already returns false for `'error'`, and the reducer already refuses `'loadStarted'` in that state — so the moment `'loadFailed'` lands the feed goes quiet even though the sentinel is still sitting there, visible, and the effect is still re-running. Compare that to the original: with no status at all, a failed fetch would leave a feed that retries as fast as the scroll handler fires, which is how a hiccup on the server becomes an outage. `'retried'` moves the status back to `'idle'`, `allowed` flips true, the effect's next run starts one request, and the twenty items already on screen were never touched — failures append nothing and delete nothing.

### 4. The planted bug: an observer that never settles

The counter runs away. `{ root: ..., rootMargin: '120px' }` is a brand-new object on every render, `[targetRef, options]` compares dependencies with `Object.is`, so the effect's cleanup and setup run every single render: disconnect, build a new observer, observe. A fresh observer always delivers an initial report, that report calls `setOnScreen`, and even when the boolean is unchanged React has already re-rendered once to find that out — and the render rebuilds the observer again. Two fixes:

```js
// (a) depend on the primitives, not the container — the page's approach
function useOnScreen(targetRef, { rootRef, rootMargin = '0px' } = {}) {
  useEffect(() => { /* ... */ }, [targetRef, rootRef, rootMargin]);
}

// (b) keep the object parameter, but make the CALLER stabilise it
const options = useMemo(() => ({ root: listRef.current, rootMargin: '120px' }), []);
const sentinelVisible = useOnScreen(sentinelRef, options);
```

**Why:** (a) is better, and it's better for a reason worth generalising: an API that takes primitives and refs *cannot* be misused this way, while (b) works only as long as every caller remembers `useMemo`. Pushing the stability requirement into the hook's signature instead of its documentation is the same instinct as putting the load guard in the reducer instead of in each trigger — make the wrong version hard to write rather than hoping it isn't written. Note too that the broken hook still *works*, in the sense that the feed loads and the rows are right; it just does it while burning a rebuild per render. Correctness bugs announce themselves, and this kind doesn't.

### 5. Cursor pagination that survives a shifting feed

```js
export function mergePage(items, incoming) {
  const seen = new Set(items.map((item) => item.id));
  const fresh = [];
  for (const item of incoming) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);            // guards duplicates WITHIN incoming too
    fresh.push(item);
  }
  if (fresh.length === 0) return items;  // nothing new: same reference
  return [...items, ...fresh];
}

export function cursorOf(items) {
  return items.length === 0 ? null : items[items.length - 1].id;
}
```

In the reducer, `'pageLoaded'` becomes `items: mergePage(state.items, action.items)`.

```js
const it = (...ids) => ids.map((id) => ({ id }));

test('mergePage appends genuinely new items in order', () => {
  assert.deepEqual(mergePage(it(1, 2), it(3, 4)), it(1, 2, 3, 4));
});

test('mergePage drops ids that are already present', () => {
  assert.deepEqual(mergePage(it(1, 2, 3), it(2, 3, 4, 5)), it(1, 2, 3, 4, 5));
});

test('mergePage de-duplicates within the incoming page too', () => {
  assert.deepEqual(mergePage(it(1), it(2, 2, 3)), it(1, 2, 3));
});

test('an all-duplicate page returns the SAME array reference', () => {
  const items = it(1, 2, 3);
  assert.equal(mergePage(items, it(1, 2)), items);
  assert.equal(mergePage(items, []), items);
});

test('the shifting-feed scenario: no duplicates, nothing skipped', () => {
  let items = mergePage([], it(1, 2, 3));
  items = mergePage(items, it(3, 4, 5));       // page 2 overlaps by one
  assert.deepEqual(items, it(1, 2, 3, 4, 5));
  assert.equal(cursorOf(items), 5);            // ask for "20 after 5" next
});

test('mergePage never mutates its inputs', () => {
  const items = it(1, 2);
  const incoming = it(2, 3);
  const before = JSON.stringify([items, incoming]);
  mergePage(items, incoming);
  assert.equal(JSON.stringify([items, incoming]), before);
});
```

**Why:** this is defence in depth, and it changes what you have to be sure of. The reducer's guard makes a *second request* impossible; `mergePage` makes a *duplicate row* impossible even if a duplicate reply somehow arrives — from a retry, from two tabs, from a server that overlaps its pages. Neither makes the other pointless: without the guard you'd still fire redundant requests (wasted bytes, wasted battery) even though the screen looked right. The `Set` grows as it walks `incoming` so that a single page containing the same id twice can't sneak through, which the naive `incoming.filter(i => !seen.has(i.id))` version misses. And returning `items` unchanged when nothing is new keeps the no-op contract intact all the way up: an entirely redundant page produces an identical state object and React re-renders nothing at all. `cursorOf` is the other half of the real fix — send the last id you actually hold, and the server can answer "20 after this one" correctly no matter how the list shifted underneath you.
