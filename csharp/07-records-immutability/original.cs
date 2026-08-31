// 07 — Shopping cart, original (flawed) version.
// CartItem is a mutable class. Watch a harmless "10% off preview" corrupt
// the real cart — permanently.
// Run from repo root:  dotnet run csharp/07-records-immutability/original.cs

using System;
using System.Collections.Generic;

var cart = new List<CartItem>
{
    new CartItem { Name = "Coffee beans", Price = 10.35m, Qty = 3 },
    new CartItem { Name = "Chocolate bar", Price = 2.20m, Qty = 2 },
    new CartItem { Name = "Mug", Price = 8.00m, Qty = 1 },
};

Console.WriteLine("=== Your cart ===");
PrintCart(cart);
Console.WriteLine($"Total: {Total(cart):0.00}");

// The customer hovers over a "SAVE10" coupon — show a preview of the discount.
Console.WriteLine();
Console.WriteLine("=== Preview: with coupon SAVE10 (10% off) ===");
var preview = new List<CartItem>(cart);  // "a copy of the cart"... is it?
foreach (var item in preview)
{
    item.Price = item.Price * 0.90m;     // adjust prices "just for the preview"
}
PrintCart(preview);
Console.WriteLine($"Preview total: {Total(preview):0.00}");

// The customer closes the preview WITHOUT applying the coupon...
Console.WriteLine();
Console.WriteLine("=== Back to your cart (coupon NOT applied) ===");
PrintCart(cart);
Console.WriteLine($"Total: {Total(cart):0.00}   <- should still be 43.45. It isn't.");

Console.WriteLine();
Console.WriteLine("new List<CartItem>(cart) copied the LIST, but both lists still point");
Console.WriteLine("at the SAME three CartItem objects — mutating the preview's items");
Console.WriteLine("mutated the real cart. (Project 02 met this aliasing bug with names;");
Console.WriteLine("here it quietly changes what the customer pays.)");

decimal Total(List<CartItem> items)
{
    decimal sum = 0m;
    foreach (var item in items)
    {
        sum += item.Price * item.Qty;
    }
    return sum;
}

void PrintCart(List<CartItem> items)
{
    foreach (var item in items)
    {
        Console.WriteLine($"  {item.Qty} x {item.Name,-14} @ {item.Price,6:0.00}");
    }
}

class CartItem
{
    public string Name = "";
    public decimal Price;  // public and mutable: anyone can change it, any time
    public int Qty;
}
