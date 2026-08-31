// A record: immutable by default, compared by CONTENT, copied with `with`.
// Nobody can reach in and change a price — "changing" an item means making
// a new one, which is exactly what keeps previews from corrupting carts.
public record CartItem(string Name, decimal Price, int Qty)
{
    public decimal LineTotal => Price * Qty;
}

// A record with init-only properties instead of positional parameters —
// the other way to write a record. `init` means "settable ONLY while the
// object is being created", so a Coupon can't change after it exists.
public record Coupon
{
    public string Code { get; init; } = "";
    public decimal Percent { get; init; }  // 10 means 10% off
}
