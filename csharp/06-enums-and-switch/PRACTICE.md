# 🏋️ Practice: Enums and Switch

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Status badges (warm-up)

Add `Badge(OrderStatus status)` to `OrderWorkflow`: a fixed four-letter tag for dashboards — `Pending` → `"PEND"`, `Paid` → `"PAID"`, `Shipped` → `"SHIP"`, `Delivered` → `"DONE"`. Write it as a switch *expression* with the same loud `_ => throw` arm the other methods use.

Practices: writing your first switch expression from scratch, keeping the discard arm a `throw`.

Hint: copy `NextStep`'s shape; only the right-hand sides change.

Check it offline: add this Check test to `Tests.cs` — all three should pass:
`Check.Equal("PEND", OrderWorkflow.Badge(OrderStatus.Pending), "Pending badge");`
`Check.Equal("DONE", OrderWorkflow.Badge(OrderStatus.Delivered), "Delivered badge");`
`Check.Throws<ArgumentOutOfRangeException>(() => OrderWorkflow.Badge((OrderStatus)42), "unnamed value throws");`

### ⭐⭐ 2. Steps remaining (core)

Add `StepsRemaining(OrderStatus status)` returning how many `Advance` calls stand between this status and `Delivered`: Pending → 3, Paid → 2, Shipped → 1, Delivered → 0. A switch expression can return an `int` just as happily as a `string`.

Practices: switch expressions returning non-string values, encoding workflow knowledge as data.

Hint: four arms, four numbers, plus the `_ => throw` arm.

Check it offline: add to `Tests.cs` — both should pass:
`Check.Equal(3, OrderWorkflow.StepsRemaining(OrderStatus.Pending), "three hops from Pending");`
`Check.Equal(0, OrderWorkflow.StepsRemaining(OrderStatus.Delivered), "Delivered is home");`

### ⭐⭐ 3. Walking backwards, nullably (core)

Add `PreviousOrNull(OrderStatus status)` — the inverse of `Advance` — returning `OrderStatus?`. `Paid` came from `Pending`, and so on; but `Pending` has no predecessor, and instead of throwing (like `Advance` does at the far end) return `null`. Compare the two designs as you write it: exception vs nullable, both honest, different callers.

Practices: nullable *value* types (`OrderStatus?`), designing the no-answer case deliberately.

Hint: the arm for Pending is just `OrderStatus.Pending => null,` — the return type `OrderStatus?` makes that legal.

Check it offline: add to `Tests.cs` — all three should pass:
`Check.Equal(OrderStatus.Pending, OrderWorkflow.PreviousOrNull(OrderStatus.Paid), "Paid came from Pending");`
`Check.Equal(OrderStatus.Shipped, OrderWorkflow.PreviousOrNull(OrderStatus.Delivered), "Delivered came from Shipped");`
`Check.True(OrderWorkflow.PreviousOrNull(OrderStatus.Pending) is null, "nothing before Pending");`

### ⭐⭐ 4. Describe every status, automatically (core)

Add `DescribeAll()` returning a `List<string>` with one line per status, like `"Pending: send payment reminder"` — built by looping over **all** enum values so that when the enum grows, this method updates itself. The tool: `Enum.GetValues<OrderStatus>()` hands you every named value in declaration order.

Practices: `Enum.GetValues<T>()`, enum-to-string via interpolation, reusing `NextStep` instead of re-listing rules.

Hint: `foreach (var status in Enum.GetValues<OrderStatus>())` and one interpolated `$"{status}: {NextStep(status)}"` per pass.

Check it offline: add to `Tests.cs` — both should pass:
```csharp
var lines = OrderWorkflow.DescribeAll();
Check.Equal(4, lines.Count, "one line per status");
Check.Equal("Pending: send payment reminder", lines[0], "declaration order, enum name prints itself");
```

### ⭐⭐⭐ 5. Cancellation fees with tuple patterns (challenge)

Policy time: cancelling is free while `Pending`; once `Paid` it costs 1.00 — or 3.00 if it was an express order; `Shipped`/`Delivered` can't cancel at all (throw `InvalidOperationException`). Write `CancellationFee(OrderStatus status, bool express)` as **one** switch expression over the *pair* — `(status, express) switch { ... }` — with tuple patterns like `(OrderStatus.Paid, true) => 3m`.

Practices: tuple patterns, `_` inside a tuple ("either value"), `or` patterns combining cases, `throw` as a switch arm.

Hint: `(OrderStatus.Pending, _) => 0m` matches Pending with either bool; `(OrderStatus.Shipped or OrderStatus.Delivered, _) =>` covers both dead ends in one arm.

Check it offline: add to `Tests.cs` — all four should pass:
```csharp
Check.Equal(0m, OrderWorkflow.CancellationFee(OrderStatus.Pending, true), "free while pending, even express");
Check.Equal(1m, OrderWorkflow.CancellationFee(OrderStatus.Paid, false), "standard paid fee");
Check.Equal(3m, OrderWorkflow.CancellationFee(OrderStatus.Paid, true), "express paid fee");
Check.Throws<InvalidOperationException>(() => OrderWorkflow.CancellationFee(OrderStatus.Shipped, false), "too late");
```

### ⭐⭐⭐ 6. The full journey (challenge)

