public static class Tests
{
    static List<CartItem> SampleCart() => new()
    {
        new("Coffee beans", 10.35m, 3),
        new("Chocolate bar", 2.20m, 2),
        new("Mug", 8.00m, 1),
    };

    public static int Run()
    {
        Console.WriteLine("Totals:");
        Check.Equal(43.45m, CartMath.Total(SampleCart()), "cart total is exact");
        Check.Equal(0m, CartMath.Total(new List<CartItem>()), "empty cart totals zero");
        Check.Equal(31.05m, new CartItem("Coffee beans", 10.35m, 3).LineTotal, "line total = price x qty");

        Console.WriteLine("Discounts return NEW carts (no mutation):");
        var cart = SampleCart();
        var discounted = CartMath.ApplyDiscount(cart, 10m);
        Check.Equal(39.12m, CartMath.Total(discounted), "10% off, rounded per line item");
        Check.Equal(43.45m, CartMath.Total(cart), "ORIGINAL cart total unchanged after discount");
        Check.Equal(10.35m, cart[0].Price, "original item price untouched");
        Check.Equal(9.32m, discounted[0].Price, "discounted copy has the new price");
        Check.True(!ReferenceEquals(cart[0], discounted[0]), "discounted item is a different object, not the same one edited");
        Check.Equal(43.45m, CartMath.Total(CartMath.ApplyDiscount(cart, 0m)), "0% discount changes nothing");
        Check.Throws<ArgumentOutOfRangeException>(() => CartMath.ApplyDiscount(cart, 150m), "150% discount is rejected");

        Console.WriteLine("Coupons (init-only record):");
        var coupon = new Coupon { Code = "SAVE10", Percent = 10m };
        Check.Equal(39.12m, CartMath.Total(CartMath.ApplyCoupon(cart, coupon)), "coupon applies its percent");

        Console.WriteLine("`with` expressions:");
        var mug = new CartItem("Mug", 8.00m, 1);
        var twoMugs = mug with { Qty = 2 };
        Check.Equal(2, twoMugs.Qty, "the copy has the new Qty");
        Check.Equal("Mug", twoMugs.Name, "the copy keeps every other property");
        Check.Equal(1, mug.Qty, "the source of a `with` is unchanged");

        Console.WriteLine("Records compare by content:");
        Check.True(new CartItem("Mug", 8.00m, 1) == mug, "same content == equal (JS objects never do this)");
        Check.True(mug != twoMugs, "different content != equal");

        Console.WriteLine("decimal is exact where double is not:");
        Check.Equal(0.3m, 0.1m + 0.2m, "decimal: 0.1 + 0.2 == 0.3, exactly");
        Check.True(0.1 + 0.2 != 0.3, "double: 0.1 + 0.2 != 0.3 (binary dust — see LEARN.md)");
        Check.Equal(1.01m, CartMath.RoundMoney(1.005m), "rounding policy: halves go away from zero");

        return Check.Summary();
    }
}
