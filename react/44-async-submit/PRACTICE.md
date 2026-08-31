# 🏋️ Practice: Async Submit

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Timelines here are all reasoned out on paper; the fake server in exercise 6 is plain JavaScript you can run in Node, while the pages themselves need the CDN, so run those when you're back online.)

Unless an exercise says otherwise, you are editing `refactored/index.html`.

## Exercises

### ⭐ 1. Put the note on the receipt (warm-up)

The thank-you screen shows the order number and nothing else — but the server already sent the delivery note back inside the confirmation. Add a line to the `done` screen showing it, falling back to a gray "(no note)" when the customer left the box empty. Read it from the confirmation, not from the `note` state, even though both are sitting right there.

**Practices:** each phase carrying exactly the data that phase needs — the confirmation is what the server agreed to, the textarea is only a draft.

**Hint:** `submission.confirmation.note` is the string the server echoed. An empty string is falsy, which is all the fallback needs.

**Expected:** order with "leave at the back door" → thank-you screen reads `Delivery note: leave at the back door`; order with an empty box → `Delivery note: (no note)` in gray. Nothing else on the screen changes.

### ⭐⭐ 2. Predict the failure-then-success timeline (core)

Fresh page load, so the server's ledger reads 0. At t=0 the user clicks "Place order". This first request will **reject** at t=1.5s. At t=3s they click again, and that request **resolves** at t=4.5s. Write down, for each of these moments — t=0, t=0.1s, t=1.5s, t=3s, t=4.5s — the value of `submission`, what the button says, whether it is clickable, and what number the "orders the server has processed" line shows. Then answer the bonus: `ordersPlaced++` happens inside the fake server, which is not React state at all — so what makes the number on screen ever change?

**Practices:** reading a state machine as a timeline, and the difference between a value changing and a value being re-rendered.

**Hint:** the ledger line is read during render from a module-level `let`. React has no idea it changed; something else has to cause the render that reads it again.

**Expected:** your table matches the solution, including the fact that the displayed number is 0 for the entire first 4.5 seconds and that the *failed* attempt cost the ledger nothing.

### ⭐⭐ 3. The `finally` that eats both endings (core)

A teammate applied a rule of thumb — "always reset in `finally`" — to the handler:

```jsx
setSubmission({ status: 'submitting' });
try {
  const result = await placeOrder(note);
  setSubmission({ status: 'done', confirmation: result });
} catch (err) {
  setSubmission({ status: 'error', message: err.message });
} finally {
  setSubmission({ status: 'idle' }); // "we're not submitting any more"
}
```

Describe exactly what a user sees after a *successful* order now, and what they see after a failed one. Then fix it, and say what `finally` is actually good for in a handler like this one.

**Practices:** terminal phases in a state machine, and React 18 batching updates inside an async continuation.

**Hint:** all three setters run in the same microtask after the `await`, so React renders once — with whichever value was set last.

**Expected:** you can state the visible symptom in one sentence ("the button un-greys and the form comes back, as if you never clicked"), and after the fix a success lands on the thank-you screen and a failure lands on the red message with a retryable form.

### ⭐⭐ 4. Two async buttons, one machine (core)

Add a second action to the same form: "Save draft", which calls a fake `saveDraft(note)` that resolves after 800ms. Both buttons must disable while *either* is running, and each must show its own working label — only the one you pressed says "…ing". Extend the status object to carry which action is in flight rather than adding a second boolean, and make sure a saved draft does *not* trigger the thank-you screen.

**Practices:** growing a status object with a discriminating field instead of multiplying booleans that can contradict each other.

**Hint:** `{ status: 'submitting', action: 'draft' }`, and give the new button `type="button"` — a button inside a form is a submit button by default.

**Expected:** click "Save draft" and both buttons grey out, the draft button reads "Saving…" while the order button still reads "Place order ($499)"; 800ms later a small "draft saved" line appears and the form is still there. Click "Place order" and the labels swap roles; only that one ends on "Thank you!".

### ⭐⭐⭐ 5. A cancel button that doesn't lie (challenge)

While "Placing order…" is showing, the user has no way out. Add a "Cancel" button beside it that returns the form to `idle` immediately. The trap: the request is still in flight and will settle 1.5 seconds later, and the naive fix — checking `submission.status` after the `await` — cannot work. Figure out why, implement one that does, and write an honest sentence for the UI about what "cancel" really means here.

**Practices:** the stale closure after `await`, and reaching for a ref when you need the *current* value rather than the render's snapshot.

**Hint:** `submission` inside the handler is the value from the render that created it — it will never say "submitting" for the attempt it started. A `useRef` counter is one box shared by every render.

