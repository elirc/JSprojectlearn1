# 🏋️ Practice: Encapsulation (Bank Account)

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Ask before you knock (warm-up)

Add `public bool CanWithdraw(decimal amount)` — it answers "would this withdrawal be allowed?" without throwing and without changing anything, so a UI can grey out a button. It must agree with `Withdraw` exactly: `0` and `-5` are `false`, and withdrawing the exact balance is `true`.

Practices: separating a *query* (asks, changes nothing) from a *command* (changes state).

Hint: it is a single boolean expression combining the two conditions `Withdraw` checks.

Check it offline: add to `Tests.cs` — all should pass (`account` holds 380 at that point):
```csharp
Check.True(account.CanWithdraw(380m), "the exact balance is withdrawable");
Check.Equal(false, account.CanWithdraw(381m), "one cent over is not");
Check.Equal(false, account.CanWithdraw(0m), "zero is not a withdrawal");
```

### ⭐⭐ 2. Deposits with a note (core)

Add an overload `Deposit(decimal amount, string note)` recording `"deposit 500 (payday)"` in the history, rejecting a blank note with `ArgumentException`. The one-argument `Deposit` must keep working exactly as before, with no duplicated validation — make the short one call the long one.

Practices: method overloading (project 01), funnelling every write through a single door, `string.IsNullOrWhiteSpace`.

Hint: give the two-argument version the real body, then `public void Deposit(decimal amount) => Deposit(amount, "");` — and let the formatting decide whether to append the ` (...)` part.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var noted = new Account();
noted.Deposit(500m, "payday");
Check.Equal("deposit 500 (payday)", noted.History[0], "the note lands in the audit trail");
noted.Deposit(20m);
Check.Equal("deposit 20", noted.History[1], "the old one-argument call is unchanged");
Check.Throws<ArgumentException>(() => noted.Deposit(5m, "   "), "a blank note is rejected");
```

### ⭐⭐ 3. Port from JS: the `#private` counter (core)

Port this JS class to C# as a new file `Turnstile.cs`, keeping every guarantee — `Count` readable from outside but writable only from inside, and `Reset("")` throwing `ArgumentException`:

```js
class Turnstile {
  #count = 0;                       // truly private since ES2022
  get count() { return this.#count; }
  push() { this.#count++; }
  reset(reason) { if (!reason) throw new Error("a reset needs a reason"); this.#count = 0; }
}
```

Practices: mapping JS `#field` onto C#'s `{ get; private set; }`, and translating `throw new Error` into a *specific* exception type.

Hint: `#count` plus the `get count()` accessor is exactly `public int Count { get; private set; }` — one line does both jobs.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var gate = new Turnstile();
gate.Push(); gate.Push();
Check.Equal(2, gate.Count, "pushes are counted");
Check.Throws<ArgumentException>(() => gate.Reset(""), "a reset needs a reason");
gate.Reset("end of day");
Check.Equal(0, gate.Count, "a justified reset works");
```
Then type `gate.Count = 99;` in `Program.cs` and build. Expected: `error CS0272: ... the set accessor is inaccessible.` Delete the line.

### ⭐⭐ 4. Freezing an account (core)

Fraud teams freeze accounts. Add `public bool IsFrozen { get; private set; }` with `Freeze()` and `Unfreeze()`. While frozen, **both** doors throw `InvalidOperationException` — a legal amount at a bad *time*, the same reasoning the overdraft rule uses. A rejected operation must leave balance and history untouched.

Practices: adding a *new invariant* and discovering that every door must learn about it — the cost encapsulation makes visible and small.

Hint: the check goes first in both methods, before the amount validation. Ask yourself why `IsFrozen` has a `private set`.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var frozen = new Account();
frozen.Deposit(100m);
frozen.Freeze();
Check.Throws<InvalidOperationException>(() => frozen.Deposit(10m), "no deposits while frozen");
Check.Throws<InvalidOperationException>(() => frozen.Withdraw(10m), "no withdrawals while frozen");
Check.Equal(1, frozen.History.Count, "and nothing was logged");
frozen.Unfreeze();
frozen.Withdraw(10m);
Check.Equal(90m, frozen.Balance, "unfreezing restores service");
```

