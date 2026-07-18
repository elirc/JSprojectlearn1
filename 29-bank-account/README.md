# 29 — Bank account (encapsulation)

**Lesson: invariants need enforcement, not politeness — private state via `#` fields
or closures, and the `this` trap every JS dev meets.**

## Run it

```
node 29-bank-account/original.js
node --test 29-bank-account/
```

## What's wrong with the original?

1. **The data is wide open, so the rules are wishes.** `account.balance = 1000000`
   works. `withdraw(-500)` *adds* money. `deposit("50")` turns the balance into the
   string `"100000050"` via `+` concatenation — three one-liners, three corrupted
   accounts, zero errors. "Balance matches history" isn't a property of this code;
   it's a hope about every caller everywhere, forever.
2. **The `this` gun goes off twice.** `var pay = account.withdraw; pay(10)` crashes:
   `this` is bound at *call time* by how the function is called, not where it was
   defined — detach the method and it loses its object. `setTimeout(account.withdraw,
   ...)` is the same bug in async clothing, and it's how most people meet it in real
   life (event handlers, callbacks).

## What changed in the refactor

Two implementations of the same contract, on purpose:

- **The class** uses `#balance` — *truly* private, enforced by the language, not a
  `_underscore` convention. Reading is allowed through a getter; writing has no door
  at all (`acct.balance = x` throws — there's a test). All writes funnel through
  `deposit`/`withdraw`, which validate and log. When every door runs the checks, the
  invariants become *facts you can prove*, which is exactly what the test file does.
- **The closure factory** gets privacy from project 27's mechanism — `let balance`
  captured by the returned methods. Notice what it *doesn't* have: `this`. Detached
  methods just work (tested). The trade: closures cost a bit more memory per instance
  and there's no `instanceof`; classes are the mainstream idiom with `this` care
  required. Knowing both means choosing, not defaulting.
- **`getStatement()` returns a copy** — returning your internal array by reference
  hands out a remote control to your private state. The test edits the returned
  array and asserts the account didn't notice.
- **One test suite runs against both implementations** via a small adapter list —
  project 13's registry idea again: same contract, shared tests.

## Key takeaway

Encapsulation isn't OOP ceremony — it's the difference between "the balance *should*
match the history" and "the balance *cannot fail* to match the history." Put state
behind the smallest possible set of doors and make every door check IDs. And never
hand a method around bare: `acct.withdraw` forgets `acct` — wrap it
(`() => acct.withdraw(n)`) or use closures and skip `this` entirely.