**Expected:** press cancel mid-flight and the form returns to a fresh, enabled state instantly; 1.5s later nothing happens — no thank-you screen, no error message appearing out of nowhere — but the ledger still ticks up, because the server never heard about the cancellation.

### ⭐⭐⭐ 6. Retry without paying twice (challenge)

The demo's server fails *before* charging, which is the polite kind of failure. Make it realistic instead: on failure the order is recorded and only the *response* is lost. Now a retry with a fresh request would double-charge. Give the client an idempotency key — one per order attempt, reused across retries — and have the fake server keep a `Map` from key to order, returning the stored order for any repeat. A new key is issued only when the customer starts a genuinely new order.

**Practices:** idempotency keys, and the ref-as-instance-variable pattern for a value that must survive renders without causing them.

**Hint:** `const keyRef = useRef(newKey())`; retries reuse `keyRef.current`; the "start over" path assigns a new one. The server checks its `Map` before it checks its dice.

**Expected:** a timeout now leaves the ledger reading 1 (you were charged); clicking retry shows "order #1001" and the ledger *stays* at 1. Swap the key for a fresh one on every attempt and the same sequence gives you #1002 and a ledger of 2 — the bug you just prevented.

## Solutions

### 1. Put the note on the receipt

```jsx
if (submission.status === 'done') {
  return (
    <div>
      <h1>Thank you!</h1>
      <p>✅ order #{submission.confirmation.orderNumber} placed</p>
      <p>
        Delivery note:{' '}
        {submission.confirmation.note || <span style={{ color: '#888' }}>(no note)</span>}
      </p>
      <p style={{ color: '#2a2' }}>orders the server has processed: {ordersPlaced}</p>
    </div>
  );
}
```

**Why:** the `done` phase carries a `confirmation`, and the confirmation is the server's word about what it stored — which is the only version worth printing on a receipt. Reading `note` state instead would show whatever is in the textarea *now*, which is the same string today but drifts the moment you let the user keep editing after submitting. The `||` fallback works because an empty string is falsy, and rendering a `<span>` on the right-hand side is fine: `||` returns whichever operand it picks, and React renders elements as happily as strings.

### 2. Predict the failure-then-success timeline

| moment | `submission` | button | ledger line |
| --- | --- | --- | --- |
| t=0 (before click) | `{status:'idle'}` | "Place order ($499)", enabled | 0 |
| t=0.1s | `{status:'submitting'}` | "Placing order…", disabled | 0 |
| t=1.5s | `{status:'error', message:'payment gateway timeout'}` | "Place order ($499)", enabled, red note below | 0 |
| t=3s | `{status:'submitting'}` | "Placing order…", disabled | 0 |
| t=4.5s | `{status:'done', confirmation:{orderNumber:1001, …}}` | *gone* — the thank-you screen replaced the form | 1 |

**Why:** the failed attempt rejects before `ordersPlaced++` runs, so a timeout costs the ledger nothing — the number is 0 for the whole first 4.5 seconds and jumps straight to 1. The bonus is the interesting half: `ordersPlaced` is a module-level `let`, invisible to React, so incrementing it renders nothing. The only reason the screen ever shows a new number is that `setSubmission` happens on the same line of the timeline and *that* triggers the render which re-reads the variable. If the server incremented on its own — a second tab, say — this page would keep confidently displaying a stale number until something unrelated re-rendered it.

### 3. The `finally` that eats both endings

After a successful order the user sees the button un-grey and the form return, exactly as if the click never happened — no thank-you screen, no order number, while the ledger silently reads 1. After a failure they see the same thing: no red message, no explanation. The fix is to delete the `finally` block entirely; `done` and `error` are terminal phases, and each `catch`/success line already leaves `submitting` behind.

**Why:** all three setters run in the same microtask after the `await`, and React 18 batches them into a single render, so only the last write survives — `{status:'idle'}` overwrites the outcome before anything is painted. The deeper point is that a state machine has no "whatever happened, go here" transition: the whole reason for `done` and `error` is that the two endings are *different*. `finally` earns its place when the cleanup is genuinely orthogonal to the outcome — decrementing an in-flight counter, closing a connection, re-enabling something that isn't part of the phase — not when it decides where the machine lands.

### 4. Two async buttons, one machine

