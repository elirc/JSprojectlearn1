if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

// Demo: the exact scenario that corrupted the original's cart — now harmless.
var cart = new List<CartItem>
{
    new("Coffee beans", 10.35m, 3),
    new("Chocolate bar", 2.20m, 2),
    new("Mug", 8.00m, 1),
};

Console.WriteLine("=== Your cart ===");
PrintCart(cart);
Console.WriteLine($"Total: {CartMath.Total(cart):0.00}");

Console.WriteLine();
Console.WriteLine("=== Preview: with coupon SAVE10 (10% off) ===");
var coupon = new Coupon { Code = "SAVE10", Percent = 10m };
var preview = CartMath.ApplyCoupon(cart, coupon);  // a NEW cart of NEW items
PrintCart(preview);
Console.WriteLine($"Preview total: {CartMath.Total(preview):0.00}");

Console.WriteLine();
Console.WriteLine("=== Back to your cart (coupon NOT applied) ===");
PrintCart(cart);
Console.WriteLine($"Total: {CartMath.Total(cart):0.00}   <- still 43.45. The preview couldn't touch it.");

Console.WriteLine();
Console.WriteLine("=== Records in 20 seconds ===");
var mug = new CartItem("Mug", 8.00m, 1);
var twoMugs = mug with { Qty = 2 };            // copy with ONE change
Console.WriteLine($"mug:     {mug}");           // records print themselves nicely
Console.WriteLine($"twoMugs: {twoMugs}");
Console.WriteLine($"mug unchanged? {mug.Qty == 1}");
Console.WriteLine($"value equality: {new CartItem("Mug", 8.00m, 1) == mug} (same content = equal)");

void PrintCart(List<CartItem> items)
{
    foreach (var item in items)
    {
        Console.WriteLine($"  {item.Qty} x {item.Name,-14} @ {item.Price,6:0.00}");
    }
}
