# 83 — Event-sourcing bank

**Lesson: store the facts, derive the state. When every change is an appended event
instead of an overwrite, "how did we get here?" stops being unanswerable.**

## Run it

```
node 83-event-sourcing-bank/original.js
node 83-event-sourcing-bank/refactored/cli.js
node --test 83-event-sourcing-bank/refactored/ledger.test.js
node --test 83-event-sourcing-bank/refactored/projections.test.js
```

## What's wrong with the original?

It ends with `balance: -6250` on an account whose `withdraw` function supposedly
makes that impossible. Now play support engineer and answer the customer:

1. When did the balance first go negative? — **unknown**
2. Was the monthly fee really charged twice? — **unknown**
3. What was the balance last Tuesday? — **unknown**
4. Can we undo just the duplicate fee? — **no**

Every answer is "unknown" for one reason: `account.balance += amount` **overwrites**.
Each change destroys the evidence of the change before it, so the object printed at
the end is the single surviving frame of a film nobody recorded. Adding logging
would help — which is the tell. Two more diseases follow from the same root:

- **The overdraft rule is copy-pasted, so it's missing in half the code.**
  `withdraw` checks; `chargeFee` doesn't; `payBill` — written six months later by
  someone in a hurry — doesn't either. That's the actual cause of the negative
  balance, and the code can't tell you which path did it.
- **Failure is invisible.** `withdraw` returns `undefined` whether it worked or not,
  so a caller has to re-read `account.balance` and guess.

## What changed in the refactor

- **The log *is* the account.** Events are past-tense facts —
  `{ type: 'deposited', amountCents: 50000, at: '2024-03-01T09:00:00Z' }` — appended
  and never edited. `replay(events)` folds them into a state with one `reduce`.
  Balance, statement, and every future report are *derived*, so they cannot disagree.
- **Commands vs events.** A command ("please withdraw 180.00") is a request that can
  be refused; an event ("withdrew") is a fact that already happened. `validate` lives
  on the border, and the overdraft rule is written **once**, which is why it now
  covers fees too — the original's bug, structurally impossible.
- **Result-style rejections** (project 30): `append` returns `{ ok: false, error: {
  code, message } }` and a **new** array on success. A refused command appends
  nothing, so the log can never contain something the rules forbid.
- **Projections answer questions the original couldn't**: `statement` (running
  balance), `balanceAt(events, when)` — literal time travel — `largestDay`,
  `firstBalanceBelow` (the support ticket, solved in one call), and
  `duplicateSuspects` (there's your double-charged fee, events #4 and #5).
- **The CLI replays the original's exact story**, shows the four commands the old
  code performed and the rules now refuse, then bug-hunts a legacy log that ends at
  the same `-6250` — naming the event, the timestamp, and the balance one second
  before.

## Key takeaway

Ask of any state you keep: *if this value were wrong, could I find out why?* If your
answer is "I'd add some logging", consider making the log the source of truth and the
value a projection. You pay a little memory and one `reduce`; you get undo, audit,
debugging, and time travel for free — and rules that live in exactly one place.
