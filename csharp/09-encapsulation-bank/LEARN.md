# 📘 Learning Guide: Encapsulation (Bank Account)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A bank account object with a balance and a history log. Two operations: `Deposit` and `Withdraw`. Three rules that must *always* hold:

1. The balance is never negative (no overdrafts).
2. Every change to the balance leaves a history entry (the audit trail).
3. Amounts are always positive (you can't deposit −50 or withdraw −1000).

Rules like these have a name: **invariants** — things that must be true about an object at all times, no matter what anyone does to it.

The original writes the rules inside `Deposit`/`Withdraw`... and then leaves the data lying in public, so any code can skip the rules entirely. The refactor closes every door except the two guarded ones. That move is **encapsulation**, and it's the heart of object-oriented design.

## 2. Concepts you need first

### Fields vs properties

A **field** is a plain variable living inside a class:

```csharp
class Account
{
    public decimal Balance;   // a field: just a storage slot
}
```

A **property** looks the same at the call site (`account.Balance`) but is really a pair of tiny methods — a *getter* and a *setter* — wearing a variable costume:

```csharp
class Account
{
    public decimal Balance { get; set; }   // a property (auto-implemented)
}
```

Why bother, if they look identical to callers? Because properties give you a control panel. You can make reading public but writing private, add validation later, or compute the value on the fly — all without changing any caller's code. C# convention: fields are for private internals; anything public is a property. JS note: this is what `get`/`set` accessors do in JS classes, but in C# they're idiomatic *everywhere*, not a rarity.

### Access modifiers: `public` and `private`

Every member of a class has a visibility:

```csharp
class Account
{
    private decimal _balance;        // only code INSIDE Account can touch this
    public void Deposit(decimal a) { _balance += a; }  // anyone can call this
}
```

`private` means "only this class's own code." The `_underscore` prefix is the C# naming convention for private fields. JS took decades to get real privacy — the `#field` syntax js#29 uses is the same idea; before that, `_name` was just a polite request. In C#, `private` has always been enforced by the compiler: outside code that touches `_balance` *does not compile*.

### The killer combo: `{ get; private set; }`

```csharp
public decimal Balance { get; private set; }
```

Read it as: *getter public, setter private*. Any code can read `account.Balance`; only `Account`'s own methods can assign it. This one line is the fix for half the original's bugs:

```csharp
account.Balance = -5000m;   // error CS0200: can't assign — setter is private
```

The compile error names the exact crime scene. Compare the original, where the same line ran fine and corrupted the account silently.

### Invariants — and why every door must check them

An **invariant** is a fact that must survive every operation: "balance ≥ 0", "balance matches history." Here's the key insight of this whole project:

> An invariant is only as strong as the *least* guarded way to change the data.

If there are three ways to change the balance — `Deposit`, `Withdraw`, and directly writing a public field — and only two of them check the rules, then the rules don't exist. Guarding two of three doors is zero security. Encapsulation is the discipline of making the guarded doors the *only* doors.

### Exposing collections safely: `IReadOnlyList<T>`

Making the history field private isn't enough if you then return it:

```csharp
public List<string> GetHistory() => _history;   // oops — handed out the remote control
```

The caller now holds a reference (project 07's aliasing!) to your private list and can `Clear()` it. The fix is to expose it through a narrower **interface**:

```csharp
public IReadOnlyList<string> History => _history.AsReadOnly();
```

`IReadOnlyList<string>` is a type that says "you can read `Count`, index items, and iterate — that's all." There is no `Add`, no `Clear` to call; misuse fails at *compile time*. (js#29 solved this by returning a *copy*; C# can hand out a live read-only *view* instead — cheaper, always current, equally untouchable.)

### Which exception for which broken rule?

The refactor throws two different exception types, and the choice is a small design language (building on project 08's who-fixes-it rule — both of these are *programmer* errors, so throwing is right):

- **`ArgumentException` / `ArgumentOutOfRangeException`** — "the *value you passed* is nonsense, in any situation." `Deposit(-50)` is wrong no matter the balance.
- **`InvalidOperationException`** — "fine value, wrong *moment*." `Withdraw(200)` is a perfectly good request — unless the balance is 100. The problem is the object's current state, not the argument.

Following this convention means a caller reading just the exception type already knows *what kind* of mistake was made.

### Constructors and starting valid

An object should be born satisfying its invariants. `new Account()` starts at balance 0 with an empty history — already consistent. The stricter version of this idea (an object that *requires* construction data and validates it in the constructor) is one of the experiments below.

## 3. Walking through the original code

The class — rules present, doors wide open:

```csharp
class Account
{
    public decimal Balance;               // anyone can write this
    public List<string> History = new();  // anyone can clear/replace this

    public void Deposit(decimal amount)
    {
        Balance += amount;
        History.Add($"deposit {amount}");
    }

    public void Withdraw(decimal amount)
    {
        if (amount > Balance)
        {
            Console.WriteLine("  (declined: insufficient funds)");
            return;
        }
        Balance -= amount;
        History.Add($"withdraw {amount}");
    }
}
```

Used politely — `Deposit(500)`, `Withdraw(120)` — it works, and the printout looks healthy. Then four legal lines:

```csharp
static void GiveRefund(Account acct, decimal amount)
{
    acct.Balance += amount;  // oops: skipped the history. Compiles fine.
}
```

The teammate who wrote this wasn't malicious — the public field made the *wrong way look like a normal way*. Money appears; the audit trail doesn't. The account's balance and history now tell different stories, and no line of code will ever complain.

```csharp
account.Withdraw(-1000m);
```

Walk the guard: is `-1000 > Balance`? No. So we subtract −1000... which adds 1000, and even writes a straight-faced history entry: `withdraw -1000`. One missing validation turned a withdrawal into a money printer.

```csharp
account.Balance = -5000m;
account.History.Clear();
```

No trick here at all — the fields are public; this is their advertised use. The balance is now −5000 and the audit log is empty. Also notice `Withdraw`'s decline path: it *prints* to the console instead of signaling the caller — mixing business rules with I/O (project 01's oldest sin) and leaving callers no way to react.

## 4. What's wrong with it (in beginner terms)

**1. The rules and the data are both public — so the rules are optional.** Every invariant check lives inside `Deposit`/`Withdraw`, but going around them is one `.` away. Guarded doors don't matter when the wall has a hole.

**2. The worst corruption is the *quiet* kind.** `GiveRefund` doesn't crash anything. It leaves the object in a state where two sources of truth disagree — and the bug surfaces weeks later, in a report, far from the line that caused it. (Compare project 07's preview bug: mutation at a distance, again.)

**3. Handing out the real `List` hands out control.** `public List<string> History` gives every caller the full remote: `Clear()`, `Add("fake entry")`, `History = new List<string>()`. An audit trail that anyone can edit is not an audit trail.

**4. Failure is mumbled, not signaled.** The overdraft path prints a console line and returns as if nothing happened. Calling code has no idea the withdrawal failed — it can't retry, can't warn the user, can't even notice. (Project 08: expected failure needs to reach the caller as *something* — an exception here, since a rejected operation on an account is a caller bug in this design.)

## 5. Try it yourself first!

Before reading the solution, try to fix the original yourself. Hints, vaguest first:

1. 🌱 The class has rules and the class has data. Can you make it so the *only* way to reach the data is through the rules?
2. 🌿 Change `public decimal Balance;` into a property: `public decimal Balance { get; private set; }`. Rebuild — every line that corrupted the balance from outside is now a compile error. Do the same for the history: make the `List` a `private readonly` field.
3. 🌳 Now the history needs a public window. Expose `public IReadOnlyList<string> History => _history.AsReadOnly();` and fix whatever stops compiling — each fix is a caller that was doing something it shouldn't.
4. 🍎 Harden the two doors: `Deposit`/`Withdraw` should throw `ArgumentOutOfRangeException` for `amount <= 0`, and `Withdraw` should throw `InvalidOperationException` for overdrafts (instead of printing!). Then write tests with `Check.Throws<>` for all three rejections — plus one asserting that a *failed* withdraw left balance and history exactly as they were.

## 6. Understanding the refactored solution

**`Account.cs`** opens by stating its invariants as a comment — then makes them true. The state:

```csharp
private readonly List<string> _history = new();
public decimal Balance { get; private set; }
public IReadOnlyList<string> History => _history.AsReadOnly();
```

Three lines, three door policies: the list is invisible, the balance is read-only from outside, the history is visible through unbreakable glass. (`readonly` on the field adds one more lock: even `Account`'s own code can't swap in a *different* list — it can only use the one built at construction.)

The doors themselves:

```csharp
public void Withdraw(decimal amount)
{
    if (amount <= 0)
        throw new ArgumentOutOfRangeException(nameof(amount), amount, "A withdrawal must be a positive amount.");
    if (amount > Balance)
        throw new InvalidOperationException($"Insufficient funds: balance is {Balance}, tried to withdraw {amount}.");

    Balance -= amount;
    _history.Add($"withdraw {amount}");
}
```

Guards first, changes last — so a rejected call changes *nothing*. That ordering is what makes "failed operations change nothing" a theorem instead of luck, and the tests check it explicitly:

```csharp
Check.Throws<InvalidOperationException>(() => account.Withdraw(999_999m), "overdraft is rejected");
Check.Equal(380m, account.Balance, "failed operations change NOTHING");
Check.Equal(2, account.History.Count, "failed operations log NOTHING");
```

**`Program.cs`** replays the original's four attacks and narrates their fates: two became compile errors (shown as comments with their real compiler error codes — CS0200 for the private setter, CS1061 for `Clear` on a read-only view), two became loud, typed exceptions. Four corruptions → zero corruptions, and the class file is barely longer than the original.

**What did the "helpful teammate" do?** `GiveRefund` can't write the field anymore — so it *has* to call `Deposit(30)`, and the history entry comes along automatically. That's the deep effect of encapsulation: it doesn't just block wrong code, it *funnels everyone toward the right code*.

**One test worth a second look:**

```csharp
Check.True(account.History is not List<string>, "History is not the raw List (no Add/Clear to call)");
```

This guards the *design*, not a behavior: if someone later "simplifies" `History` to return the raw list (an easy review miss), this test fails. Tests can protect architectural decisions, too.

## 7. Words you learned (glossary)

- **Encapsulation** — keeping state private and reachable only through methods that enforce the rules.
- **Invariant** — a fact that must hold at all times ("balance ≥ 0", "every change is logged").
- **Field** — a plain variable in a class; convention: private, named `_likeThis`.
- **Property** — getter/setter methods that look like a variable (`Balance { get; private set; }`).
- **Auto-implemented property** — a property where the compiler generates the hidden storage.
- **Access modifier** — `public` / `private` (and friends): who may touch a member; compiler-enforced.
- **`{ get; private set; }`** — public reading, class-only writing; the everyday encapsulation tool.
- **`readonly` (field)** — the field can't be re-assigned after construction (the list it holds can still change — that's why it's also private).
- **`IReadOnlyList<T>`** — a look-but-don't-touch view of a list: `Count`, indexing, iteration; no `Add`/`Clear`.
- **`AsReadOnly()`** — wraps a `List<T>` in a live read-only view (not a copy — always current).
- **`ArgumentOutOfRangeException`** — "that value is nonsense regardless of state" (`Deposit(-50)`).
- **`InvalidOperationException`** — "fine value, wrong moment" (overdraft).
- **Guard clause** — a validation at the top of a method that throws/returns before any state changes.
- **Audit trail** — an append-only log of what happened; only meaningful if callers can't edit it.

## 8. Experiments to try on the plane (no internet needed)

Rebuild after each change with `dotnet run --project csharp/09-encapsulation-bank/refactored -- test`.

1. **Try each attack yourself.** In the refactored `Program.cs`, uncomment-style add each original attack line — `account.Balance = -5000m;`, `account.History.Clear();`, `account.History.Add("fake");` — one at a time and build. Expected: CS0200 for the first, CS1061 for the other two. Delete them again; the point was watching the compiler play goalkeeper.
2. **Weaken a guard, watch a test object.** In `Withdraw`, change `if (amount <= 0)` to `if (amount < 0)` and run the tests. Expected: everything still passes! `Withdraw(0)` slips through, changing the balance by nothing but *adding a history entry*. Now add the missing test — `Check.Throws<ArgumentOutOfRangeException>(() => a.Withdraw(0m), ...)` — watch it fail, then restore the guard. Lesson: invariants need tests at their exact boundaries, or the boundary quietly moves.
3. **Add a transfer, the funnel way.** Write `static void Transfer(Account from, Account to, decimal amount)` in `Tests.cs` using only `Withdraw` + `Deposit`. Tests: both balances correct, both histories grew by one entry, and a failed transfer (insufficient funds) changes *neither* account. Notice you got the logging and validation for free — the funnel did it.
4. **Give accounts an owner, validated at birth.** Add a constructor `public Account(string owner)` that throws `ArgumentException` for a blank owner, storing it in `public string Owner { get; }` (get-only — not even a private setter!). Expected fallout: `new Account()` calls stop compiling until they provide an owner; add a `Check.Throws<ArgumentException>` for `new Account("")`. Objects should be born valid, not patched into validity.
5. **Break the read-only promise on purpose.** Change `History` to return `_history` directly (type `List<string>`), rebuild, and run the tests. Expected: the `History is not List<string>` test fails — the design-guard test caught the leak that a human reviewer might have waved through. Restore `AsReadOnly()`.
