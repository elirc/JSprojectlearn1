# 📘 Learning Guide: Event-Sourcing Bank

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A bank account — twice.

The first version is the one everybody writes: an object with a `balance` field, and functions that add to it and subtract from it.

```js
const account = { owner: 'Ada', balance: 0 };
deposit(50000);   // balance: 50000
withdraw(1250);   // balance: 48750
```

The second version never stores a balance at all. It stores the *list of things that happened*, and works the balance out whenever anyone asks:

```js
[ { type: 'opened',    owner: 'Ada',        at: '2024-03-01T08:00:00Z' },
  { type: 'deposited', amountCents: 50000,  at: '2024-03-01T09:00:00Z' },
  { type: 'withdrew',  amountCents: 1250,   at: '2024-03-02T08:15:00Z' } ]

replay(events).balanceCents; // 48750
```

That is **event sourcing**, and it sounds like extra work until the support ticket arrives: *"my balance is −$62.50 and your app says that's impossible."* The first version can only shrug. The second answers in one line — with a timestamp.

## 2. Concepts you need first

### Mutation destroys evidence

```js
account.balance += 500; // the old balance is now GONE
```

Every `+=` overwrites. After ten transactions you have one number and no idea which of the ten was wrong. Compare with appending:

```js
events.push({ type: 'deposited', amountCents: 500, at: now });
```

Nothing is lost, because nothing was replaced. That single difference is the whole project.

### State vs facts (derived vs stored)

A **fact** is something that happened: "deposited 500 on March 1st." A **derived value** is something you compute from facts: the balance, this month's fees, the busiest day. The design question is which one you store. Store facts and derive values, and the values are always consistent. Store values and throw away facts, and you can never get the facts back.

### Commands vs events

A **command** is a *request*: "please withdraw $180." It can be refused. An **event** is a *fact*: "withdrew $180." It cannot be refused, because it already happened. Hence the naming convention: commands are imperative (`deposit`, `withdraw`), events are past tense (`deposited`, `withdrew`). Validation lives exactly on the border between them — that's the moment where "no" is still possible.

### Append-only, and immutability

**Append-only** means the only legal edit is adding to the end. No deleting, no editing in place. In this project `append` returns a *new* array:

```js
return { ok: true, events: [...events, event] }; // a copy, plus one
```

`[...old, item]` builds a new array from the old one's items followed by `item`. The old array is untouched, so anything holding it still sees the past exactly as it was.

### `reduce` — the fold

`reduce` walks an array carrying an accumulator along:

```js
[1, 2, 3].reduce((sum, n) => sum + n, 0); // 6
```

Replay is that same shape, with a state object instead of a number:

```js
export function replay(events) {
  return events.reduce(applyEvent, emptyState());
}
```

Read it as: "start empty, and apply each event in turn." That one line is the entire read side of an event-sourced system.

### Result-style errors (project 30 again)

Some failures are *bugs* (calling a function with a string where a number belongs) — those deserve a thrown exception. Others are *expected outcomes* ("insufficient funds") — those deserve a returned value:

```js
{ ok: true,  events: [...] }
{ ok: false, error: { code: 'INSUFFICIENT_FUNDS', message: 'Cannot take 18000 from a balance of 11750' } }
```

A `code` is for programs to branch on; a `message` is for humans to read. The original returned `undefined` for both success and failure, which forced every caller to guess.

### Money as integer cents (project 32)

`0.1 + 0.2` is `0.30000000000000004` in binary floating point. Ledgers use whole cents — integers — so arithmetic is exact. `50000` here means $500.00.

### ISO timestamps

`'2024-03-01T09:00:00Z'` is an ISO 8601 date string: year-month-day, `T`, time, `Z` for UTC. Two useful properties: `Date.parse(s)` turns it into a number you can compare, and `s.slice(0, 10)` is the calendar day — which is all `dayOf` needs.

### Projections

A **projection** is a pure function `events -> an answer`. The balance is one. A statement is another. "The day with the biggest swing" is another. They're all reading the same facts, so they can never contradict each other — and adding a new one never touches the code that writes events.

## 3. Walking through the original code

```js
const account = { owner: 'Ada', balance: 0 };

function deposit(amount) {
  account.balance += amount;
}
```

