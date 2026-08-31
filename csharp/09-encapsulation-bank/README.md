# CS 09 — Encapsulation (bank account)

**Lesson: rules the data can ignore are wishes — make every write go through a
door that enforces the invariants, and close all the other doors.**

## Run it

```
dotnet run csharp/09-encapsulation-bank/original.cs
dotnet run --project csharp/09-encapsulation-bank/refactored
dotnet run --project csharp/09-encapsulation-bank/refactored -- test
```

## What's wrong with the original?

`Deposit` and `Withdraw` contain the rules — but `Balance` and `History` are
public fields, so nothing forces anyone through them. Run it: four legal
lines, four corruptions, zero errors:

1. **A "helpful" teammate function** does `acct.Balance += amount` for a
   refund — money appears, the history doesn't change. Balance and audit
   trail now silently disagree.
2. **`Withdraw(-1000)` prints money.** The only guard is `amount > Balance`,
   and -1000 passes it — subtracting a negative *adds*.
3. **`account.Balance = -5000m`** — anyone can set the field to anything.
4. **`account.History.Clear()`** — the audit log is a public `List`, so any
   code can shred it.

"Balance always matches history" isn't a property of this class; it's a hope
about every caller, everywhere, forever. This is js#29's lesson in C# — where
the compiler can do even more of the enforcing.

## What changed in the refactor

- **State went private.** `private readonly List<string> _history` and
  `public decimal Balance { get; private set; }` — readable by all, writable
  only by `Account`'s own methods. Attacks #1 and #3 are now *compile errors*
  (CS0200: the setter is private).
- **The history is exposed as `IReadOnlyList<string>`** — callers can read
  and iterate, but the type has no `Add`, no `Clear`. Attack #4 doesn't
  compile either (and a test confirms the raw `List` never leaks out).
- **The two doors enforce the invariants.** `Deposit`/`Withdraw` reject
  non-positive amounts with `ArgumentOutOfRangeException` (a bad *argument*)
  and overdrafts with `InvalidOperationException` (a legal amount at a bad
  *time* — that distinction is project 08's who-fixes-it line applied to
  exception types). Attack #2 is now a loud exception.
- **Failed operations change nothing** — a rejected withdraw leaves both
  balance and history untouched, and there's a test proving it.
- **Tests read like the invariants**: every change leaves an entry; amounts
  are positive; no overdrafts; zero-balance boundary; `Check.Throws<>` per
  rejection.

## Key takeaway

Encapsulation isn't secrecy for its own sake — it's *making invariants
enforceable*. Ask: "can any code outside this class put it in an invalid
state?" If yes, the class doesn't have rules, it has suggestions. Private
state + a few validating methods turns "should always" into "provably
always" — which is exactly what the test suite then proves.
