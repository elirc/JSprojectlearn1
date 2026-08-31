# 🏋️ Practice: Optimistic Updates

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

(Once for this file: the timelines here can all be reasoned out offline; running the pages needs the CDN or a cached load.)

## Exercises

### ⭐ 1. Predict: the fast double-click, with the guard on duty (warm-up)

Trace the refactor exactly. Heart starts 🤍. At t=0 you click; at t=300ms you click again. The first request will **fail** at t=1200ms; the second will **succeed** at t=1500ms. Write down: the heart at t=0, t=300ms, t=1200ms, and t=1600ms, and whether any error note ever appears. Then redo the trace assuming the second request *also fails* (at t=1500ms).

*Practices:* reading the attempt-counter guard as a timeline, not a line of code.
*Hint:* at t=300ms, what is `liked` (already re-rendered), so what is `next`? And which attempt number does each catch block compare against?
*Expected:* both traces match the solution, including the final heart in each scenario.

### ⭐⭐ 2. Optimistic like *count* (core)

Give each post a like counter starting at 12 ("🤍 12"). Clicking updates the heart **and** the number instantly (13 when liking, back to 12 when unliking), and a failed save rolls *both* back together.

*Practices:* multi-field predictions — a rollback must restore the whole prediction, not half of it.
*Hint:* derive the delta from `next` (`next ? +1 : -1`) and use updater-form setters in both directions.
*Expected:* clicks move heart and count with zero delay; on a failure, heart and count snap back together and the note appears; rapid clicking still converges (the guard already protects both fields).

### ⭐⭐ 3. Retry the *intention*, not the toggle (core)

Add a "retry" button inside the error note. Careful: after a failed like, the heart rolled back to 🤍 — so a naive `toggleLike()` would just re-derive "like" from current state and happen to work... until a *newer* click has changed the state, when it would retry the wrong thing. Restructure so the failed **intended value** is stored with the error and retried verbatim.

*Practices:* separating "what the user asked for" from "what's currently on screen".
*Hint:* extract `save(next)`; on failure store `{ message, intended: next }` in the error state; retry calls `save(error.intended)`.
*Expected:* after a failure, clicking retry re-flips the heart instantly and tries again (it may fail again — another note); normal clicks still work; the note clears whenever a new attempt starts.

### ⭐⭐ 4. "Syncing…" without blocking (core)

The refactor deleted `pending` entirely — but a subtle hint is nice. Show a small "syncing…" tag on the post while *any* request is in flight, without ever disabling the button. Note that several requests can overlap, so a boolean will glitch — prove to yourself why, then count instead.

*Practices:* pending state for concurrent operations — a counter, not a flag.
*Hint:* `setInFlight(n => n + 1)` before the `await`, decrement in `finally`; render the tag when `> 0`.
*Expected:* one click → tag appears, disappears ~1.2s later; three rapid clicks → tag appears once and stays until the *last* request settles, then disappears; the heart stays instant throughout.

### ⭐⭐⭐ 5. Delete, done pessimistically — in the same app (challenge)

Add a "delete" button to each post. Per the judgment table, deletion is high-stakes: implement it *pessimistically* (button shows "deleting…" and is disabled; the post disappears only after the server confirms; on failure the post stays, with a note) while the like button stays optimistic. Lift the posts into `App` state; reuse the fake-server pattern for `deleteOnServer(postId)`.

*Practices:* choosing per action, not per app — both patterns living honestly side by side.
*Hint:* `Post` reports success via an `onDelete(id)` prop; `App` filters the array. In the success path, don't touch local state after calling `onDelete` — the component is about to unmount.
*Expected:* like = instant with occasional rollback; delete = ~1.2s of visible "deleting…", then the post vanishes (or stays, with an error). No post ever disappears before the server says yes.

## Solutions

### 1. Predict: the fast double-click, with the guard on duty

Scenario A — t=0: click 1 (`next=true`, attempt 1) → ❤️ instantly. t=300ms: `liked` is already `true`, so click 2 has `next=false`, attempt 2 → 🤍 instantly. t=1200ms: attempt 1's catch runs, compares `1 !== 2` → returns; **no rollback, no note** — heart stays 🤍. t=1500ms: attempt 2 succeeds — nothing to do. Final: 🤍, no error ever shown. Scenario B — same until t=1500ms: attempt 2's catch compares `2 === 2` → rolls back to `!next` = ❤️ and shows the note. Final: ❤️ + "couldn't save".

**Why:** the guard's rule is "only the newest intention may correct the screen." The stale failure in scenario A is *about an obsolete wish* (liking), so acting on it would betray the newer wish (unliking). In scenario B the failure is about the current wish, so the rollback is honest. Note the endpoint always matches the last thing the *server* accepted or refused — the system converges.

### 2. Optimistic like *count*

