public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("Point — records have value semantics");
        Check.True(new Point(1, 2) == new Point(1, 2), "same data compares equal with ==");
        Check.Equal(new Point(1, 2), new Point(1, 2), "Equals agrees (Check.Equal relies on it)");
        Check.True(new Point(1, 2) != new Point(1, 3), "different data compares unequal");

        Console.WriteLine("`with` — copies are really copies");
        var home = new Point(1, 2);
        var moved = home with { X = 99 };
        Check.Equal(1, home.X, "original untouched after `with` copy is changed");
        Check.Equal(99, moved.X, "copy carries the change");
        Check.Equal(2, moved.Y, "copy keeps every field it didn't change");
        var clone = home with { };
        Check.Equal(home, clone, "with { } clone is equal by value...");
        Check.True(!ReferenceEquals(home, clone), "...but is a genuinely separate object");

        Console.WriteLine("Order — computed total and discount copies");
        var mug = new Order("Mug", Quantity: 2, UnitPrice: 8.00m);
        Check.Equal(16.00m, mug.Total, "2 x 8.00 = 16.00");
        var cheap = mug.WithDiscount(50);
        Check.Equal(4.00m, cheap.UnitPrice, "discount halves the copy's price");
        Check.Equal(8.00m, mug.UnitPrice, "original price untouched — WithDiscount is pure");
        Check.Equal(0m, mug.WithDiscount(100).Total, "100% discount makes the copy free");

        Console.WriteLine("Cart — duplicating then discounting one line");
        var cart = new Cart();
        cart.Add(new Order("Mug", 2, 8.00m));
        cart.Add(new Order("T-shirt", 1, 15.00m));
        cart.DuplicateLine(0);
        Check.Equal(3, cart.Lines.Count, "duplicate adds a third line");
        Check.Equal(47.00m, cart.Total(), "total before discount: 16 + 15 + 16");
        cart.DiscountLine(0, 50);
        Check.Equal(39.00m, cart.Total(), "discounting line 1 does NOT hit its duplicate");
        Check.Equal(8.00m, cart.Lines[2].UnitPrice, "line 3 keeps the full price");
        Check.Equal(4.00m, cart.Lines[0].UnitPrice, "line 1 got the discount");

        Console.WriteLine("Struct — assignment copies automatically");
        var p1 = new Pixel { X = 1, Y = 2 };
        var p2 = p1;      // whole value copied, not a reference
        p2.X = 99;
        Check.Equal(1, p1.X, "changing the struct copy leaves the original alone");
        Check.Equal(99, p2.X, "the copy took the change");

        return Check.Summary();
    }
}
