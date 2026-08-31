# 📘 Learning Guide: Pattern Matching (A Rules Engine)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them. cs#06 gave you switch *expressions* over enums; cs#07 gave you records. Patterns are where those two meet: questions about the *shape* of a value, written as one readable line each.

## 1. What are we building?

A shipping-and-discount rules engine. Eight shipping rules, six discount rules, one table in the README that says exactly what should happen. The kind of code that exists in every commercial system, is edited by everyone, and is understood by nobody after the third change.

The original implements it as nested `if`/`else` over bool flags. It is not badly written by 2005 standards — it is careful, indented, commented. It also charges $0.00 for a $200 pallet, because the rules ended up in a different order from the spec and there is nowhere in the code where that fact is visible.

The refactor writes the same eight rules as eight lines of one switch expression, in the spec's order.

## 2. Concepts you need first

### A pattern is a question about shape

You already know two patterns from cs#06:

```csharp
customer switch
{
    Guest => 0m,           // TYPE pattern: "is it a Guest?"
    _ => 0.1m,             // DISCARD pattern: "anything"
}
```

C# has grown a whole family of these, and they all compose — patterns nest inside patterns.

### The type pattern, and why `as` retires

The old way to ask "is this an Employee, and if so use it as one":

```csharp
Employee? emp = customer as Employee;      // cast-or-null
if (emp != null) { ...use emp... }
```

or the double-question version:

```csharp
if (customer is Employee) { Employee e = (Employee)customer; ... }
```

The pattern way asks and binds at once:

```csharp
if (customer is Employee emp) { ...use emp... }
```

One question, one name, no null check, no second cast that could name a different type than the one you tested.

### Property patterns: `{ Property: pattern }`

```csharp
order is { Ship: Destination.International }
order is { Subtotal: > 50m }
order is { Customer: Employee }            // a type pattern INSIDE a property pattern
order is { Customer.Name: "ada" }          // nested paths work too
```

Any accessible property or field can appear, including computed ones like `Order.Subtotal` and `Order.HasOversize`. That is what lets the rules read like the spec instead of like a variable dump.

### Relational patterns: `> 50m`, `<= 10m`

A pattern can be a comparison:

```csharp
temperature switch
{
    < 0 => "freezing",
    < 15 => "cold",
    < 25 => "fine",
    _ => "hot",
}
```

Combine them with `and`, `or`, `not` — which work on *patterns*, not just bools:

```csharp
n is >= 1 and <= 9              // one operand, two comparisons
customer is Guest or Member(_, 0)
line is not { Quantity: 0 }
```

### Positional patterns: `Member(_, >= 5)`

