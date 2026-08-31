// The rule book, as one switch expression per question. Read the arms top to
// bottom and you are reading the table in README.md, in the same order, with
// the same words. That is the entire refactor: the code and the spec became
// the same document.
//
// Pattern vocabulary used below:
//   { Lines: [] }                 property pattern + LIST pattern (empty list)
//   { HasOversize: true }         property pattern on a computed property
//   { Customer: Employee }        TYPE pattern nested inside a property pattern
//   Member(_, >= 5)               POSITIONAL pattern + RELATIONAL pattern
//   { Subtotal: > 50m }           relational pattern on a decimal
//   [{ Quantity: 1 }]             list pattern whose single element is matched
//   [first, .., last]             list pattern with a slice in the middle

public static class ShippingRules
{
    public const decimal OversizeFee = 24.00m;
    public const decimal InternationalFee = 19.50m;
    public const decimal LetterFee = 1.95m;
    public const decimal StandardFee = 4.95m;
    public const decimal FreeShippingFrom = 50.00m;

    /// The eight rules from the README, in the README's order. Arms are tried
    /// top to bottom, so POSITION IS PRECEDENCE — which is why the specific
    /// rules (empty, oversize, staff) come before the general ones (free over
    /// $50, international, standard). The original had the same eight rules in
    /// a different order and no way to notice.
    public static ShippingQuote Quote(Order order) => order switch
    {
        // 1. Nothing to ship, nothing to charge.
        { Lines: [] } => new(0.00m, "empty order"),

        // 2. Freight beats every perk: a pallet costs what a pallet costs.
        //    THIS is the arm the original buried under "free over $50".
        { HasOversize: true } => new(OversizeFee, "oversize freight"),

        // 3. Staff ship free.
        { Customer: Employee } => new(0.00m, "employee perk"),

        // 4. Members of five years or more ship free. `>= 5`, right where you
        //    can read it against the spec — no flag computed twenty lines away.
        { Customer: Member(_, >= 5) } => new(0.00m, "loyalty 5+ years"),

        // 5. Free over $50 (strictly above; $50.00 exactly still pays).
        { Subtotal: > FreeShippingFrom } => new(0.00m, "free over $50"),

        // 6. Off the island.
        { Ship: Destination.International } => new(InternationalFee, "international flat"),

        // 7. One line, one item, ten dollars or less: it fits in an envelope.
        { Lines: [{ Quantity: 1 }], Subtotal: <= 10.00m } => new(LetterFee, "letter rate"),

        // 8. Everything else.
        _ => new(StandardFee, "standard parcel"),
    };

    /// The same rule book asked a different way: "would this order ship free?"
    /// A pattern is an expression, so it composes — no second copy of the rules.
    public static bool ShipsFree(Order order) => Quote(order) is { Cost: 0.00m };
}

public static class DiscountRules
{
    /// Percentage off the subtotal, by customer. Positional patterns let one
    /// line ask two questions: "is it an Employee?" AND "which department?".
    /// The original needed `is` + a cast + a nested if for the same sentence.
    public static decimal PercentFor(Customer customer) => customer switch
    {
        Employee(_, "Warehouse") => 0.30m,   // `_` = don't care about the name
        Employee => 0.20m,                   // any other department
        Member(_, >= 10) => 0.15m,
        Member(_, >= 5) => 0.10m,
        Member(_, >= 1) => 0.05m,
        Member => 0.00m,                     // first-year member: nothing yet
        Guest => 0.00m,
        _ => 0.00m,                          // a customer type nobody has written yet
    };

    /// Combining patterns: `and`, `or`, `not` work on patterns, not just bools,
    /// so "a guest, or a brand-new member" is one readable line.
    public static bool IsNewCustomer(Customer customer) =>
        customer is Guest or Member(_, 0);

    public static decimal Total(Order order) =>
        order.Subtotal * (1 - PercentFor(order.Customer)) + ShippingRules.Quote(order).Cost;
}

public static class OrderText
{
    /// LIST PATTERNS describe the SHAPE of a sequence. `..` is a slice: "any
    /// number of elements here, including none". `[first, .., last]` therefore
    /// means "two or more, and I want the ends".
    public static string Describe(Order order) => order.Lines switch
    {
        [] => "an empty order",
        [var only] => $"one line: {only.Quantity} x {only.Sku}",
        [var a, var b] => $"two lines: {a.Sku} and {b.Sku}",
        [var first, .., var last] => $"{order.Lines.Count} lines, from {first.Sku} to {last.Sku}",
    };

    /// Patterns can also match POSITION inside a list. This one is a rule a
    /// warehouse really has: a freight item must be the first line on the slip.
    public static bool FreightIsFirst(Order order) => order.Lines switch
    {
        [] => false,
        [{ IsOversize: true }, ..] => true,
        _ => false,
    };
}