### ⭐⭐⭐ 5. A history you can query (challenge)

`"withdraw 120"` is a string a human reads and a program has to *parse*. Replace the internal `List<string>` with `List<Entry>`, where `public readonly record struct Entry(string Kind, decimal Amount, decimal BalanceAfter);` lives in `Account.cs`. Expose `IReadOnlyList<Entry> Entries` — and keep `History` alive as a computed projection so **every existing test still passes unchanged**.

Practices: record structs (project 07), read-only views over a richer type, and changing a class's insides without breaking its published surface.

Hint: `History => _entries.Select(e => $"{e.Kind} {e.Amount}").ToList().AsReadOnly();` reproduces the old strings exactly. Compute `BalanceAfter` from `Balance` *before* appending.

Check it offline: add to `Tests.cs` — all should pass, **and the whole original suite must stay green**:
```csharp
var q = new Account();
q.Deposit(500m); q.Withdraw(120m); q.Withdraw(30m);
Check.Equal(150m, q.Entries.Where(e => e.Kind == "withdraw").Sum(e => e.Amount), "total withdrawn");
Check.Equal(380m, q.Entries[1].BalanceAfter, "each entry snapshots the balance after it");
Check.Equal("withdraw 120", q.History[1], "the old string view is unchanged");
```

### ⭐⭐⭐ 6. A balance that cannot drift (challenge — builds on 5)

Invariant #2 ("every change leaves a history entry") is currently enforced by *discipline*: each method remembers to append. Make it structural. Delete `Balance`'s backing store and compute it: the balance simply **is** the `BalanceAfter` of the last entry, or `0` when there are none. Now nothing can change the balance except appending an entry, because there is nothing to assign to.

Practices: designing state so a rule cannot be broken rather than merely tested — the endpoint of the whole project.

Hint: `public decimal Balance => _entries.Count == 0 ? 0m : _entries[^1].BalanceAfter;`. `[^1]` is index-from-end: the last element.

Check it offline: every existing test still passes, plus:
```csharp
var d = new Account();
d.Deposit(40m); d.Withdraw(15m);
Check.Equal(25m, d.Balance, "balance is derived from the ledger, not stored beside it");
Check.Equal(d.Entries[^1].BalanceAfter, d.Balance, "the two can no longer disagree");
```
And prove the door is welded shut: `Balance += 30m;` *inside* `Deposit` must now be `error CS0200: Property or indexer 'Account.Balance' cannot be assigned to -- it is read only.`

## Solutions

### 1. Ask before you knock

```csharp
public bool CanWithdraw(decimal amount) => amount > 0 && amount <= Balance;
```

WHY: commands (`Withdraw`) change state and shout when refused; queries (`CanWithdraw`) only answer. Keeping them apart lets a caller ask politely — but the rule still lives in one expression mirroring `Withdraw`'s guards. If the two ever disagree, a button lights up for an operation that then throws, so a real codebase would go further and have `Withdraw` start with `if (!CanWithdraw(amount)) throw ...`.

### 2. Deposits with a note

```csharp
public void Deposit(decimal amount) => Deposit(amount, "");

public void Deposit(decimal amount, string note)
{
    if (amount <= 0)
        throw new ArgumentOutOfRangeException(nameof(amount), amount, "A deposit must be a positive amount.");
    // "" means "no note given"; a caller who PASSES a blank note made a mistake.
    if (note.Length > 0 && string.IsNullOrWhiteSpace(note))
        throw new ArgumentException("A note may not be blank.", nameof(note));

    Balance += amount;
    _history.Add(note.Length == 0 ? $"deposit {amount}" : $"deposit {amount} ({note})");
}
```

