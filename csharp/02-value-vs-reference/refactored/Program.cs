if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

// Same three scenarios as original.cs — no surprises this time.

Console.WriteLine("=== 1: a copy that IS a copy ===");
var home = new Point(1, 2);
var backup = home with { X = 99 };   // build a changed COPY; `home` untouched
Console.WriteLine($"home:   {home}");
Console.WriteLine($"backup: {backup}");

Console.WriteLine();
Console.WriteLine("=== 2: no shared mutable defaults — records can't be mutated ===");
var mug = new Order("Mug", Quantity: 2, UnitPrice: 8.00m);
var tee = new Order("T-shirt", Quantity: 1, UnitPrice: 15.00m);
Console.WriteLine($"mug: {mug}, line total {mug.Total:0.00}");
Console.WriteLine($"tee: {tee}, line total {tee.Total:0.00}");

Console.WriteLine();
Console.WriteLine("=== 3: duplicate a line, discount ONE line, total stays honest ===");
var cart = new Cart();
cart.Add(mug);
cart.Add(tee);
cart.DuplicateLine(0);                       // a real second mug line
Console.WriteLine($"3 lines, total: {cart.Total():0.00}   (16 + 15 + 16 = 47.00)");
cart.DiscountLine(0, 50);                    // 50% off line 1 ONLY
Console.WriteLine($"after 50% off line 1: {cart.Total():0.00}   (8 + 15 + 16 = 39.00)");
Console.WriteLine($"line 3 untouched: {cart.Lines[2]}");

Console.WriteLine();
Console.WriteLine("Bonus — records compare by VALUE, like you always wished JS objects did:");
Console.WriteLine($"new Point(1,2) == new Point(1,2)  ->  {new Point(1, 2) == new Point(1, 2)}");
