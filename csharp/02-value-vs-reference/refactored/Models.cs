// The data types. Records make "copies that are really copies" trivial,
// and immutability makes accidental sharing harmless.

// A record: equality by VALUE, copies via `with`, properties read-only by default.
public record Point(int X, int Y);

// An order line. You can't mutate it after creation — to "change" it you build
// a modified copy with `with`. That single fact kills every bug in original.cs.
public record Order(string Product, int Quantity, decimal UnitPrice)
{
    public decimal Total => Quantity * UnitPrice;

    public Order WithDiscount(decimal percent) =>
        this with { UnitPrice = UnitPrice * (1 - percent / 100m) };
}

// A struct, for contrast: a VALUE type. Assignment copies the whole thing
// automatically — no sharing is even possible. (int, bool, decimal, DateTime
// are all structs under the hood.)
public struct Pixel
{
    public int X;
    public int Y;
}
