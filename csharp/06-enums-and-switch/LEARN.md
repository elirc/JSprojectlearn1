# 📘 Learning Guide: Enums and Switch Expressions

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

An order-status workflow — the kind of code every shop, ticket system, and delivery app has somewhere. An order is always in exactly one **status**: pending, paid, shipped, or delivered. The program answers three questions about any order:

- What should we do next? (pending → send a payment reminder, paid → print a label...)
- Can the customer still cancel? (only before it ships)
- What status comes after this one? (pending → paid → shipped → delivered)

The original stores statuses as plain strings, and two orders get silently mishandled because `"Paid"` and `"SHIPPED"` don't match `"paid"` and `"shipped"`. The refactor gives statuses a real type — an **enum** — so those bugs become impossible to write.

## 2. Concepts you need first

### What an enum is

An **enum** (short for *enumeration*) is a type you define by listing every value it can ever hold:

```csharp
public enum OrderStatus
{
    Pending,
    Paid,
    Shipped,
    Delivered,
}
```

Now a variable of type `OrderStatus` can hold `OrderStatus.Pending`, `OrderStatus.Paid`, `OrderStatus.Shipped`, or `OrderStatus.Delivered` — and *nothing else*. There is no lowercase variant, no `"PAYED"` typo, no `"banana"`. If you write `OrderStatus.Payed`, the program doesn't compile.