A positional record (cs#07) gets a compiler-generated `Deconstruct`, and a positional pattern uses it:

```csharp
public sealed record Member(string Name, int Years) : Customer;

customer switch
{
    Member(_, >= 10) => 0.15m,     // any name, ten years or more
    Member(_, >= 5) => 0.10m,
    Employee(_, "Warehouse") => 0.30m,
    ...
}
```

`_` in a positional pattern means "this part, whatever it is". Two questions — which type, which value — on one line.

### List patterns: `[]`, `[x]`, `[first, .., last]`

Patterns can describe a *sequence*:

```csharp
lines switch
{
    [] => "empty",
    [var only] => $"one line of {only.Sku}",
    [_, _] => "exactly two",
    [{ IsOversize: true }, ..] => "freight first",     // element pattern + slice
    [var first, .., var last] => "three or more",
}
```

`..` is a **slice pattern**: "any number of elements here, including none". List patterns work on any type that is *countable* (a `Count` or `Length` property) and *indexable* — arrays, `List<T>`, `IReadOnlyList<T>`, `string`.

### `switch` expression vs `switch` statement

An expression *produces a value*, so it can be the whole body of a method:

```csharp
public static ShippingQuote Quote(Order order) => order switch { ... };
```

Arms are `pattern => value`, separated by commas, tried **top to bottom**; the first match wins. If none match you get a `SwitchExpressionException` at runtime — which is why a `_` arm (or a provably exhaustive set) matters.

### `when` guards, and when not to use them

An arm can carry an extra condition:

```csharp
[var only] when only.Quantity > 100 => "bulk",
```

Useful, but a `when` clause is ordinary code, not a pattern — the compiler cannot reason about it for exhaustiveness or overlap, and a switch full of `when`s is a nested `if` wearing a costume. Prefer a pattern when one exists: `[{ Quantity: > 100 }]` says the same thing as the line above, in the language the compiler understands.

## 3. Walking through the original code

Every rule needs a fact, and every fact is computed far from its use:

```csharp
Member? mem = order.Customer as Member;
if (mem != null)
{
    if (mem.Years > 5)                            // spec says "5 or more"...
    {
        isLoyalMember = true;
    }
}
```

Then, forty lines later, the decision:

```csharp
if (isLoyalMember)
{
    return (0m, "loyalty 5+ years");
}
```

The string on that line says "5+". The boundary that decides it lives in a different paragraph and says `> 5`. Both halves look right on their own screen.

The bigger bug is structural:

```csharp
if (subtotal > 50m)      return (0m, "free over $50");     // ⬅ rule 5
else if (hasOversize)    return (24m, "oversize freight"); // ⬅ rule 2, unreachable when subtotal > 50
```

The rule book's second rule is nested *below* its fifth. That is not a typo you can spot: it is an absence of an ordering, and the code has no place where the order is written down at all.

Run the file: the table prints `<-- BUG` twice.

## 4. What's wrong with it (in beginner terms)

**1. Precedence is hidden in indentation.** Which rule wins is decided by nesting depth, which is the least readable property of a program. You cannot diff it against the spec table because the spec table is a list and the code is a tree.

**2. Facts drift from decisions.** A bool named `isLoyalMember` is a *summary* of a rule, computed elsewhere. Every summary is a chance for the name and the condition to disagree, and names never change when conditions do.

**3. `as` + null-check + flag is three statements doing one job.** Each one is a place to forget a case, and the type test and the use can name different types.

**4. Adding a rule is a merge conflict waiting to happen.** Where does rule 9 go in a seven-deep `if`? Somewhere. Whoever adds it will pick a level that makes their test pass, and the other seven rules will quietly change meaning.

## 5. Try it yourself first!

Before reading on, try rewriting the rule book yourself. Hints, vaguest first:

1. 🌱 Replace `Quote`'s body with `order switch { ... }` and give it a single arm — `_ => (4.95m, "standard parcel")` — plus the eight rules as comments. Now you have a place to put them, in order.
2. 🌿 Fill in the arms that need no data: `{ Lines: [] }`, `{ Customer: Employee }`. Note the property pattern is asking about a *computed* property; add `HasOversize` and `Subtotal` to `Order` so the rules can ask directly instead of via flags.
3. 🌳 The loyalty rule wants both the type and a field: `{ Customer: Member(_, >= 5) }`. The letter rate wants the basket's shape and a total: `{ Lines: [{ Quantity: 1 }], Subtotal: <= 10m }`.
4. 🍎 Now the real work: write a test per rule, a test per boundary ($50.00 exactly, four years vs five, $10.00 exactly), and a test per overlap — an employee with an oversize item, a loyal member shipping international. The overlap tests are the ones that make the ORDER a checked fact instead of an accident.

## 6. Understanding the refactored solution

**`Domain.cs`** — the nouns. `Customer` is an `abstract record` with three `sealed record` subtypes: C#'s version of a discriminated union (ts#12's tagged unions). `Order` carries computed properties — `Subtotal`, `HasOversize` — so the rules can ask questions directly instead of through pre-computed flags. `ShippingQuote(decimal Cost, string Rule)` returns the *reason* alongside the price, which is what makes rules testable: `$0.00` alone cannot tell you whether the right rule fired.

**`Rules.cs`** — the payoff. Read the arms against the README table:

```csharp
{ Lines: [] }                                   => new(0.00m, "empty order"),
{ HasOversize: true }                           => new(OversizeFee, "oversize freight"),
{ Customer: Employee }                          => new(0.00m, "employee perk"),
{ Customer: Member(_, >= 5) }                   => new(0.00m, "loyalty 5+ years"),
{ Subtotal: > FreeShippingFrom }                => new(0.00m, "free over $50"),
{ Ship: Destination.International }              => new(InternationalFee, "international flat"),
{ Lines: [{ Quantity: 1 }], Subtotal: <= 10.00m } => new(LetterFee, "letter rate"),
_                                               => new(StandardFee, "standard parcel"),
```

Eight rules, eight lines, in the spec's order. The original's mis-ordering is now something you would see in a diff, because moving a rule means moving a line.

`ShipsFree` is one line — `Quote(order) is { Cost: 0.00m }` — reusing the rule book rather than restating it. `DiscountRules.PercentFor` shows positional patterns splitting `Employee` by department. `OrderText.Describe` and `FreightIsFirst` are the list-pattern demonstrations, including the detail that `[{ IsOversize: true }, ..]` matches *position*, so the same freight line in slot 2 does not match.

**`Tests.cs`** — four groups worth stealing for your own rule engines: one test per rule; one per boundary; one per **overlap** (two rules match — which wins?); and an order-independence sweep. That last one restates the rules as a table of predicates with explicit priority numbers, evaluates 84 orders by "lowest priority number among the matches", and checks the switch agrees — then does it again with the table reversed. Since the table's answer cannot depend on its array order, agreement proves the switch's *arm order* really does encode the documented precedence.

## 7. Words you learned (glossary)

- **Pattern** — a test on a value's shape that can also bind names.
- **Type pattern** — `customer is Employee emp`; test and bind in one step.
- **Discard `_`** — "anything, and I don't want it".
- **Property pattern** — `{ Subtotal: > 50m }`; test properties, nest patterns inside.
- **Relational pattern** — `> 50m`, `<= 10m`; comparison as a pattern.
- **Logical patterns** — `and`, `or`, `not` combining patterns.
- **Positional pattern** — `Member(_, >= 5)`; uses the record's `Deconstruct`.
- **`Deconstruct`** — the method positional patterns call; records generate one.
- **List pattern** — `[]`, `[x]`, `[a, b]`; matches a sequence's shape.
- **Slice pattern** — `..`; "any number of elements here".
- **Switch expression** — `value switch { pattern => result, ... }`; produces a value.
- **Arm** — one `pattern => result` line.
- **`when` guard** — extra boolean condition on an arm; not a pattern.
- **Exhaustiveness** — whether the arms cover every possible value; if not, add `_`.
- **`SwitchExpressionException`** — thrown when nothing matched at runtime.
- **Discriminated union** — a closed family of shapes (`abstract record` + sealed subtypes).
- **Precedence** — which rule wins when two match; in a switch expression, it is line order.

## 8. Experiments to try on the plane (no internet needed)

Run tests after each change: `dotnet run --project csharp/31-pattern-matching-rules/refactored -- test`

1. **Recreate the original's bug in one move.** In `ShippingRules.Quote`, cut the `{ HasOversize: true }` arm and paste it below the `{ Subtotal: > FreeShippingFrom }` arm. Run the tests. Expected: `oversize beats free-over-$50 — THE original's bug, pinned forever` fails, and so does the order-independence sweep. Then look at the diff: the bug is *one moved line*, which is exactly what you want a bug like this to look like.
2. **Break a boundary.** Change `Member(_, >= 5)` to `Member(_, > 5)` — the original's off-by-one. Expected: `five-year members ship free` fails immediately. In the original this same mistake needed a customer to complain.
3. **Delete the `_` arm.** Remove the final `standard parcel` arm and build. Expected: warning CS8509 (the switch is not exhaustive) and, at runtime, a `SwitchExpressionException` for a plain domestic guest order. Non-exhaustive switches are a compile-time warning in C# and a 3am page in JavaScript.
4. **Add rule 9 without touching rule 1–8.** "Gift-wrapped orders (any line with SKU starting `GIFT-`) always cost $2.50 extra" is not expressible as an arm — it *modifies* a quote instead of choosing one. Write it as a wrapper: `public static ShippingQuote QuoteWithExtras(Order o)` that calls `Quote` and adds the surcharge when `o.Lines.Any(l => l.Sku.StartsWith("GIFT-"))`. Expected: every existing test still passes. Knowing which rules are *selections* and which are *adjustments* is half of rule-engine design.
5. **Feel `when` versus a pattern.** Rewrite the letter-rate arm as `{ Lines: [var only] } when only.Quantity == 1 && order.Subtotal <= 10m`. Expected: tests still pass — and the line is now longer, unreadable in a table, and invisible to the compiler's overlap analysis. Revert. `when` is for conditions no pattern can express, not for conditions you have not looked up yet.
6. **A new customer type.** Add `public sealed record Partner(string Company, decimal Rate) : Customer;` and build. Expected: everything compiles, because `_` catches it — and `Partner` silently gets guest treatment. Now add `Partner(_, > 0.2m) => 0.25m` to `PercentFor` and a shipping arm. The lesson: `_` keeps you compiling and lets new cases fall through unnoticed, which is why the sweep test enumerates customer types explicitly.
