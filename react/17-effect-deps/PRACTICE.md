# 🏋️ Practice: Effect Dependencies

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Sync the tab title (warm-up)

Add a second effect to the refactor that keeps the browser tab's title synchronized with the loaded user: `document.title` should read the user's name, or `loading...` while `user` is still `null`. Before writing the deps array, say the README's sentence out loud: "keep ___ synchronized with ___."

**Practices:** writing a fresh effect whose deps fall out of the sentence.
**Hint:** the effect reads exactly one render-scope value.
**Expected:** the tab title says `loading...` briefly at start, then `User #1`; clicking `user 2` flips it to `User #2` about 300ms later (when the fetch lands, not when the button is clicked).

### ⭐⭐ 2. A refresh button (core)

Add a `refresh` button that refetches the *current* user. The trap: `setUserId(userId)` does nothing — same value, so no re-render, and even the deps comparison would find nothing changed. Solve it with a second state, `refreshKey`, that exists only to be a dependency: bumping it re-runs the effect.

**Practices:** deps as re-sync triggers — adding one honestly instead of forcing the old one.
**Hint:** `setRefreshKey((k) => k + 1)` in the button; the effect's deps become `[userId, refreshKey]`.
**Expected:** clicking `refresh` bumps `total requests` by exactly one and re-renders the same name; clicking it three times fast eventually shows three more requests; the user buttons still cost one request each.

### ⭐⭐ 3. Bug A in disguise (core)

A learner "tidied up" the refactor and the request counter is climbing forever again — yet the deps array is right there, filled in:

```jsx
const query = { id: userId };
useEffect(() => {
  fetchUser(query.id).then((u) => setUser(u));
}, [query]);
```

Explain the loop step by step (what re-runs what), then fix it two ways: once by changing the dependency, once by moving the object.

**Practices:** how deps are compared — `Object.is`, identity, not contents.
**Hint:** who creates `query`, and how often? Is this render's `{ id: 1 }` the same as the last render's `{ id: 1 }`?
**Expected:** broken: `total requests` climbs forever, ~3 per second. Either fix: exactly one request per user change again.

### ⭐⭐ 4. Predict: the cancel-out click (core)

The refactor has this extra effect and this extra button. Starting from `userId` 1, predict for one click of each button: does the component re-render, does the log fire, and what does it print?

```jsx
useEffect(() => {
  console.log('synced to user', userId);
}, [userId]);

<button onClick={() => { setUserId(2); setUserId(1); }}>A</button>
<button onClick={() => { setUserId(3); setUserId(2); }}>B</button>
```

**Practices:** predicting effect runs — batching first, then the deps comparison.
**Hint:** React processes the whole click's queue, lands on ONE final value, and only then compares deps against the previous render.
**Expected:** written predictions for A and B (re-render? log line? which number?), checked against the solution.

### ⭐⭐⭐ 5. Poll the current user (challenge)

Make the page live: refetch the current user every 5 seconds, and restart that 5-second rhythm whenever the user changes. One effect, one honest deps array — and this effect creates something that must be torn down, or switching users leaves two pollers running.

**Practices:** an interval whose lifetime is tied to a dependency.
**Hint:** `setInterval` in the effect, `clearInterval` in the returned cleanup; the sentence is "keep a polling loop synchronized with `userId`."
**Expected:** leave the page alone and `total requests` ticks up by one every 5 seconds; click `user 2` and the count bumps once immediately (the existing fetch effect) and the 5-second rhythm starts over — never twice per tick.

## Solutions

### 1. Sync the tab title

```jsx
useEffect(() => {
  document.title = user ? user.name : 'loading...';
}, [user]);
```

**Why:** the sentence is "keep `document.title` synchronized with `user`" — so the deps are `[user]`. The effect reads one render-scope value and the honest rule puts exactly that one in the array. It runs on mount (title `loading...`), then again ~300ms later when the fetch's `setUser` re-renders with a new `user` object; clicking a user button alone doesn't fire it, because `user` hasn't changed *yet* — only the fetch landing changes it.

### 2. A refresh button

```jsx
const [refreshKey, setRefreshKey] = useState(0);

useEffect(() => {
  fetchUser(userId).then((u) => setUser(u));
}, [userId, refreshKey]);

<button onClick={() => setRefreshKey((k) => k + 1)}>refresh</button>
```

**Why:** `setUserId(1)` while already on 1 is a no-op twice over — React bails on the identical state, and even a re-render would find `[userId]` unchanged and skip the effect. `refreshKey` gives the effect a second honest reason to re-run: its value means nothing, but its *changes* mean "sync again now." The updater form makes rapid clicks each count. This nonce-dependency trick is common enough to have a name in the wild: a "refetch token."

### 3. Bug A in disguise

The loop: every render creates a **brand-new** `query` object; deps are compared with `Object.is`, and this render's `{ id: 1 }` is never the same object as last render's, so the effect runs after *every* render → `setUser` re-renders → new `query` → effect again — the no-array storm, rebuilt with an array. Fix 1 — depend on the primitive:

```jsx
const query = { id: userId };
useEffect(() => {
  fetchUser(query.id).then((u) => setUser(u));
}, [userId]);
```

Fix 2 — build the object where it's used, so it isn't a render-scope value at all:

```jsx
useEffect(() => {
  const query = { id: userId };
  fetchUser(query.id).then((u) => setUser(u));
}, [userId]);
```

**Why:** numbers compare by value under `Object.is` (`1` is `1`), objects by identity. Deps arrays want primitives, or values whose identity is genuinely stable. Fix 1 is honest because the effect now only *reads* `query.id`, which is `userId` by another name; Fix 2 makes the array's job trivial by shrinking what the effect reads from the render.

### 4. Predict: the cancel-out click

**A:** no visible re-render, no log. The click's queue is `2, then 1`; React lands on 1, which `Object.is`-equals the current 1, so it bails out (it may run `App` once internally, but the render is discarded and effects never compare deps). **B:** one re-render, one log line: `synced to user 2` — and one fetch from the main effect. The queue lands on 2 ≠ 1, so the render commits and both `[userId]` effects see a changed dep.

**Why:** effects don't watch individual `set` calls — they compare deps between *committed renders*. Intermediate values inside one click never exist as renders in React 18's batching, so no effect can ever observe the momentary 3 in button B. One click, one commit, at most one run per effect.

### 5. Poll the current user

```jsx
useEffect(() => {
  const id = setInterval(() => {
    fetchUser(userId).then((u) => setUser(u));
  }, 5000);
  return () => clearInterval(id);
}, [userId]);
```

**Why:** the effect reads `userId`, so `[userId]` is the honest array — and it doubles as the restart trigger: on a user switch, React runs the cleanup (killing the old poller) before running the effect again (starting a fresh one), so there is never a moment with two intervals alive. Without the cleanup line, each switch would *add* a poller and the request counter would accelerate — the interval outlives the render that made it, which is exactly the territory project 18 maps out. (The interval's callback closing over `userId` is safe here precisely because the effect re-runs per user.)
