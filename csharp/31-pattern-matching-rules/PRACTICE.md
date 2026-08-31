# 🏋️ Practice: Pattern Matching (A Rules Engine)

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. Rule-engine habit for all six: when you add a rule, add the **overlap** test that says what it beats.

## Exercises

### ⭐ 1. Name the customer (warm-up)

Add `OrderText.Label(Customer customer)` returning a one-line description: `"ada (staff, Support)"`, `"grace (member, 10 yrs)"`, `"a new member"` for zero years, `"a guest"`. One switch expression, no `if`, no casts.

Practices: positional patterns with a mix of bound names and constants, and arm order (the specific member rule must come before the general one).

Hint: `Employee(var name, var dept) => $"{name} (staff, {dept})"` binds both parts. `Member(_, 0)` is a positional pattern with a constant in it, so it must sit above `Member(var name, var years)`.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
Check.Equal("ada (staff, Support)", OrderText.Label(new Employee("ada", "Support")), "staff show their department");
Check.Equal("grace (member, 10 yrs)", OrderText.Label(new Member("grace", 10)), "members show their years");
Check.Equal("a new member", OrderText.Label(new Member("newbie", 0)), "a zero-year member is a special case above the general one");
Check.Equal("a guest", OrderText.Label(new Guest()), "and a guest has nothing to show");
```

### ⭐⭐ 2. A rule that beats everything (core)

Hazardous goods (SKU starting `HAZMAT-`) cost a flat **$40.00** and outrank every other shipping rule except the empty basket. Add `HasHazmat` to `Order`, a `HazmatFee` constant, and exactly one arm to `ShippingRules.Quote` — in the position that makes the sentence "outranks everything except empty" true.

Practices: the core skill of this project — *where* an arm goes is the rule's precedence, and overlap tests are how you prove you put it in the right place.

Hint: `Lines.Any(l => l.Sku.StartsWith("HAZMAT-", StringComparison.Ordinal))`, and the arm goes second, directly under `{ Lines: [] }`.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var hazmat = O(new Guest(), Destination.Domestic, ("HAZMAT-ACID", 1, 30m));
Check.Equal((40.00m, "hazmat handling"), Q(hazmat), "a hazmat line is its own rate");
Check.Equal((40.00m, "hazmat handling"),
    Q(O(new Employee("ada", "Support"), Destination.International, ("HAZMAT-ACID", 1, 300m), ("OVERSIZE-DESK", 1, 200m))),
    "hazmat outranks oversize, the employee perk, free-over-$50 and international, all at once");
Check.Equal((0.00m, "empty order"), Q(O(new Guest(), Destination.Domestic)), "an empty basket is still empty first");
```

### ⭐⭐ 3. Discounts for buying in bulk (core)

Add `DiscountRules.VolumePercent(Order)` — 5% from 10 items, 10% from 20, 15% from 50, counted by `ItemCount` (units, not lines) — and `BestPercent(Order)` returning the better of the volume discount and the customer discount. They never stack: a customer gets one discount, the largest.

Practices: relational patterns on a computed property, and a second rule book combined with the first by an explicit policy ("best of", not "sum of").

Hint: the arms go biggest-first, because the first match wins: `{ ItemCount: >= 50 }` before `{ ItemCount: >= 20 }`. `Math.Max` is the combining policy.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
Check.Equal(0.00m, DiscountRules.VolumePercent(O(new Guest(), Destination.Domestic, ("PEN-1", 9, 1m))), "nine units earns nothing");
Check.Equal(0.05m, DiscountRules.VolumePercent(O(new Guest(), Destination.Domestic, ("PEN-1", 10, 1m))), "ten units earns 5%");
Check.Equal(0.10m, DiscountRules.VolumePercent(O(new Guest(), Destination.Domestic, ("PEN-1", 12, 1m), ("MUG-2", 8, 1m))),
    "units add up across lines");
Check.Equal(0.20m, DiscountRules.BestPercent(O(new Employee("ada", "Support"), Destination.Domestic, ("PEN-1", 10, 1m))),
    "staff 20% beats volume 5% — best of, never both");
Check.Equal(0.15m, DiscountRules.BestPercent(O(new Guest(), Destination.Domestic, ("PEN-1", 50, 1m))),
    "and volume wins when the customer has nothing");