In JS you'd fake this with an object of constants — `const Status = { Pending: 'pending', Paid: 'paid' }` — but nothing stops someone passing any other string. In TypeScript you'd write a literal union: `type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered'` (that's exactly what ts#06 teaches). C#'s `enum` is the same idea as the TS union, checked by the compiler.

### Enums are numbers underneath

Secretly, each enum member is an integer: `Pending` is 0, `Paid` is 1, `Shipped` is 2, `Delivered` is 3 (counting up in declaration order). Mostly you can ignore this, but it explains two things you'll meet in this project:

```csharp
var s = (OrderStatus)2;          // casting a number INTO the enum: Shipped
var weird = (OrderStatus)42;     // ...but 42 also "works"! No error here!
Console.WriteLine(weird);        // prints "42" — an unnamed enum value
```

That second line is the one hole in the enum fence: a **cast** (forcing a value into a type with `(TypeName)value`) lets any integer sneak in. Good code slams that door shut, and you'll see how in the refactor.

### The classic switch statement

You've seen if/else chains. C# also has `switch`, which compares one value against several cases:

```csharp
switch (status)
{
    case OrderStatus.Pending:
        Console.WriteLine("send reminder");
        break;                      // "break" = done with this case
    case OrderStatus.Paid:
        Console.WriteLine("print label");
        break;
    default:
        Console.WriteLine("???");
        break;
}
```

This works, but it's wordy — every case needs a `break`, and the whole thing is a *statement* (it does things) rather than an *expression* (it produces a value). JS has this exact `switch` too, with the same `break` housekeeping.

### Switch expressions (the modern form)

C# has a second, newer switch that *returns a value* — that's the one this project uses everywhere:

```csharp
string next = status switch
{
    OrderStatus.Pending   => "send reminder",
    OrderStatus.Paid      => "print label",
    OrderStatus.Shipped   => "email tracking",
    OrderStatus.Delivered => "ask for review",
};
```

Read `x switch { A => r1, B => r2 }` as: "look at x; if it's A the whole expression becomes r1, if B it becomes r2." No `break`, no repetition of `return` — one arrow per rule. JS has no equivalent; the closest is a chain of ternaries or an object lookup like `{ pending: 'send reminder' }[status]`.

You can also combine cases with `or`:

```csharp
bool canCancel = status switch
{
    OrderStatus.Pending or OrderStatus.Paid      => true,
    OrderStatus.Shipped or OrderStatus.Delivered => false,
};
```

### Exhaustiveness — the compiler counts your cases

Here's the superpower. A switch expression must handle **every possible input**, and the compiler checks. If `OrderStatus` gains a fifth member `Refunded` and you *don't* add a case, rebuilding prints:

```
warning CS8509: The switch expression does not handle all possible values
of its input type (it is not exhaustive). For example, the pattern
'OrderStatus.Refunded' is not covered.
```

The compiler names the exact value you forgot, in every switch you forgot it in. Growing the enum turns into a guided checklist instead of a bug hunt. (ts#12 builds this same machine by hand with `never` and `assertNever`; C# ships it built in.)

### The discard `_` and throw expressions

`_` in a switch expression means "anything else" (it's called a **discard** — like `default`). Because of the `(OrderStatus)42` hole above, our switches end with:

```csharp
_ => throw new ArgumentOutOfRangeException(nameof(status), status, "unhandled OrderStatus"),
```

Two new things in one line. First, `throw` can be used *as an expression* — as the value of a switch arm. Second, `nameof(status)` turns the variable name into the string `"status"` (so the error message can't drift if the parameter gets renamed). The intent: "this should never happen, and if it somehow does, explode loudly with a good message" — never silently pick a wrong answer. There's a real tension here worth understanding: adding `_ =>` makes the compiler stop warning about missing *named* cases (as far as it's concerned, `_` covers them). That's why the arm must only ever hold a `throw` — never a real fallback answer like `false`.

### `Enum.TryParse` and `out` parameters

The outside world speaks strings — form posts, files, old databases. `Enum.TryParse` converts a string to an enum, and its `bool` return value tells you whether it worked:

```csharp
if (Enum.TryParse("Paid", ignoreCase: true, out OrderStatus status))
{
    // status is OrderStatus.Paid here
}
```

`out` means the function hands back a *second* result through that parameter (project 03's `Dictionary.TryGetValue` used the same pattern). `ignoreCase: true` is a **named argument** — naming it makes the call site readable — and it's what forgives `"Paid"` and `"SHIPPED"`.

One trap: `Enum.TryParse("42", ...)` **succeeds** and gives you the unnamed value `(OrderStatus)42`, because enums are numbers underneath. The fix is one more check, `Enum.IsDefined(status)`, which asks "is this one of the *named* members?"

## 3. Walking through the original code

The data — note the two time bombs planted in plain sight:

```csharp
var orders = new List<Order>
{
    new Order("A-1001", "pending"),
    new Order("A-1002", "Paid"),     // typed by hand in the admin tool — capital P
    new Order("A-1003", "SHIPPED"),  // imported from the old system, which SHOUTED
    new Order("A-1004", "delivered"),
};
```

Nothing stops those inconsistent spellings, because `Status` is declared as *any string at all*:

```csharp
class Order
{
    public string Id;
    public string Status;  // any string at all: "paid", "Paid", "PAYED", "banana"...
    ...
}
```

The first rule chain:

```csharp
string NextStep(string status)
{
    if (status == "pending") return "send payment reminder";
    else if (status == "paid") return "print shipping label";
    else if (status == "shipped") return "email tracking number";
    else if (status == "delivered") return "ask for a review";
    else return "??? unknown status — doing nothing";  // where typos go to hide
}
```

String comparison with `==` is case-sensitive: `"Paid" == "paid"` is `false`. So order A-1002 tests false against all four branches and lands in the `???` bucket. The program keeps running. No label gets printed. Nobody is told.

The second chain is subtler and nastier:

```csharp
bool CanCancel(string status)
{
    if (status == "shipped") return false;
    else if (status == "delivered") return false;
    else return true;  // "anything else must be early in the flow"... right?
}
```

The author listed the *false* cases and let `else` mean "everything else is cancellable." But "everything else" includes `"SHIPPED"`, `"PAYED"`, and `"banana"`. Order A-1003 — already on a truck — is told it can cancel.

## 4. What's wrong with it (in beginner terms)

**1. The type says less than you know.** You know a status is one of four words. The code says `string` — one of infinitely many words. Every function that receives a status has to *re-guess* what it might be, and every guess (each if/else chain) can guess differently. The compiler, which happily catches a misspelled variable name, is powerless here: `"PAYED"` is a perfectly fine *string*.

**2. Failure is silent.** When a status doesn't match any branch, nothing crashes. `NextStep` shrugs into its `???` bucket; `CanCancel` confidently answers `true`. Silent wrong answers are the worst kind of bug — the program looks healthy while the shipping queue quietly rots. Compare project 05's null lesson: the crash was never the real problem; the *quiet* wrong path is.

**3. The knowledge is scattered.** "Which statuses exist?" is answered nowhere and implied everywhere. Adding `"refunded"` means finding every chain that switches on status strings — in this file and every other file — with no tool support. Miss one and you've planted bug #1 or #2 again.

**4. Every default is a policy written by accident.** `else return true` wasn't a decision anyone made about SHOUTED imports; it's just where unmatched strings happen to fall. When the input type is too wide, your `else` branches silently become policy for inputs you never imagined.

## 5. Try it yourself first!

Before reading the solution, try to fix the original yourself. Hints, vaguest first:

1. 🌱 Could you make it *impossible* to hold a misspelled status, instead of handling misspellings better? What C# feature lists a fixed set of named values?
2. 🌿 Declare `enum OrderStatus { Pending, Paid, Shipped, Delivered }` and change `NextStep(string)` to `NextStep(OrderStatus)`. What happens to the `???` branch — do you still need it?
3. 🌳 Rewrite the if/else chains as switch *expressions* (`status switch { ... }`). Then comment out one case and rebuild — read the warning the compiler gives you.
4. 🍎 The orders arrive as strings, though ("Paid", "SHIPPED"). Write a `TryParseStatus(string, out OrderStatus)` that uses `Enum.TryParse` with `ignoreCase: true`, plus `Enum.IsDefined` to reject `"42"`. Convert once, at the door; pass the enum everywhere else.

## 6. Understanding the refactored solution

**`OrderStatus.cs`** — four lines that answer "what statuses exist?" forever, in one place.

**`OrderWorkflow.cs`** — every rule chain became a switch expression. Compare shapes:

```csharp
public static string NextStep(OrderStatus status) => status switch
{
    OrderStatus.Pending   => "send payment reminder",
    OrderStatus.Paid      => "print shipping label",
    OrderStatus.Shipped   => "email tracking number",
    OrderStatus.Delivered => "ask for a review",
    _ => throw new ArgumentOutOfRangeException(nameof(status), status, "unhandled OrderStatus"),
};
```

The `???` bucket is *gone* — there is no such thing as an unknown `OrderStatus` in normal code, so no branch needs to exist for it. The `_ => throw` line handles only the cast-a-weird-number case, and it *throws* rather than inventing an answer. The tests prove it: `NextStep((OrderStatus)42)` raises `ArgumentOutOfRangeException`.

`CanCancel` now states the whole policy explicitly — both halves, no accidental `else`:

```csharp
OrderStatus.Pending or OrderStatus.Paid      => true,
OrderStatus.Shipped or OrderStatus.Delivered => false,
```

`Advance` encodes the legal path, one transition per line, and makes the *impossible* transition a real error:

```csharp
OrderStatus.Delivered => throw new InvalidOperationException("A delivered order has nowhere left to go."),
```

**The border checkpoint.** Strings still exist — they arrive from outside. The refactor converts them exactly once:

```csharp
if (Enum.TryParse(text.Trim(), ignoreCase: true, out OrderStatus parsed)
    && Enum.IsDefined(parsed)) // TryParse alone accepts numbers like "42"!
```

`"Paid"` and `"SHIPPED"` — the two orders the original silently mishandled — now parse cleanly, on purpose, at one door. `"PAYED"` is *rejected* at that door with a clear "not a real status," instead of drifting through the system matching nothing. This in/out split is the same idea as ts#06's closing note: enums type the *inside* of your program; parsing guards the *edges*.

**`Tests.cs`** — one test per transition, per policy answer, per parse case. Notice how cheap they are to write when each rule is a pure function taking an enum: no setup, just call and check.

## 7. Words you learned (glossary)

- **Enum (enumeration)** — a type defined by listing every value it can hold.
- **Enum member** — one of the named values (`OrderStatus.Paid`).
- **Underlying value** — the integer secretly backing each member (Pending = 0, Paid = 1...).
- **Cast** — forcing a value into a type with `(TypeName)value`; how unnamed values like `(OrderStatus)42` sneak into an enum.
- **Switch statement** — the classic `switch/case/break` block that *does* things.
- **Switch expression** — `x switch { A => r1, ... }`; *produces a value*, one arrow per case.
- **Switch arm** — one `pattern => result` line inside a switch expression.
- **Exhaustiveness** — a switch handling every possible input; the compiler warns (CS8509) when it doesn't.
- **Discard (`_`)** — the "anything else" pattern; in enum switches, reserve it for `throw`.
- **Throw expression** — using `throw` where a value is expected, e.g. as a switch arm.
- **`nameof(x)`** — compiles to the string `"x"`; keeps error messages in sync with renames.
- **`out` parameter** — a second result a method hands back through a parameter (`TryParse`, `TryGetValue`).
- **Named argument** — `ignoreCase: true`; naming the parameter at the call site for readability.
- **`Enum.TryParse` / `Enum.IsDefined`** — string → enum conversion, plus the check that it's a *named* member.
- **Transition** — a legal move from one status to the next (Pending → Paid).

## 8. Experiments to try on the plane (no internet needed)

Rebuild after each change with `dotnet run --project csharp/06-enums-and-switch/refactored -- test`.

1. **Grow the enum.** Add `Refunded` to `OrderStatus`, then temporarily delete the `_ => throw` arm from `NextStep` and rebuild. Expected: warning CS8509 naming `OrderStatus.Refunded` — the compiler telling you exactly which case you forgot. Now restore the `_ => throw` arm and rebuild: the warning disappears, even though Refunded still has no real answer! That's the trade-off from section 2 — `_` buys runtime safety for weird casts but mutes the compile-time checklist, which is why it must only ever hold a `throw` (a loud runtime failure) and never a quiet default. Finish the job: give Refunded a real arm in all three methods (e.g. `NextStep` → "restock returned items", `CanCancel` → false, `Advance` → throw) and add tests.
2. **Break a case on purpose.** In `CanCancel`, move `OrderStatus.Paid` from the `true` arm to the `false` arm and run the tests. Expected: `FAIL Paid can cancel` with expected/actual clearly printed. That's your safety net working.
3. **Prove the `"42"` trap.** In `TryParseStatus`, delete the `&& Enum.IsDefined(parsed)` check and run the tests. Expected: the `"numeric strings are rejected"` test fails, because `Enum.TryParse("42", ...)` happily produces an unnamed value. Put the check back.
4. **Meet an unnamed value face to face.** In the demo (`Program.cs`), add `Console.WriteLine((OrderStatus)2);` and `Console.WriteLine((OrderStatus)42);`. Expected: `Shipped`, then `42` — the number prints raw because no name exists for it.
5. **Feel the original's pain once more.** In `original.cs`, add a fifth order `new Order("A-1005", "refunded")` and run it. Expected: `??? unknown status` *and* "can cancel" — both wrong, both silent. Count how many places you'd have to edit to support it properly, then compare with experiment 1's compiler-guided version.
