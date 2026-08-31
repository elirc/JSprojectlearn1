// The nouns. Records (cs#07) are what make the rules in Rules.cs readable:
// a positional record gets a compiler-generated Deconstruct, which is exactly
// what a POSITIONAL PATTERN — `Member(_, >= 5)` — calls behind the scenes.

public enum Destination { Domestic, International }

public sealed record OrderLine(string Sku, int Quantity, decimal UnitPrice)
{
    public decimal LineTotal => Quantity * UnitPrice;

    /// Freight items are flagged by SKU prefix. Ordinal (not culture-aware)
    /// comparison, because a SKU is an identifier, not prose.
    public bool IsOversize => Sku.StartsWith("OVERSIZE-", StringComparison.Ordinal);
}

public sealed record Order(Customer Customer, IReadOnlyList<OrderLine> Lines, Destination Ship)
{
    public decimal Subtotal => Lines.Sum(l => l.LineTotal);
    public int ItemCount => Lines.Sum(l => l.Quantity);
    public bool HasOversize => Lines.Any(l => l.IsOversize);
}

/// A small closed family of customer types. `abstract record` + sealed
/// subrecords is C#'s discriminated union (ts#12's tagged union, cs#06's enum
/// idea grown up): a value is exactly one of these, and patterns can ask which.
public abstract record Customer;
public sealed record Guest() : Customer;
public sealed record Member(string Name, int Years) : Customer;
public sealed record Employee(string Name, string Department) : Customer;

/// A price AND the rule that produced it. Returning the reason is what makes
/// the rule book testable — "$0.00" alone cannot tell you WHICH free-shipping
/// rule fired, so it cannot catch a rule firing for the wrong reason.
public sealed record ShippingQuote(decimal Cost, string Rule);