```

### ⭐⭐ 4. Show your work (core)

Add `ShippingRules.Explain(Order order)` returning `IReadOnlyList<string>`: the names of **every** rule that matches, in rule order, not just the winning one. Support wants it for "why was I charged this?", and it is the fastest way to see an overlap you did not know about.

Practices: patterns as ordinary boolean expressions — `order is { HasOversize: true }` works in an `if`, not just in a `switch` — and the difference between "which rules apply" and "which rule wins".

Hint: a `List<string>`, then one `if (order is <pattern>) hits.Add("<rule name>");` per rule, in the same order as `Quote`'s arms. The winning rule is `Explain(order)[0]`, and asserting that in a test keeps the two lists honest.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var loaded = O(new Employee("ada", "Support"), Destination.International, ("BOOK-9", 2, 60m));
Check.Equal("employee perk,free over $50,international flat,standard parcel", string.Join(",", ShippingRules.Explain(loaded)),
    "four rules matched; the first one is the one that fired");
Check.Equal(ShippingRules.Quote(loaded).Rule, ShippingRules.Explain(loaded)[0], "Explain's first entry IS Quote's answer");
Check.Equal("letter rate,standard parcel", string.Join(",", ShippingRules.Explain(O(new Guest(), Destination.Domestic, ("PEN-1", 1, 8m)))),
    "the fallback always matches — it is the rule of last resort, not a non-rule");
```

### ⭐⭐⭐ 5. Rules as data (challenge)

Sometimes precedence has to be *configurable* — a rule table an operator can reorder without a rebuild. Add a `ShippingRule` record (`int Priority`, `string Name`, `Func<Order, bool> Matches`, `decimal Cost`), a `RuleTable.Default` array holding the eight rules, and `RuleTable.Apply(IEnumerable<ShippingRule> rules, Order order)` that returns the matching rule with the **lowest priority number**. Then prove it agrees with the switch on a sweep of orders — including when the array is shuffled.

Practices: knowing when to leave a language feature behind. Switch arms are precedence-as-position, which is perfect until precedence needs to be data.

Hint: `rules.Where(r => r.Matches(order)).OrderBy(r => r.Priority).First()`. Build each rule's `Matches` out of the patterns you already have: `o => o is { HasOversize: true }`.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var order = O(new Employee("ada", "Support"), Destination.International, ("BOOK-9", 2, 60m));
var winner = RuleTable.Apply(RuleTable.Default, order);
Check.Equal("employee perk", winner.Name, "lowest priority number wins");
Check.Equal(ShippingRules.Quote(order).Cost, winner.Cost, "and it costs what the switch says");
var shuffled = RuleTable.Default.Reverse().ToArray();
Check.Equal("employee perk", RuleTable.Apply(shuffled, order).Name, "the table's ORDER does not matter — its priorities do");
var reordered = RuleTable.Default.Select(r => r.Name == "free over $50" ? r with { Priority = 1 } : r).ToArray();
Check.Equal("free over $50", RuleTable.Apply(reordered, order).Name, "and re-prioritising is now a data change, not a code change");
```

### ⭐⭐⭐ 6. A little language of coupons (challenge)

Coupons compose: 10% off, $5 off, "the best of these two", "apply all of these in order". Model them as a record hierarchy and write `Coupons.Apply(Coupon coupon, decimal subtotal)` as a **recursive** switch expression — an interpreter in ten lines.

```csharp
public abstract record Coupon;
public sealed record PercentOff(decimal Fraction) : Coupon;
public sealed record AmountOff(decimal Amount) : Coupon;
public sealed record BestOf(IReadOnlyList<Coupon> Options) : Coupon;
public sealed record Stack(IReadOnlyList<Coupon> All) : Coupon;
```

Practices: recursive patterns over a tree, a list pattern nested inside a positional pattern, and the realisation that a switch expression over a record hierarchy *is* an interpreter for a small language.

Hint: `PercentOff(var f) => Math.Round(subtotal * (1 - f), 2)`; `BestOf(var options) => options.Min(o => Apply(o, subtotal))` (cheapest total is the best offer); `Stack(var all) => all.Aggregate(subtotal, (running, c) => Apply(c, running))` — each coupon applies to what the last one left. Guard the empty `BestOf([])` case *above* the general one, or `Min` throws.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
Check.Equal(85.00m, Coupons.Apply(new PercentOff(0.15m), 100m), "15% off");
Check.Equal(0m, Coupons.Apply(new AmountOff(150m), 100m), "a coupon can never make a total negative");
Check.Equal(85.00m, Coupons.Apply(new BestOf([new PercentOff(0.10m), new AmountOff(15m)]), 100m), "best of = cheapest result");
Check.Equal(85.50m, Coupons.Apply(new Stack([new PercentOff(0.10m), new AmountOff(4.50m)]), 100m), "stacked coupons apply in order");
Check.Equal(100m, Coupons.Apply(new BestOf([]), 100m), "an empty BestOf is not a crash");
Check.Equal(76.50m, Coupons.Apply(new BestOf([new Stack([new PercentOff(0.10m), new PercentOff(0.15m)]), new AmountOff(20m)]), 100m),
    "and the whole thing nests: a Stack inside a BestOf");
```