No validation: `deposit(-5000)` is a withdrawal in disguise, and it skips every rule below.

```js
function withdraw(amount) {
  if (amount > account.balance) {
    console.log('declined: insufficient funds');
    return;
  }
  account.balance -= amount;
}
```

Here is the overdraft rule — the *only* copy that works. Note the return value: `undefined` whether it succeeded or was declined.

```js
function chargeFee(amount) { account.balance -= amount; }
function payBill(name, amount) { account.balance -= amount; }
```

Two more paths to the same money, neither carrying the rule. `payBill` was added six months later, in a hurry, in another file. Nobody *decided* that bills may overdraw the account; the rule just wasn't copied.

Then a month of activity, ending with a fee charged twice (a retried request that ran twice — a genuinely common production bug) and a car payment that takes the balance to `-6250`.

## 4. What's wrong with it (in beginner terms)

**Flaw 1: the past is deleted as you go.** `balance += amount` keeps the answer and throws away the question. When the number is wrong, there is nothing to look at. This is why "add logging" is everyone's instinct here — and if the log is what you need to debug, the log deserves to be the truth, not a side effect.

**Flaw 2: the rule exists in triplicate, and two copies are missing.** Three functions take money out; one checks the balance. Nobody wrote "bills may overdraw" — it happened by omission, which is the most expensive kind of decision because no one remembers making it. Rules copy-pasted across call sites *always* drift apart; the only reliable fix is to have one copy that every path must go through.

**Flaw 3: you can't tell success from failure.** `withdraw` returns `undefined` either way. The caller's only option is to read `account.balance` before and after and compare — which is exactly the kind of guessing that produces "the payment went through but the app said it didn't."

**Flaw 4: no undo, ever.** The customer wants the duplicate fee refunded. With one mutable number, "refund" means typing another number in and hoping. There's no way to say "reverse *that* specific charge" because that specific charge is not a thing that exists anywhere.

**Flaw 5: no answer to "when?"** Support questions are almost always about time — when did this start, what did it look like before, what changed. A single mutable field has no time dimension at all.

## 5. Try it yourself first!

1. **Vague hint:** you keep wanting a log to debug this. What if the log *were* the account?
2. **Warmer:** make an array of plain objects, one per thing that happened: `{ type, amountCents, at }`. Now write `replay(events)` that walks the array and returns `{ balanceCents }`. Confirm it gives the same number the original printed.
3. **Warmer still:** where should the overdraft check go now? (Hint: there's only one function that can add to the log, so there's only one place a rule can live.)
4. **Almost the answer:** write `append(events, command)` that replays the log, checks the rules against the resulting state, and returns either `{ ok: true, events: [...events, newEvent] }` or `{ ok: false, error }`. Never push in place.
5. **The payoff:** without touching anything above, write two functions: one that returns the balance after each event (a statement), and one that answers "what was the balance at 3pm on Tuesday?" If the second one is harder than `events.filter(...)` plus `replay`, your events aren't carrying enough information.
6. **Design question:** should `replay` throw or ignore when it meets an event type it doesn't know? Write your reason down, then compare with the refactor's choice.

## 6. Understanding the refactored solution

**`applyEvent` — the single meaning of an event.**

```js
export function applyEvent(state, event) {
  const base = { ...state, eventCount: state.eventCount + 1, lastEventAt: event.at };
  switch (event.type) {
    case 'deposited':
      return { ...base, balanceCents: state.balanceCents + event.amountCents };
    case 'withdrew':
    case 'fee-charged':
      return { ...base, balanceCents: state.balanceCents - event.amountCents };
    default:
      throw new TypeError(`Unknown event type: ${JSON.stringify(event.type)}`);
  }
}
```

It returns a **new** state rather than editing the old one, so a caller holding the previous state still has the previous state — that's what makes time travel free. Every reader of the log goes through this function, so the statement, the balance and any future report interpret an event identically. The `default: throw` is deliberate: if the log is the truth, junk in the log is a crash, not a shrug.

**`replay` is one line**, and `deltaOf` gives each event's effect on the balance (+, −, or 0) so projections don't re-implement the switch.

