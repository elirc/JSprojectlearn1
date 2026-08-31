// The cart OWNS its list (defensive copy in, read-only view out) and its
// orders are immutable records, so no outside code can alias its internals.
public class Cart
{
    private readonly List<Order> _lines = new();

    // Expose a read-only VIEW — callers can look, but can't Add/Remove behind our back.
    public IReadOnlyList<Order> Lines => _lines;

    public void Add(Order order) => _lines.Add(order);

    // `with { }` (no changes listed) clones the record. Because records are
    // immutable this is belt-and-braces — but it documents the intent: a NEW line.
    public void DuplicateLine(int index) => _lines.Add(_lines[index] with { });

    // Discounting REPLACES one slot with a modified copy. Even if two slots
    // once pointed at the same record, only this slot changes.
    public void DiscountLine(int index, decimal percent) =>
        _lines[index] = _lines[index].WithDiscount(percent);

    public decimal Total()
    {
        decimal sum = 0;
        foreach (var line in _lines) sum += line.Total;
        return sum;
    }
}
