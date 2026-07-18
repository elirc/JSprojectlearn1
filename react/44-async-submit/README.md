# React 44 — Async submit

**Lesson: the double-submit bug — every async action needs a pending phase,
checked in the handler and shown on the button.**

## Run it

Open `original.html`, click "Place order", and — like every user during a
1.5-second silence — click it again. Watch the server's ledger: three clicks,
three $499 orders. Refactor: mash freely, one order.

## What's wrong with the original?

`handleSubmit` awaits the server but **nothing records that a request is in
flight**. During the 1.5s "meanwhile" (js#48's question: *what can the user do
during the meanwhile, and does the code know it's in one?*), the button is
alive and every click fires another real request. This is the highest-stakes
member of the race family: 19 was wrong *reads*, 39 handled cheap *writes*,
and this is expensive writes — payments, sends, deletes — where "oops, twice"
makes support tickets.

## What changed in the refactor

- **Submission is a phase machine** (project 20's status object, write-side):
  `idle → submitting → done | error`. One value, whole-object transitions,
  and every UI decision derives from it.
- **Three defenses, layered** (each annotated in the code):
  1. `disabled={isSubmitting}` — the browser physically blocks clicks;
  2. the label flips to "Placing order…" — the *human* stops trying, which
     is UX, not just safety;
  3. the guard in the handler (`if (status === 'submitting') return`) — belt
     and braces for keyboard submits, double-fired events, and whoever
     removes the `disabled` in a future redesign.
- **The error path returns you to a retryable form** — the demo fails 25% of
  the time so you'll see it. Pending state isn't only about blocking; it's
  the full lifecycle: feedback while waiting, a clear landing on success
  (`done` renders a different screen), and a recoverable landing on failure.
- **The honest footnote**: UI guards are for UX. For money, the *server* also
  dedupes (idempotency keys) — never trust the client alone with a wallet
  (js#29's "invariants need enforcement" at network scale).

## Key takeaway

Any button that triggers `await` gets the trio by reflex: a pending phase in
state, `disabled` + label change on the button, and a guard in the handler.
It's ten lines, it's always the same ten lines, and it's the difference
between "the app felt slow" and "the app charged me twice."
