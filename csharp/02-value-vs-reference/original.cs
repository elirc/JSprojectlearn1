// A tiny order system — written by someone who assumes `=` makes a copy.
// Run from the repo root:
//   dotnet run csharp/02-value-vs-reference/original.cs
//
// It runs fine. No crash, no error. But watch the totals: three of the numbers
// it prints are "wrong" — or rather, they're right, and the AUTHOR is wrong
// about what the code does. The aliasing bug IS the lesson.
#nullable disable   // older codebases run with null-checking off — project 05 turns it on

Console.WriteLine("=== Surprise 1: a 'copy' that isn't ===");
var home = new Point { X = 1, Y = 2 };
var backup = home;          // "save a copy before I experiment"... except it isn't a copy
backup.X = 99;              // "only changing the backup"
Console.WriteLine($"home.X   should still be 1... it is: {home.X}");
Console.WriteLine($"backup.X was set to 99....... it is: {backup.X}");

Console.WriteLine();
Console.WriteLine("=== Surprise 2: one shared 'default' leaks everywhere ===");
var defaultTags = new List<string> { "new" };
var mug = new Order { Product = "Mug", Quantity = 2, UnitPrice = 8.00m, Tags = defaultTags };
var tee = new Order { Product = "T-shirt", Quantity = 1, UnitPrice = 15.00m, Tags = defaultTags };
mug.Tags.Add("gift-wrap");  // customer wants ONLY the mugs gift-wrapped
Console.WriteLine($"mug tags: {string.Join(", ", mug.Tags)}");
Console.WriteLine($"tee tags: {string.Join(", ", tee.Tags)}   <- who asked to wrap the t-shirt?!");

Console.WriteLine();
Console.WriteLine("=== Surprise 3: 'duplicating' an order aliases it ===");
var orders = new List<Order>();
orders.Add(mug);
orders.Add(tee);
orders.Add(mug);            // "customer ordered the mug line twice" — same object, twice!
Console.WriteLine($"3 order lines, total: {Total(orders):0.00}  (2x8 + 15 + 2x8 = 47.00, ok so far)");

// Now apply a 50% discount to the FIRST line only...
orders[0].UnitPrice = orders[0].UnitPrice / 2;
Console.WriteLine($"after 50% off line 1: {Total(orders):0.00}  (expected 39.00: 8 + 15 + 16)");
Console.WriteLine("...but line 3 IS line 1, so the discount hit both. We just gave money away.");

decimal Total(List<Order> list)
{
    decimal sum = 0;
    foreach (var o in list) sum += o.Quantity * o.UnitPrice;
    return sum;
}

class Point
{
    public int X;
    public int Y;
}

class Order
{
    public string Product;
    public int Quantity;
    public decimal UnitPrice;
    public List<string> Tags;
}