## Solutions

### 1. Name the customer

```csharp
/// One arm per customer shape. Note the ORDER: Member(_, 0) is more specific
/// than Member(var name, var years), so it has to come first or it never fires.
public static string Label(Customer customer) => customer switch
{
    Employee(var name, var dept) => $"{name} (staff, {dept})",
    Member(_, 0) => "a new member",
    Member(var name, var years) => $"{name} (member, {years} yrs)",
    Guest => "a guest",
    _ => "someone",
};
```

WHY: positional patterns let one line ask "which type?" and "what is inside?" and bind the parts it wants — the `is` + cast + property-read trio of the original, compressed into a pattern. The `Member(_, 0)` / `Member(var name, var years)` pair is the whole precedence lesson in miniature: swap the two lines and the specific rule becomes dead code, with no error and no warning, because both arms are reachable and the compiler has no idea which one you meant. That is why every switch in this project is written specific-first, and why the tests pin the specific cases.

### 2. A rule that beats everything

```csharp
// Domain.cs — Order grows one computed property, next to HasOversize:
public bool HasHazmat => Lines.Any(l => l.Sku.StartsWith("HAZMAT-", StringComparison.Ordinal));

// Rules.cs — one constant and one arm, in second place:
public const decimal HazmatFee = 40.00m;

{ Lines: [] } => new(0.00m, "empty order"),
{ HasHazmat: true } => new(HazmatFee, "hazmat handling"),      // ⬅ beats everything below
{ HasOversize: true } => new(OversizeFee, "oversize freight"),
// ...the other six arms are untouched
```

WHY: the entire change is one line in one place, and *which* line it is says everything about the rule. In the original, adding this rule meant choosing a nesting depth in a seven-deep `if`, and the choice would have been invisible in review — here the diff literally shows the rule sitting above the ones it outranks. The `StringComparison.Ordinal` is the same habit as `IsOversize`: SKUs are identifiers, so they compare byte-for-byte, never by culture rules. And note the overlap test doing four jobs at once (hazmat vs oversize vs employee vs international): the moment a rule claims to beat "everything", one test should try to make it lose.

### 3. Discounts for buying in bulk

```csharp
/// Volume is about UNITS, not lines: 12 pens and 8 mugs is 20 items.
public static decimal VolumePercent(Order order) => order switch
{
    { ItemCount: >= 50 } => 0.15m,
    { ItemCount: >= 20 } => 0.10m,
    { ItemCount: >= 10 } => 0.05m,
    _ => 0.00m,
};

/// The policy, stated once: a customer gets ONE discount — the best one.
public static decimal BestPercent(Order order) =>
    Math.Max(PercentFor(order.Customer), VolumePercent(order));
```

WHY: relational patterns must go biggest-first for the same reason `Member(_, 0)` goes above `Member(...)` — the first match wins, so `>= 10` written first would swallow every larger order at 5%. `BestPercent` is the more interesting line: two independent rule books meeting is a *policy decision* (best-of? sum? cap?) and giving it a name and a home means the answer is written down once instead of being re-decided at every call site. Summing them would have been the tempting version, and it is how shops accidentally ship 45%-off coupons.

### 4. Show your work

```csharp
/// Every rule that MATCHES, in rule order. Explain(order)[0] is always the
/// rule Quote fired — the same list, read differently.
public static IReadOnlyList<string> Explain(Order order)
{
    var hits = new List<string>();
    if (order is { Lines: [] }) hits.Add("empty order");
    if (order is { HasOversize: true }) hits.Add("oversize freight");
    if (order is { Customer: Employee }) hits.Add("employee perk");
    if (order is { Customer: Member(_, >= 5) }) hits.Add("loyalty 5+ years");
    if (order is { Subtotal: > FreeShippingFrom }) hits.Add("free over $50");
    if (order is { Ship: Destination.International }) hits.Add("international flat");
    if (order is { Lines: [{ Quantity: 1 }], Subtotal: <= 10.00m }) hits.Add("letter rate");
    hits.Add("standard parcel");        // the rule of last resort always matches
    return hits;
}
```