```jsx
function saveDraft(note) {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ savedAt: new Date().toLocaleTimeString(), note }), 800),
  );
}

// inside App:
const busy = submission.status === 'submitting';

async function run(action, work) {
  if (busy) return;
  setSubmission({ status: 'submitting', action });
  try {
    const result = await work();
    setSubmission({ status: 'done', action, confirmation: result });
  } catch (err) {
    setSubmission({ status: 'error', action, message: err.message });
  }
}

function handleSubmit(e) {
  e.preventDefault();
  run('order', () => placeOrder(note));
}

if (submission.status === 'done' && submission.action === 'order') {
  return (/* …the thank-you screen… */);
}

// in the form:
<button type="submit" disabled={busy}>
  {busy && submission.action === 'order' ? 'Placing order…' : 'Place order ($499)'}
</button>
<button type="button" disabled={busy} onClick={() => run('draft', () => saveDraft(note))}>
  {busy && submission.action === 'draft' ? 'Saving…' : 'Save draft'}
</button>
{submission.status === 'done' && submission.action === 'draft' && (
  <p style={{ color: '#2a2' }}>draft saved at {submission.confirmation.savedAt}</p>
)}
```

**Why:** two booleans (`isOrdering`, `isSaving`) would let the app represent "both running at once", which the form has no way to render honestly and no reason to allow. A single phase plus an `action` tag makes the impossible states unrepresentable and keeps every label derivable: `busy` disables everything, `submission.action` decides which label changes. `type="button"` on the draft button is load-bearing — a `<button>` inside a `<form>` defaults to `type="submit"`, so without it clicking "Save draft" would fire the order handler too.

### 5. A cancel button that doesn't lie

```jsx
const attemptRef = React.useRef(0);

async function handleSubmit(e) {
  e.preventDefault();
  if (submission.status === 'submitting') return;

  const attempt = ++attemptRef.current;   // this attempt's ticket number
  setSubmission({ status: 'submitting' });
  try {
    const result = await placeOrder(note);
    if (attempt !== attemptRef.current) return;   // abandoned — say nothing
    setSubmission({ status: 'done', confirmation: result });
  } catch (err) {
    if (attempt !== attemptRef.current) return;
    setSubmission({ status: 'error', message: err.message });
  }
}

function handleCancel() {
  attemptRef.current += 1;               // invalidates whatever is in flight
  setSubmission({ status: 'idle' });
}

// beside the submit button:
{isSubmitting && (
  <button type="button" onClick={handleCancel}>Cancel</button>
)}
<p style={{ color: '#888', fontSize: 13 }}>
  Cancelling stops us waiting for the answer; it can't un-send the request.
</p>
```

**Why:** `submission` inside the handler is the object captured when that render created the function — for the attempt it just started it will forever read `{status:'idle'}`, so a post-`await` check against it would abandon *every* request, successful ones included. A ref is a single mutable box shared by all renders, so `attemptRef.current` after the `await` is genuinely the current value; comparing your ticket to it answers "am I still the attempt anyone cares about?" — the same guard project 39 uses for rapid clicks. The honest note matters too: the promise keeps running and the ledger still increments, because a browser saying "cancel" to itself is not the same as a server rolling back a charge.

### 6. Retry without paying twice

```js
const orderLedger = new Map();  // idempotency key -> the order we already created
let ordersPlaced = 0;

function placeOrder(note, idempotencyKey) {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      const existing = orderLedger.get(idempotencyKey);
      if (existing) { resolve(existing); return; }  // a repeat: same answer, no new charge
      if (Math.random() < 0.25) {
        // realistic failure: the order IS recorded, the response is lost
        ordersPlaced++;
        orderLedger.set(idempotencyKey, { orderNumber: 1000 + ordersPlaced, note });
        reject(new Error('payment gateway timeout'));
        return;
      }
      ordersPlaced++;
      const order = { orderNumber: 1000 + ordersPlaced, note };
      orderLedger.set(idempotencyKey, order);
      resolve(order);
    }, 1500),
  );
}

const newKey = () => 'key-' + Date.now() + '-' + Math.random().toString(16).slice(2);
```

```jsx
// inside App:
const keyRef = React.useRef(newKey());   // one key for this order attempt, retries included

const result = await placeOrder(note, keyRef.current);

function startOver() {                    // on the done screen
  keyRef.current = newKey();              // a genuinely new order gets a new key
  setNote('');
  setSubmission({ status: 'idle' });
}
```

**Why:** the key turns "place this order" into an idempotent request: the second time the server sees it, the answer is a lookup rather than a charge. That's why the key must be per *attempt-at-an-order* and not per *request* — generating it inside the handler would hand every retry a fresh key and reproduce the double-charge exactly. A ref is the right home for it: it must survive re-renders (it's the same order) but changing it should never cause one (nothing on screen depends on it). Two things worth noticing when you trace it: the retry returns the order with the note from the *first* attempt, because the server is replaying a stored answer rather than reading your new text; and `useRef(newKey())` computes a key on every render and throws all but the first away, which is harmless for a string but is the reason people reach for lazy initialization when the value is expensive.
