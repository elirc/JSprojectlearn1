# 📘 Learning Guide: Async Submit

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A checkout page. You see a text box for a delivery note, a big
"Place order ($499)" button, and — for teaching purposes — a red
counter showing how many orders the (fake) server has processed.

- **Original:** click the button. Nothing visibly happens for 1.5
  seconds. So you click again. And again. When the dust settles, the
  ledger reads: **3 orders**. You just bought three $499 items.
- **Refactored:** mash the button as fast as you like. The button
  greys out, says "Placing order…", and exactly ONE order goes
  through. Then a "Thank you!" screen. And since the demo server
  fails 25% of the time, you'll also see the failure path: a clear
  error message and a form you can retry.

## 2. Concepts you need first

### Promises, async/await, try/catch (quick recap)

A **promise** is a "value later" — it eventually **resolves**
(success) or **rejects** (failure). `await` pauses an `async` function
until the promise settles; a rejected promise throws, which you handle
with `try/catch`. Project 39's LEARN.md teaches these from scratch.

```js
try {
  const result = await placeOrder(note); // waits ~1.5s
  // success path
} catch (err) {
  // failure path — err.message explains
}
```

### The "meanwhile" (the gap where bugs live)

Between clicking and the server answering, there's a gap — call it the
**meanwhile**. The screen is idle, but a request is in flight. The key
question for ANY async code: *what can the user do during the
meanwhile, and does the code know it's in one?* In the original, the
answer is "click Buy again" and "no". Every async bug in this project
lives in that gap.

### Pending state

**Pending state** is state that records "an operation is currently in
progress". It's how the code knows it's in a meanwhile. With it, you
can disable buttons, show spinners, and refuse duplicate requests.
Without it, the UI is flying blind for 1.5 seconds.

### A status state machine (one value, not three booleans)

A submission has exactly four phases:

```
idle → submitting → done
                  ↘ error (→ back to a retryable form)
```

Model it as ONE state value — an object with a `status` string:

```js
const [submission, setSubmission] = useState({ status: 'idle' });
setSubmission({ status: 'submitting' });
setSubmission({ status: 'done', confirmation: result });
setSubmission({ status: 'error', message: err.message });
```

