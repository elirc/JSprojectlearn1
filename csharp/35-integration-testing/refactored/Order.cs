// The domain. Records, `decimal`, and one pure function that owns every
// arithmetic decision in the application.

public record OrderLine(string Sku, int Qty, decimal UnitPrice);

public record Order(
    int Id,
    IReadOnlyList<OrderLine> Lines,
    decimal Subtotal,
    decimal Tax,
    decimal Total);

// The shapes HTTP sends us, kept separate from the domain (cs#17). Everything
// here is nullable or unvalidated on purpose: this is what a stranger typed.
public record NewOrderLine(string? Sku, int Qty, decimal UnitPrice);
public record NewOrder(List<NewOrderLine>? Lines);

public static class Totals
{
    public const decimal TaxRate = 0.08m;

    /// THE INVARIANT THIS FUNCTION EXISTS TO GUARANTEE:
    ///
    ///     Subtotal + Tax == Total,   exactly, for every possible input.
    ///
    /// The original could not promise that, because it rounded the total and
    /// left the pieces unrounded — so the response showed three numbers that
    /// did not add up, and every screen that re-derived one of them from the
    /// others disagreed with every screen that didn't.
    ///
    /// The order of operations is the whole trick: round each LINE, sum the
    /// rounded lines, round the tax, and then add two already-rounded numbers.
    /// Adding rounded values can never need rounding again, so the total is
    /// exact by construction rather than by luck.
    ///
    /// Rounding per line (rather than only at the end) matters for a duller
    /// reason: the invoice PRINTS line totals, and the printed lines must add
    /// up to the printed subtotal. A customer with a calculator is a test suite.
    public static (decimal Subtotal, decimal Tax, decimal Total) For(IReadOnlyList<OrderLine> lines)
    {
        var subtotal = lines.Sum(line => Money.Round(line.Qty * line.UnitPrice));
        var tax = Money.Round(subtotal * TaxRate);
        var total = subtotal + tax;
        return (subtotal, tax, total);
    }
}

public static class OrderRules
{
    public const int MaxLines = 100;

    /// Every problem at once, named by line number, with no HTTP anywhere in
    /// sight — so the tests for it never start a server (cs#17, cs#22).
    public static IReadOnlyList<string> Validate(NewOrder? dto)
    {
        var errors = new List<string>();

        if (dto?.Lines is null || dto.Lines.Count == 0)
        {
            errors.Add("an order needs at least one line");
            return errors;                        // every other rule would be noise
        }

        if (dto.Lines.Count > MaxLines)
            errors.Add($"an order may have at most {MaxLines} lines");

        for (int i = 0; i < dto.Lines.Count; i++)
        {
            var line = dto.Lines[i];
            if (string.IsNullOrWhiteSpace(line.Sku)) errors.Add($"line {i + 1}: sku is required");
            if (line.Qty <= 0) errors.Add($"line {i + 1}: qty must be greater than 0");
            if (line.UnitPrice < 0) errors.Add($"line {i + 1}: unitPrice must not be negative");
        }

        return errors;
    }

    /// Only ever called with a `dto` that Validate approved, which is why the
    /// `!` here is honest rather than hopeful (cs#05).
    public static IReadOnlyList<OrderLine> ToLines(NewOrder dto)
        => dto.Lines!.Select(l => new OrderLine(l.Sku!.Trim(), l.Qty, l.UnitPrice)).ToList();
}