Add `PathFrom(OrderStatus start)` returning `List<OrderStatus>` — every status from `start` to `Delivered` inclusive, computed by *calling `Advance` in a loop* rather than by listing paths. `PathFrom(Pending)` is `[Pending, Paid, Shipped, Delivered]`; `PathFrom(Delivered)` is just `[Delivered]`. Careful: `Advance(Delivered)` throws, so your loop condition must stop you from ever making that call.

Practices: enums in collections, driving a workflow with a `while` loop, designing the termination condition around a throwing method.

Hint: seed the list with `start`, then `while (current != OrderStatus.Delivered)` advance-and-add. Check the Delivered case in your head before running.

Check it offline: add to `Tests.cs` — both should pass:
`Check.Equal("Pending,Paid,Shipped,Delivered", string.Join(",", OrderWorkflow.PathFrom(OrderStatus.Pending)), "the whole road");`
`Check.Equal("Delivered", string.Join(",", OrderWorkflow.PathFrom(OrderStatus.Delivered)), "already home — no Advance call made");`

## Solutions

### 1. Status badges

```csharp
public static string Badge(OrderStatus status) => status switch
{
    OrderStatus.Pending   => "PEND",
    OrderStatus.Paid      => "PAID",
    OrderStatus.Shipped   => "SHIP",
    OrderStatus.Delivered => "DONE",
    _ => throw new ArgumentOutOfRangeException(nameof(status), status, "unhandled OrderStatus"),
};
```

WHY: the same shape as `NextStep` on purpose — one arm per named value, so deleting any arm makes the compiler warn (CS8509) with the missing name. The `_` arm exists only for unnamed casts like `(OrderStatus)42`, and it throws rather than guessing, keeping runtime failures as loud as compile-time ones.

### 2. Steps remaining

```csharp
public static int StepsRemaining(OrderStatus status) => status switch
{
    OrderStatus.Pending   => 3,
    OrderStatus.Paid      => 2,
    OrderStatus.Shipped   => 1,
    OrderStatus.Delivered => 0,
    _ => throw new ArgumentOutOfRangeException(nameof(status), status, "unhandled OrderStatus"),
};
```

WHY: a switch expression's arms just need one common type — `int` works exactly like `string`. Encoding "distance to done" as data makes UI work ("2 steps left!") trivial without touching workflow logic. You *could* compute it by looping `Advance`, but four statuses don't earn a loop — exercise 6 shows the loop version of this idea.

### 3. Walking backwards, nullably

```csharp
public static OrderStatus? PreviousOrNull(OrderStatus status) => status switch
{
    OrderStatus.Pending   => null,
    OrderStatus.Paid      => OrderStatus.Pending,
    OrderStatus.Shipped   => OrderStatus.Paid,
    OrderStatus.Delivered => OrderStatus.Shipped,
    _ => throw new ArgumentOutOfRangeException(nameof(status), status, "unhandled OrderStatus"),
};
```

WHY: enums are value types, so "maybe absent" is spelled `OrderStatus?` — same `?` as project 05's `string?`, same honesty. `Advance` throws at its dead end because advancing a delivered order is a *caller bug*; walking back from `Pending` is a perfectly normal question with answer "nothing", so `null` fits better than an exception. Signatures are policy.

### 4. Describe every status, automatically

```csharp
public static List<string> DescribeAll()
{
    var lines = new List<string>();
    foreach (var status in Enum.GetValues<OrderStatus>())
    {
        lines.Add($"{status}: {NextStep(status)}");
    }
    return lines;
}
```

WHY: `Enum.GetValues<OrderStatus>()` enumerates the *definition*, so a future `Refunded` member appears here with zero edits — and if `NextStep` lacks an arm for it, the compiler warning fires there, not here. Interpolating an enum prints its name (`Pending`), which is exactly why good enum names matter.

### 5. Cancellation fees with tuple patterns

```csharp
public static decimal CancellationFee(OrderStatus status, bool express) => (status, express) switch
{
    (OrderStatus.Pending, _)  => 0m,
    (OrderStatus.Paid, false) => 1m,
    (OrderStatus.Paid, true)  => 3m,
    (OrderStatus.Shipped or OrderStatus.Delivered, _) =>
        throw new InvalidOperationException($"a {status} order can no longer be cancelled"),
    _ => throw new ArgumentOutOfRangeException(nameof(status), status, "unhandled OrderStatus"),
};
```

WHY: switching on the tuple `(status, express)` turns a two-variable policy into a flat, readable table — no nested `if`s. `_` inside a tuple means "either value here"; `or` merges the two dead-end statuses into one arm. Arms are checked top to bottom, and a `throw` arm makes an impossible request fail loudly, exactly like `Advance` does.

### 6. The full journey

```csharp
public static List<OrderStatus> PathFrom(OrderStatus start)
{
    var path = new List<OrderStatus> { start };
    var current = start;
    while (current != OrderStatus.Delivered)
    {
        current = Advance(current);
        path.Add(current);
    }
    return path;
}
```

WHY: the path is *derived* from `Advance`, not duplicated — if the workflow ever gains a step, this method is automatically correct. The loop condition is doing the safety work: because we test `current != Delivered` *before* calling `Advance`, the throwing case can never be reached, and `PathFrom(Delivered)` returns `[Delivered]` without a single `Advance` call. Loop conditions are where you encode "don't ask illegal questions."