**`validate` — the rulebook, in one place.** Unknown command, unparseable timestamp, an event dated before the last one (`OUT_OF_ORDER` — a log's order is part of its meaning), opening twice, acting on an unopened account, a non-positive or non-integer amount, and the overdraft check. That last one is written once and applied to `withdraw` *and* `charge-fee` via a small `MONEY_OUT` set — the original's headline bug, gone by construction.

**`append` — the only door in.**

```js
const check = validate(replay(events), command);
if (!check.ok) return check;             // the log is UNCHANGED
...
return { ok: true, events: [...events, event] };
```

Rejection returns the error and *no* log, so there is no code path where a refused command leaves a trace. Success returns a new array. The test named "a rejected command does NOT append" tries nine illegal commands and asserts the log still has two events.

**The projections** are each a few lines over the same log: `statement` (running balance, reusing `applyEvent`), `balanceAt` (filter by time, then replay — time travel is *that* cheap), `dailyNet` / `largestDay`, `firstBalanceBelow` (the support ticket) and `duplicateSuspects` (same type, same amount, same day — suspicion, not proof, because two identical coffees in one day are legal).

**The CLI** replays the original's month through the rulebook, prints the four commands it now refuses, shows the statement, time-travels to three moments, and then bug-hunts a *legacy* log — the original's exact story, ending at the same `-6250` — reporting the event that did it, its timestamp, the balance one second earlier, and the duplicated fee.

## 7. Words you learned (glossary)

- **Event sourcing** — storing the facts that happened and deriving state from them.
- **Event** — an immutable, past-tense fact: `{ type: 'deposited', amountCents, at }`.
- **Command** — a request that may be refused: `{ type: 'deposit', ... }`.
- **Log / event log** — the ordered list of events; the source of truth.
- **Append-only** — the only legal change is adding to the end.
- **Replay / fold / `reduce`** — walking the log to compute a state.
- **Projection** — a pure function from the log to one particular answer.
- **Derived state** — a value computed from facts rather than stored.
- **Source of truth** — the one place a fact is authoritative.
- **Immutable** — never modified after creation; changes make new values.
- **Result type** — returning `{ ok, value | error }` instead of throwing.
- **Error code vs message** — for programs to branch on / for humans to read.
- **Invariant** — a rule that must always hold (here: the balance never goes negative).
- **Time travel** — reconstructing the state as of any past moment.
- **Audit trail** — the record of who changed what, when.
- **Compensating event** — undoing by appending the opposite, never by deleting.
- **Integer cents** — money as whole numbers, avoiding float rounding.
- **ISO timestamp** — `'2024-03-01T09:00:00Z'`, sortable and parseable.

## 8. Experiments to try on the plane (no internet needed)

1. **Answer the support ticket both ways.** Run `original.js`, then try to work out from its output alone when the balance went negative. Then run `refactored/cli.js`. Expected: the second prints the event number, the type, the note, the timestamp, and the balance one second before — and takes one function call to do it.
2. **Break the log deliberately.** In a scratch file, `import { replay }` and pass `[{ type: 'vanished', at: '2024-03-01T00:00:00Z' }]`. Expected: `TypeError: Unknown event type: "vanished"`. Now change `applyEvent`'s `default` to `return base` and rerun. Expected: silence, and a balance that is quietly wrong — which is exactly why the throw is there.
3. **Prove that refusals leave no trace.** `const before = events.length; append(events, { type: 'withdraw', amountCents: 9_999_999, at: '2024-03-09T00:00:00Z' }); console.log(events.length === before)`. Expected: `true` — and the returned object carries the reason.
4. **Time-travel by hand.** Pick any timestamp between two events and call `balanceAt(events, when)`. Expected: the running balance from the statement at that row. Try a date before the account existed. Expected: `0`, not a crash.
5. **Watch the rule that used to be missing.** Try `{ type: 'charge-fee', amountCents: 999999, ... }` on a small balance. Expected: `INSUFFICIENT_FUNDS` — the check the original's `chargeFee` never had, working for free because there's only one copy of it.
6. **Feel the cost.** Add 100,000 deposits to a log in a loop and time `replay`. Expected: fast, but not free — which is why real systems keep snapshots (PRACTICE exercise 3). Now ask what the original's `+=` would have cost you *in debugging* over those 100,000 transactions.
