# 📘 Learning Guide: Optimistic Updates

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A tiny social-media feed with two posts. Each post has a heart button.
Click the white heart (🤍) and it becomes a red heart (❤️) — a "like".
Click again to unlike.

The twist: liking a post has to be saved on a server, and this demo's
pretend server is slow (1.2 seconds) and unreliable (it fails 30% of the
time, on purpose). The two versions of this app handle that differently:

- **Original:** you click, the button greys out and says "saving…", and
  the heart only changes 1.2 seconds later.
- **Refactored:** the heart changes **instantly** — and if the server
  later says "no", the heart quietly flips back with a small error note.

Same server. Same failure rate. Very different feel.

## 2. Concepts you need first

This project leans on a few ideas beyond basic React. Take them one at a
time. (For `useState`, JSX, and components themselves, see the earlier
projects' LEARN.md files — we'll stay brief on those here.)

### A promise (a "we'll see" value)

When JavaScript asks for something slow — like talking to a server — it
doesn't freeze and wait. Instead it immediately gets back a **promise**:
an object that means "I don't have your answer *yet*, but I will."

A promise ends in one of two ways:
- it **resolves** — success, here's your value; or
- it **rejects** — failure, here's an error.

```js
const p = new Promise((resolve, reject) => {
  setTimeout(() => resolve("done!"), 1000); // succeed after 1 second
});
p.then(value => console.log(value)); // prints "done!" a second later
```

### async / await (reading promises like normal code)

`await` means "pause *this function* here until the promise settles."
It only works inside a function marked `async`. While the function is
paused, the rest of the page keeps running — buttons still click.

```js
async function run() {
  const answer = await somethingSlow(); // wait for the promise
  console.log(answer);                  // runs after it resolves
}
```

### try / catch / finally (handling failure)

If an awaited promise **rejects**, JavaScript throws an error. You catch
it with `try/catch`. A `finally` block runs either way — success or
failure — which makes it perfect for cleanup like "stop the spinner".

```js
try {
  await mightFail();
  console.log("worked");
} catch (e) {
  console.log("failed:", e.message);
} finally {
  console.log("this always runs");
}
```

### setTimeout (do something later)

`setTimeout(fn, ms)` runs the function `fn` after `ms` milliseconds.
This project uses it to *fake* a slow server: it waits 1.2 seconds
before answering, just like a real network round trip.

```js
setTimeout(() => console.log("1.2s later"), 1200);
```

### A fake server, and Math.random

`Math.random()` returns a random number between 0 and 1. The line
`if (Math.random() < 0.3) reject(...)` means "fail 30% of the time."
The demo does this deliberately so you can *watch* failures happen.

### Pessimistic vs optimistic UI

Two strategies for showing the result of a saved action:

- **Pessimistic UI:** don't show the change until the server confirms
  it. Honest, safe, slow-feeling. ("Pessimistic" = assume it might fail.)
- **Optimistic UI:** show the change *immediately*, assume the server
  will agree, and **roll back** (undo the change on screen) if it
  doesn't. ("Optimistic" = assume it will succeed.)

Optimistic UI is a three-step dance: **predict** (update the screen
now), **sync** (tell the server in the background), **roll back**
(undo visibly if the server objects).

### useRef (a box that survives re-renders without causing them)

`useRef(0)` gives you an object with one property, `.current`. You can
read and write `.current` any time. Changing it does **not** re-render
the component — unlike state. It's a private notepad for the component.

```js
const countRef = useRef(0);
countRef.current = countRef.current + 1; // no re-render happens
```

### A race condition (and why we need a guard)

A **race condition** is when two slow operations finish in the "wrong"
order and the late one overwrites the newer truth. Here: you click like,
then quickly click unlike. Two server requests are in flight. If the
*first* one fails and comes back last, its rollback would undo your
*second* click — chaos. The fix: number each attempt, and when a failure
comes back, only act on it if it's still the **latest** attempt.

## 3. Walking through the original code

The fake server:

```js
function likeOnServer(postId, liked) {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      if (Math.random() < 0.3) reject(new Error('network hiccup'));
      else resolve({ postId, liked });
    }, 1200),
  );
}
```

It returns a promise that settles after 1.2 seconds: 30% of the time it
rejects with an error, otherwise it resolves with the saved value.

Each `Post` component keeps three pieces of state:

```js
const [liked, setLiked] = useState(false);
const [pending, setPending] = useState(false);
const [error, setError] = useState(null);
```

`liked` is whether the heart is red. `pending` is "are we currently
waiting for the server?". `error` holds a failure message (or nothing).

The click handler is the pessimistic pattern:

```js
async function toggleLike() {
  setPending(true);
  setError(null);
  try {
    const result = await likeOnServer(1, !liked);
    setLiked(result.liked); // UI updates 1.2s after the click
  } catch (e) {
    setError(e.message);
  } finally {
    setPending(false);
  }
}
```

In order: turn on the spinner, clear any old error, ask the server, and
only *after* it answers, update the heart. On failure, show the error.
Either way, `finally` turns the spinner off.

The button reflects all of it:

```js
<button onClick={toggleLike} disabled={pending}>
  {liked ? '❤️' : '🤍'} {pending ? '(saving…)' : ''}
</button>
```

`disabled={pending}` greys the button out while waiting, so you can't
double-click. The label shows "(saving…)" during the wait.

## 4. What's wrong with it (in beginner terms)

Here's the surprise: **nothing is technically wrong.** The code is
correct. The heart never shows a like the server hasn't confirmed.

The problem is how it *feels*. Play the scene: you click the heart.
Nothing changes. The button greys out. You wait. And wait. 1.2 seconds
is an eternity for a click — long enough that real users think the app
is broken, click somewhere else, or stop liking things entirely.