WHY: the one-argument version has no body of its own — it forwards. That is the funnel idea applied *inside* the class: two public doors, one implementation, so a future rule (a deposit cap, say) can only be added in one place. In JS you would have used an optional parameter and an `if (note === undefined)` branch — the same idea with less help from the compiler.

### 3. Port from JS: the `#private` counter

```csharp
// Turnstile.cs
public class Turnstile
{
    // JS's #count + `get count()` is exactly this one line in C#.
    public int Count { get; private set; }

    public void Push() => Count++;

    public void Reset(string reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("A reset needs a reason.", nameof(reason));
        Count = 0;
    }
}
```

WHY: `#count` is ES2022's answer to a problem C# solved with `private` in 2002 — and the C# version buys more: `{ get; private set; }` makes outside reads compile and outside writes not, with no getter boilerplate. `throw new Error(...)` becomes `ArgumentException` because the *argument* was wrong, which is project 08's who-fixes-it question, and it lets a caller catch precisely this failure.

### 4. Freezing an account

```csharp
public bool IsFrozen { get; private set; }

public void Freeze() => IsFrozen = true;      // idempotent: freezing twice is fine
public void Unfreeze() => IsFrozen = false;

// first line of BOTH Deposit and Withdraw, before the amount checks:
if (IsFrozen)
    throw new InvalidOperationException("This account is frozen; that operation is not allowed.");
```

WHY: `InvalidOperationException` rather than `ArgumentException` because nothing is wrong with the *amount* — the object is in a state where the operation makes no sense, which is exactly what that type means. `IsFrozen` gets a private setter for the same reason `Balance` does: if outside code could write `acct.IsFrozen = false`, the freeze would be a suggestion again. The mild annoyance of editing two methods is the honest price of a new invariant — and with only two doors, the price is two lines.

### 5. A history you can query

```csharp
// Account.cs — a tiny value type: equality, ToString and no heap allocation (projects 02 and 07).
public readonly record struct Entry(string Kind, decimal Amount, decimal BalanceAfter);

// inside Account: the list changes type, the surface does not
private readonly List<Entry> _entries = new();

public IReadOnlyList<Entry> Entries => _entries.AsReadOnly();

// The old surface, rebuilt from the new data — every existing test keeps passing.
public IReadOnlyList<string> History =>
    _entries.Select(e => $"{e.Kind} {e.Amount}").ToList().AsReadOnly();

// Deposit's tail becomes:   Balance += amount; _entries.Add(new Entry("deposit", amount, Balance));
// Withdraw's tail becomes:  Balance -= amount; _entries.Add(new Entry("withdraw", amount, Balance));
```

WHY: this is the payoff of having had a *view* rather than a raw field all along. The internals changed completely — a different element type, a different list — and not one line outside the class had to move, because callers only ever touched `Balance`, `History` and two methods. `History` returning a freshly built `ReadOnlyCollection<string>` also keeps the "History is not the raw List" test honest.

### 6. A balance that cannot drift

```csharp
// The property loses its setter entirely — there is no field to desynchronize.
public decimal Balance => _entries.Count == 0 ? 0m : _entries[^1].BalanceAfter;

// Both methods now read the old balance and append the new one in one step:
_entries.Add(new Entry("deposit", amount, Balance + amount));
_entries.Add(new Entry("withdraw", amount, Balance - amount));
```

WHY: invariant #2 stops being a rule anyone can forget and becomes arithmetic — "the balance" and "the ledger" are now one piece of data with two names, so they *cannot* disagree. That is the strongest version of this project's lesson: tests prove a rule holds today, but a design like this makes the broken state unrepresentable, which is proof for every tomorrow. Real ledgers work exactly this way; note the O(1) `[^1]` read versus `_entries.Sum(...)`, which would be correct but re-add the whole history on every query.