Why one object instead of separate `isLoading`, `isDone`, `errorMsg`
states? Because separate booleans can contradict each other
(loading AND done at once?), while one `status` can only be one thing.
Each phase carries only the data that phase needs — `done` has a
confirmation, `error` has a message. (Project 20 teaches this shape
for reads; here it's applied to a write.)

### Deriving the UI from the status

Every visual decision then *reads* the status — no extra state:

```js
const isSubmitting = submission.status === 'submitting';
// button disabled?   isSubmitting
// button label?      isSubmitting ? 'Placing order…' : 'Place order'
// show error note?   submission.status === 'error'
// show thank-you?    submission.status === 'done'
```

### The double-submit bug family

This track has three race-condition projects; it helps to place them:
- **Project 19:** stale *reads* — an old fetch response overwrites a
  newer one. Annoying.
- **Project 39:** cheap *writes* (likes) — optimistic UI with rollback.
- **This one:** expensive writes — payments, sends, deletes. A
  duplicate here isn't a glitch, it's a support ticket and a refund.

### Guard clause

A **guard clause** is an early `return` at the top of a function that
refuses to proceed under some condition:

```js
if (submission.status === 'submitting') return; // already busy — refuse
```

### Idempotency (the server-side footnote)

An operation is **idempotent** if doing it twice has the same effect
as doing it once. Real payment servers make order-placing idempotent
with an **idempotency key**: the client sends a unique key per order
attempt, and the server ignores repeats of the same key. Why mention
it? Because UI guards can always be bypassed (a laggy browser, a
malicious user, a second tab). UI guards are for *experience*; server
guards are for *money*.

### One quirk in the demo: module-level `let`

`let ordersPlaced = 0;` sits *outside* any component — it's the fake
server's private ledger, not React state. That's deliberate: it
represents the server's database. React doesn't re-render when it
changes; you see fresh values only when something else triggers a
render.

## 3. Walking through the original code

The fake server processes every request it gets, 1.5 seconds later,
and counts them:

```js
let ordersPlaced = 0;
function placeOrder(note) {
  return new Promise((resolve) =>
    setTimeout(() => {
      ordersPlaced++;
      resolve({ orderNumber: 1000 + ordersPlaced, note });
    }, 1500),
  );
}
```

The component keeps just the note text and the confirmation:

```js
const [note, setNote] = useState('');
const [confirmation, setConfirmation] = useState(null);

async function handleSubmit(e) {
  e.preventDefault();
  // Nothing stops a second click while the first is in flight.
  const result = await placeOrder(note);
  setConfirmation(result);
}
```

Read that handler carefully. It prevents the page reload, sends the
order, waits, then shows the confirmation. What it *doesn't* do:
change anything about the screen when the wait begins. The button:

```js
<button type="submit">Place order ($499)</button>
```

No `disabled`. No label change. During the 1.5-second meanwhile, this
button is fully armed and every click starts another `placeOrder`.

## 4. What's wrong with it (in beginner terms)

Play the scene as a real user. You click "Place order". The screen
does... nothing. No spinner, no grey button, no message. Your brain
concludes what every user's brain concludes: *the click didn't
register.* So you click again. Maybe once more, firmly.

Here's what actually happened: click #1 started a request. The button
never learned about it, so clicks #2 and #3 each started *another*
request. The server — which dutifully processes everything it
receives — logs three orders. The ledger on screen proves it: three
clicks, three $499 charges. The confirmation you eventually see looks
innocent ("✅ order #1003 placed"), hiding that #1001 and #1002 also
exist.

The root cause in one sentence: **the code has no memory that a
request is in flight.** There is no pending state, so:
- the handler can't refuse a duplicate (it doesn't know it's busy);
- the button can't disable itself (nothing to derive `disabled` from);
- the user gets no feedback (nothing to render a "working…" label
  from).

Also missing: any failure handling. If the server rejected, the
`await` would throw, the error would land nowhere useful, and the user
would see silence forever.

## 5. Try it yourself first!

1. **Vague:** the app needs to *know* it's waiting. Where does
   "knowing" live in React?
2. **Warmer:** add a piece of state that flips on when the request
   starts and off when it finishes. Set it before the `await`.
3. **Warmer still:** use that state three ways: `disabled` on the
   button, a different button label ("Placing order…"), and an early
   `return` at the top of the handler if already submitting.
4. **Level up:** instead of a boolean, model the whole lifecycle:
   `idle → submitting → done | error`, as one object like
   `{ status: 'submitting' }`. Give `done` its confirmation and
   `error` its message. Render a different screen for `done`.
5. **Test your work:** the server helps you — make it fail sometimes
   (`if (Math.random() < 0.25) reject(...)`) and check that failure
   lands you back on a form you can retry, with a clear message.

## 6. Understanding the refactored solution

**The state machine:**

```js
const [submission, setSubmission] = useState({ status: 'idle' });
```

**The handler walks the phases:**

```js
async function handleSubmit(e) {
  e.preventDefault();
  if (submission.status === 'submitting') return; // the phase check

  setSubmission({ status: 'submitting' });
  try {
    const result = await placeOrder(note);
    setSubmission({ status: 'done', confirmation: result });
  } catch (err) {
    setSubmission({ status: 'error', message: err.message });
  }
}
```

Note the transitions are **whole objects** — each `setSubmission`
replaces the previous phase entirely, so no leftover fields from an
old phase can linger.

**The three defenses, layered** (the code comments them):

1. `disabled={isSubmitting}` — the browser physically refuses clicks.
2. The label flips to "Placing order…" — this one is for the *human*:
   with feedback, users stop mashing. It's UX, not just safety.
3. The guard clause in the handler — belt and braces. Why, if the
   button is disabled? Because forms can be submitted by keyboard
   (Enter), events can double-fire, and some future redesign might
   remove the `disabled` without knowing what it protected. The
   handler defends itself.

**The done screen** — when `status === 'done'`, the component returns
a completely different tree ("Thank you!" + order number). A clear
landing, not a form that still looks submittable.

**The error path** — the demo fails 25% of the time on purpose so
you'll actually see it: a red message ("payment gateway timeout —
nothing was charged, try again") *and* the form still there, enabled,
retryable. Pending state isn't only about blocking; it's the full
lifecycle: feedback while waiting, a clear success landing, a
recoverable failure landing.

**The textarea also disables during submit** — so the note can't
change mid-flight and the whole form visibly reads as "busy".

**The honest footnote:** the refactor guards the UI, and real systems
*also* guard the server with idempotency keys. Never trust the client
alone with a wallet.

## 7. Words you learned (glossary)

- **Async action:** an operation that finishes later (network, timer).
- **Promise / resolve / reject:** a value-later object and its two
  endings.
- **await / async:** pause a function until a promise settles.
- **try / catch:** run code; handle the error if it throws.
- **The meanwhile:** the gap between starting an async action and its
  completion — where duplicate-action bugs live.
- **In flight:** a request that has been sent but hasn't answered yet.
- **Pending state:** state recording that an operation is in progress.
- **State machine:** modeling something as named phases with allowed
  transitions (idle → submitting → done | error).
- **Status object:** one state value like `{ status: 'error',
  message }` — phases can't contradict each other.
- **Derived UI:** visual decisions computed from state, not stored.
- **Guard clause:** an early `return` refusing to run under a
  condition.
- **Double-submit bug:** one intended action, multiple requests sent.
- **Idempotent:** safe to repeat — doing it twice equals doing it once.
- **Idempotency key:** a unique per-attempt token servers use to
  ignore duplicate requests.
- **Ledger:** the running record of what the server actually did.
- **UX:** user experience — how the app feels to use.

## 8. Experiments to try on the plane (no internet needed)

You can edit and reason offline; the pages load React from a CDN
(shared library servers), so actually running them needs internet on
first load.

1. **Remove one defense at a time.** In the refactor, delete
   `disabled={isSubmitting}` but keep the guard clause. Mash the
   button. Expected: still one order — the guard catches what the
   browser no longer blocks. Now also delete the guard: duplicates
   return. Each layer was pulling weight.
2. **Reproduce the bug with a keyboard.** In the original, click into
   the textarea and press Enter several times quickly (Enter submits
   forms). Expected: multiple orders without touching the button —
   why defense #3 exists even when the button is disabled.
3. **Make failure the common case.** Change `Math.random() < 0.25` to
   `< 0.9`. Expected: most submits land on the error message with a
   retryable form; the app stays calm and usable even when the
   "network" is awful. That's the lifecycle doing its job.
4. **Add a cancel-feeling reset.** On the error screen, the form
   already allows retry — now add a "start over" button on the done
   screen that sets `{ status: 'idle' }` and clears the note.
   Expected: back to a fresh checkout; you've completed the machine's
   loop (done → idle).
5. **Break the whole-object rule on purpose.** Change the error
   transition to `setSubmission({ ...submission, status: 'error' })`
   after a success-then-retry-then-failure sequence, and trace on
   paper what extra fields tag along (a stale `confirmation` inside
   an error state). Whole-object transitions exist to prevent exactly
   that kind of leftover.