And it's a bad *trade* for this particular action. A like is:
- **low-stakes** — nobody is harmed if it briefly shows wrong;
- **usually successful** — 70% of the time here, ~99% in real life;
- **easy to reverse** — flipping a heart back costs nothing.

Making the user pay 1.2 seconds of waiting on *every* click, to protect
against a rare and harmless failure, buys almost nothing. The README's
deeper point: for payments or deletes, this pessimistic code would be
exactly right. The pattern isn't broken — it's mismatched to the stakes.

## 5. Try it yourself first!

Try modifying `original.html` before peeking at the solution.

1. **Vague hint:** what if you updated the heart *before* asking the
   server, instead of after?
2. **Warmer:** in `toggleLike`, compute the new value first
   (`const next = !liked`), call `setLiked(next)` immediately, *then*
   `await likeOnServer(...)`.
3. **Warmer still:** what happens when the server rejects? You already
   showed the new heart — you need to put it back. In the `catch`
   block, call `setLiked(!next)` and set an error message.
4. **The subtle one:** click the heart twice, fast. Two requests are
   racing. If the *old* one fails, its rollback undoes your *new*
   click. Keep a counter in a `useRef`; bump it on every click; in the
   `catch`, ignore the failure if the counter has moved on.
5. Also ask: do you still need `pending` and `disabled` at all?

## 6. Understanding the refactored solution

The refactor keeps the same server and adds one ref:

```js
const [liked, setLiked] = useState(false);
const [error, setError] = useState(null);
const attemptRef = useRef(0);
```

Notice `pending` is *gone* — there's no waiting state to show, because
the UI never waits. The button is never disabled.

The new `toggleLike` is the optimistic three-step, with the guard:

```js
const next = !liked;
const attempt = ++attemptRef.current;

setLiked(next);       // 1. instant feedback
setError(null);

try {
  await likeOnServer(1, next);           // 2. sync in background
} catch (e) {
  if (attempt !== attemptRef.current) return; // a newer click superseded us
  setLiked(!next);    // 3. server said no: put it back
  setError(`couldn't save — ${e.message}`);
}
```

Design choices, one by one:

- **`setLiked(next)` before `await`** — the prediction. The user sees
  the heart flip the instant they click. State here is a *guess* about
  what the server will say; for likes, wrong guesses are cheap to fix.
- **`++attemptRef.current`** — every click gets a number: 1, 2, 3…
  The handler remembers *its own* number in the local variable
  `attempt`. A ref is used (not state) because this number is
  bookkeeping — changing it should never redraw the screen.
- **`if (attempt !== attemptRef.current) return;`** — the race guard.
  When a failure arrives, the handler checks: "am I still the newest
  click?" If a newer click happened, the newer prediction is the one on
  screen, and this stale failure must not touch it. Only the latest
  attempt is allowed to roll back.
- **`setLiked(!next)` + `setError(...)`** — the *visible* rollback.
  The heart flips back AND the user is told why. Silently undoing the
  user's action would feel like a glitch; the note makes it honest.
- **Nothing on success.** If the server agrees, the screen was already
  right. No code needed — that's the beauty of predicting well.

The page's footer text is part of the lesson: optimistic for likes,
stars, toggles, reorders; pessimistic (the original!) for payments,
deletes, sends. You choose per *action*, not per app.

## 7. Words you learned (glossary)

- **Promise:** an object representing a value that isn't ready yet; it
  eventually resolves (success) or rejects (failure).
- **Resolve / reject:** the two possible endings of a promise.
- **async function:** a function allowed to use `await` inside it.
- **await:** pause this function until a promise settles.
- **try / catch / finally:** run code, handle any error it throws, and
  run cleanup code either way.
- **setTimeout:** run a function after a delay in milliseconds.
- **Pessimistic UI:** wait for server confirmation before showing a
  change.
- **Optimistic UI:** show the change immediately, sync in the
  background, roll back if the server objects.
- **Rollback:** undoing an on-screen change because the save failed.
- **useRef:** a hook giving a mutable `.current` box that persists
  across renders without causing re-renders.
- **Race condition:** slow operations finishing out of order, letting
  stale results overwrite fresh ones.
- **Race guard:** a check (here, an attempt counter) that ignores
  results from outdated operations.
- **Round trip:** one full request-to-server-and-back journey.
- **Pending state:** state that tracks "an operation is in progress".

## 8. Experiments to try on the plane (no internet needed)

You can read and edit these files offline, but note: the page itself
loads React from a CDN (a content-delivery network — servers that host
shared libraries), so *running* it in a browser needs internet at least
once. Reading and reasoning about the edits works anywhere.

1. **Crank the failure rate.** In `refactored/index.html`, change
   `Math.random() < 0.3` to `< 0.9`. Expected: almost every like flips
   back a second later with the error note. Optimistic UI feels bad
   when failure is common — that's one row of the judgment table.
2. **Remove the race guard.** Delete the line
   `if (attempt !== attemptRef.current) return;` and click a heart
   rapidly 4–5 times. Expected: occasionally the heart ends in the
   wrong position, because a stale failure rolled back a newer click.
3. **Make the rollback silent.** Remove the `setError(...)` call in the
   catch. Expected: hearts sometimes just... un-click themselves, with
   no explanation. Feel how much worse that is than an honest note.
4. **Speed up the original.** In `original.html`, change `1200` to
   `100`. Expected: the pessimistic version suddenly feels fine. The
   pattern choice depends on latency too, not just stakes.
5. **Try state instead of a ref.** Replace `attemptRef` with a
   `useState` counter and predict what breaks. (Hint: the handler
   captures the counter's value from *its* render, so the "am I the
   latest?" comparison reads a stale number — and each click now causes
   an extra re-render for pure bookkeeping.)