WHY: the point of the exercise is the first half of each line — a pattern is an *expression*, so `order is { HasOversize: true }` is a `bool` you can use anywhere, and the same patterns that make up the switch can be reused as predicates without restating them as `if (order.Lines.Any(l => l.Sku.StartsWith(...)))`. The output is genuinely useful (support tickets, audit trails, "why is shipping free?"), and the test `Explain(order)[0] == Quote(order).Rule` is the kind of cross-check that catches the two lists drifting apart — which they will, the first time somebody adds a rule to one and not the other. If that worries you, exercise 5 is the version where there is only one list.

### 5. Rules as data

```csharp
public sealed record ShippingRule(int Priority, string Name, Func<Order, bool> Matches, decimal Cost);

public static class RuleTable
{
    /// The same eight rules, with precedence as a NUMBER instead of a position.
    public static readonly ShippingRule[] Default =
    [
        new(1, "empty order",        o => o is { Lines: [] },                                     0.00m),
        new(2, "oversize freight",   o => o is { HasOversize: true },                             ShippingRules.OversizeFee),
        new(3, "employee perk",      o => o is { Customer: Employee },                            0.00m),
        new(4, "loyalty 5+ years",   o => o is { Customer: Member(_, >= 5) },                     0.00m),
        new(5, "free over $50",      o => o is { Subtotal: > ShippingRules.FreeShippingFrom },    0.00m),
        new(6, "international flat", o => o is { Ship: Destination.International },               ShippingRules.InternationalFee),
        new(7, "letter rate",        o => o is { Lines: [{ Quantity: 1 }], Subtotal: <= 10.00m }, ShippingRules.LetterFee),
        new(8, "standard parcel",    o => true,                                                   ShippingRules.StandardFee),
    ];

    /// Lowest priority number among the matches wins — so the ARRAY's order
    /// is irrelevant, which is exactly what makes the table safe to reorder.
    public static ShippingRule Apply(IEnumerable<ShippingRule> rules, Order order) =>
        rules.Where(r => r.Matches(order)).OrderBy(r => r.Priority).First();
}
```

WHY: this is the trade-off worth understanding rather than the "better" answer. The switch is faster, is checked by the compiler, and reads like the spec; the table can be reordered, re-priced, serialised, edited by a non-programmer, or loaded from configuration (cs#22) — at the cost of every rule becoming a lambda the compiler cannot reason about. Real systems use both: a switch until somebody says "can we change the freight threshold without a deploy?", then a table. Notice that the *patterns survive the move* — each `Matches` is one `is` expression — and that `r with { Priority = 1 }` reprioritises a rule without touching the others, because records are immutable (cs#07).

### 6. A little language of coupons

```csharp
public static class Coupons
{
    /// An interpreter: one arm per shape of the tree, and two of them recurse.
    public static decimal Apply(Coupon coupon, decimal subtotal) => coupon switch
    {
        PercentOff(var fraction) => Math.Round(subtotal * (1 - fraction), 2),
        AmountOff(var amount) => Math.Max(0m, subtotal - amount),
        BestOf([]) => subtotal,                                             // nothing on offer
        BestOf(var options) => options.Min(o => Apply(o, subtotal)),        // cheapest result wins
        Stack(var all) => all.Aggregate(subtotal, (running, c) => Apply(c, running)),
        _ => subtotal,
    };
}
```

WHY: `BestOf([])` is a list pattern nested inside a positional pattern, and it must sit above `BestOf(var options)` or `Min` throws on the empty case — the specific-before-general rule again, now protecting against an exception rather than a wrong price. The two recursive arms are what make this a *language* instead of a settings object: a `Stack` inside a `BestOf` inside a `Stack` is a perfectly ordinary value, and `Apply` handles arbitrary nesting without any extra code. This shape — an `abstract record` family plus one recursive switch expression — is how you write expression evaluators, query builders, layout engines and validation DSLs; recognising it is a large part of what "thinking in types" buys you. Note also `Math.Max(0m, ...)`: coupons that make a total negative are the classic e-commerce refund bug, and it costs one function call to make it unrepresentable.
