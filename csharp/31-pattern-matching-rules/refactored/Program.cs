if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

// Program.cs — the same eight orders the original priced, run through the
// switch-expression rule book. Same rules, same order as the README table,
// and this time the table and the code cannot drift apart: they ARE the
// same eight lines.

var cases = new (string What, Order Order, decimal Expected, string Rule)[]
{
    ("guest, one $8 pen, domestic",          MakeOrder(new Guest(), Destination.Domestic, ("PEN-1", 1, 8m)), 1.95m, "letter rate"),
    ("guest, 3 x $6 mugs, domestic",         MakeOrder(new Guest(), Destination.Domestic, ("MUG-2", 3, 6m)), 4.95m, "standard parcel"),
    ("guest, 3 x $6 mugs, international",    MakeOrder(new Guest(), Destination.International, ("MUG-2", 3, 6m)), 19.50m, "international flat"),
    ("guest, $120 of books, domestic",       MakeOrder(new Guest(), Destination.Domestic, ("BOOK-9", 2, 60m)), 0m, "free over $50"),
    ("employee, $30 of mugs, international", MakeOrder(new Employee("ada", "Support"), Destination.International, ("MUG-2", 5, 6m)), 0m, "employee perk"),
    ("member of 5 years, $12 of mugs",       MakeOrder(new Member("grace", 5), Destination.Domestic, ("MUG-2", 2, 6m)), 0m, "loyalty 5+ years"),
    ("guest, $200 OVERSIZE desk, domestic",  MakeOrder(new Guest(), Destination.Domestic, ("OVERSIZE-DESK", 1, 200m)), 24m, "oversize freight"),
    ("member of 1 year, empty basket",       MakeOrder(new Member("linus", 1), Destination.Domestic), 0m, "empty order"),
};

Console.WriteLine("=== the shipping rule book, applied ===");
Console.WriteLine("order                                    spec says              code says");
int wrong = 0;
foreach (var c in cases)
{
    var quote = ShippingRules.Quote(c.Order);
    bool ok = quote.Cost == c.Expected && quote.Rule == c.Rule;
    if (!ok) wrong++;
    string spec = $"${c.Expected:0.00} {c.Rule}";
    string got = $"${quote.Cost:0.00} {quote.Rule}";
    Console.WriteLine($"{c.What,-40} {spec,-22} {got,-22}{(ok ? "" : "   <-- BUG")}");
}
Console.WriteLine($"{wrong} of {cases.Length} orders priced wrong. (The original got 2 wrong.)");

Console.WriteLine();
Console.WriteLine("=== the two order bugs, now unwritable ===");
var desk = MakeOrder(new Guest(), Destination.Domestic, ("OVERSIZE-DESK", 1, 200m));
Console.WriteLine($"$200 oversize desk : {ShippingRules.Quote(desk)}");
Console.WriteLine("  the oversize arm is ABOVE the free-over-$50 arm, and you can see that");
Console.WriteLine("  by looking at the two lines — precedence is position, position is visible.");
var five = MakeOrder(new Member("grace", 5), Destination.Domestic, ("MUG-2", 2, 6m));
var four = MakeOrder(new Member("hedy", 4), Destination.Domestic, ("MUG-2", 2, 6m));
Console.WriteLine($"member of 5 years  : {ShippingRules.Quote(five)}");
Console.WriteLine($"member of 4 years  : {ShippingRules.Quote(four)}");
Console.WriteLine("  `Member(_, >= 5)` sits in the same line as the decision it drives —");
Console.WriteLine("  no bool computed twenty lines earlier to get the boundary wrong in.");

Console.WriteLine();
Console.WriteLine("=== discounts: one line per rule ===");
foreach (Customer c in new Customer[]
         { new Employee("ada", "Warehouse"), new Employee("bob", "Support"),
           new Member("grace", 10), new Member("hedy", 5), new Member("linus", 2),
           new Member("new", 0), new Guest() })
{
    Console.WriteLine($"  {c,-47} {DiscountRules.PercentFor(c),4:P0}   new customer? {DiscountRules.IsNewCustomer(c)}");
}

Console.WriteLine();
Console.WriteLine("=== list patterns: the shape of the basket ===");
Order[] shapes =
[
    MakeOrder(new Guest(), Destination.Domestic),
    MakeOrder(new Guest(), Destination.Domestic, ("PEN-1", 1, 8m)),
    MakeOrder(new Guest(), Destination.Domestic, ("PEN-1", 1, 8m), ("MUG-2", 1, 6m)),
    MakeOrder(new Guest(), Destination.Domestic, ("OVERSIZE-DESK", 1, 200m), ("PEN-1", 1, 8m), ("MUG-2", 1, 6m)),
    MakeOrder(new Guest(), Destination.Domestic, ("PEN-1", 1, 8m), ("OVERSIZE-DESK", 1, 200m)),
];
foreach (var o in shapes)
    Console.WriteLine($"  {OrderText.Describe(o),-46} freight first? {OrderText.FreightIsFirst(o)}");

Console.WriteLine();
Console.WriteLine("=== the whole quote, end to end ===");
var basket = MakeOrder(new Member("grace", 10), Destination.International, ("MUG-2", 2, 6m), ("PEN-1", 1, 8m));
Console.WriteLine($"{OrderText.Describe(basket)} for a 10-year member, shipping international");
Console.WriteLine($"  subtotal {basket.Subtotal:C}  discount {DiscountRules.PercentFor(basket.Customer):P0}  " +
                  $"shipping {ShippingRules.Quote(basket).Cost:C} ({ShippingRules.Quote(basket).Rule})");
Console.WriteLine($"  total {DiscountRules.Total(basket):C}   ships free? {ShippingRules.ShipsFree(basket)}");

// Little builder so the demo reads like the rule table instead of like a
// constructor call. `params` + tuples keep the noise down.
static Order MakeOrder(Customer customer, Destination ship, params (string Sku, int Qty, decimal Price)[] lines) =>
    new(customer, lines.Select(l => new OrderLine(l.Sku, l.Qty, l.Price)).ToList(), ship);