```jsx
const [likes, setLikes] = useState(12);

async function toggleLike() {
  const next = !liked;
  const delta = next ? 1 : -1;
  const attempt = ++attemptRef.current;

  setLiked(next);                    // predict both fields together
  setLikes((n) => n + delta);
  setError(null);

  try {
    await likeOnServer(1, next);
  } catch (e) {
    if (attempt !== attemptRef.current) return;
    setLiked(!next);                 // roll back both fields together
    setLikes((n) => n - delta);
    setError(`couldn't save — ${e.message}`);
  }
}
// button: {liked ? '❤️' : '🤍'} {likes}
```

**Why:** the prediction is now a two-field transaction, and the rollback must be its exact inverse — captured cleanly by reusing the same `delta`. Updater-form setters matter here: with overlapping attempts, `setLikes(n => n - delta)` subtracts from the *current* count rather than restoring a stale snapshot, so a rollback can't clobber a newer click's arithmetic. One guard covers everything because the whole transaction shares one attempt number.

### 3. Retry the *intention*, not the toggle

```jsx
async function save(next) {
  const attempt = ++attemptRef.current;
  setLiked(next);
  setError(null);
  try {
    await likeOnServer(1, next);
  } catch (e) {
    if (attempt !== attemptRef.current) return;
    setLiked(!next);
    setError({ message: e.message, intended: next });
  }
}

// button: onClick={() => save(!liked)}
{error && (
  <span style={{ color: '#c33' }}>
    {' '}couldn't save — {error.message}{' '}
    <button onClick={() => save(error.intended)}>retry</button>
  </span>
)}
```

**Why:** `toggleLike` conflated "flip from whatever's current" with "achieve what I asked for." Retry is the second thing: the user's intention (`next` at failure time) is data worth keeping, so it rides along in the error state. `save(error.intended)` replays it verbatim — instantly optimistic again, new attempt number, guard intact. This intention/state split is the same idea behind retry queues in offline-first apps.

### 4. "Syncing…" without blocking

```jsx
const [inFlight, setInFlight] = useState(0);

async function toggleLike() {
  const next = !liked;
  const attempt = ++attemptRef.current;
  setLiked(next);
  setError(null);
  setInFlight((n) => n + 1);
  try {
    await likeOnServer(1, next);
  } catch (e) {
    if (attempt !== attemptRef.current) return;
    setLiked(!next);
    setError(`couldn't save — ${e.message}`);
  } finally {
    setInFlight((n) => n - 1);
  }
}
// in the JSX: {inFlight > 0 && <small style={{ color: '#888' }}> syncing…</small>}
```

**Why:** with overlapping requests, a boolean dies at the first finisher: click-click leaves two flights, and when the first settles, `setPending(false)` would hide the tag while the second is still out. A counter is the truthful shape — the tag means "outstanding requests > 0". The decrement lives in `finally` *above* the guard's early-return concern (every request that started must be counted out, stale or not), which is exactly why the guard in `catch` uses `return` only after `finally` is guaranteed to run — `finally` runs even on early returns.

### 5. Delete, done pessimistically — in the same app

```jsx
function deleteOnServer(postId) {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      if (Math.random() < 0.3) reject(new Error('network hiccup'));
      else resolve({ postId });
    }, 1200));
}

function Post({ id, title, onDelete }) {
  // ...liked/error/attemptRef as before...
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteOnServer(id);
      onDelete(id);                 // only NOW does the post disappear
    } catch (e) {
      setDeleteError(`couldn't delete — ${e.message}`);
      setDeleting(false);           // success path skips this: we're unmounting
    }
  }

  return (
    <div className="post">
      <strong>{title}</strong>
      <button style={{ float: 'right' }} onClick={handleDelete} disabled={deleting}>
        {deleting ? 'deleting…' : 'delete'}
      </button>
      {deleteError && <p style={{ color: '#c33' }}>{deleteError}</p>}
      {/* like button unchanged */}
    </div>
  );
}

function App() {
  const [posts, setPosts] = useState([
    { id: 1, title: 'Why modulo is underrated' },
    { id: 2, title: 'A defence of the humble spreadsheet' },
  ]);
  const removePost = (id) => setPosts((ps) => ps.filter((p) => p.id !== id));
  return (
    <div>
      <h1>Feed</h1>
      {posts.map((p) => <Post key={p.id} id={p.id} title={p.title} onDelete={removePost} />)}
    </div>
  );
}
```

**Why:** deletion fails every test that likes passed — it's high-stakes (data gone), not trivially reversible, and an optimistic vanish-then-reappear would read as data loss. So the pessimistic ritual returns deliberately: disable (no double-fires), await, and mutate shared truth only on confirmation. The `setDeleting(false)` placement is a real-world subtlety: on success the component unmounts via `onDelete`, and setting state afterward would be work on a corpse — so the reset lives only in the failure path. One app, two patterns, each matched to its stakes: that's the actual skill this project teaches.
