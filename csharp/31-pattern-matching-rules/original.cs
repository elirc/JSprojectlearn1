// ============================================================================
// CS 31 — pattern-matching-rules — ORIGINAL (compiles, runs, and quietly
//                                            charges the wrong price twice)
// Run from repo root:  dotnet run csharp/31-pattern-matching-rules/original.cs
// ============================================================================
// The shipping rule book from README.md, implemented the way rule books
// usually start life: gather some facts into bool flags, then nest an if/else
// per rule. It compiles. It even looks careful. But the RULE BOOK has an
// order, and this code has a DIFFERENT order — and nothing anywhere says so.

var cases = new (string What, Order Order, decimal Expected, string Rule)[]
{
    ("guest, one $8 pen, domestic",            new Order(new Guest(), Lines(("PEN-1", 1, 8m)), Destination.Domestic), 1.95m, "letter rate"),
    ("guest, 3 x $6 mugs, domestic",           new Order(new Guest(), Lines(("MUG-2", 3, 6m)), Destination.Domestic), 4.95m, "standard parcel"),
    ("guest, 3 x $6 mugs, international",      new Order(new Guest(), Lines(("MUG-2", 3, 6m)), Destination.International), 19.50m, "international flat"),
    ("guest, $120 of books, domestic",         new Order(new Guest(), Lines(("BOOK-9", 2, 60m)), Destination.Domestic), 0m, "free over $50"),
    ("employee, $30 of mugs, international",   new Order(new Employee("ada", "Support"), Lines(("MUG-2", 5, 6m)), Destination.International), 0m, "employee perk"),
    ("member of 5 years, $12 of mugs",         new Order(new Member("grace", 5), Lines(("MUG-2", 2, 6m)), Destination.Domestic), 0m, "loyalty 5+ years"),
    ("guest, $200 OVERSIZE desk, domestic",    new Order(new Guest(), Lines(("OVERSIZE-DESK", 1, 200m)), Destination.Domestic), 24m, "oversize freight"),
    ("member of 1 year, empty basket",         new Order(new Member("linus", 1), Lines(), Destination.Domestic), 0m, "empty order"),
};

Console.WriteLine("=== the shipping rule book, as this code applies it ===");
Console.WriteLine("order                                    spec says              code says");
int wrong = 0;
foreach (var c in cases)
{
    var (cost, rule) = Quote(c.Order);
    bool ok = cost == c.Expected && rule == c.Rule;
    if (!ok) wrong++;
    string spec = $"${c.Expected:0.00} {c.Rule}";
    string got = $"${cost:0.00} {rule}";
    Console.WriteLine($"{c.What,-40} {spec,-22} {got,-22}{(ok ? "" : "   <-- BUG")}");
}

Console.WriteLine();
Console.WriteLine($"{wrong} of {cases.Length} orders are priced wrong. Both bugs are ORDER bugs:");
Console.WriteLine();
Console.WriteLine("1. `if (subtotal > 50m)` sits ABOVE the oversize check, so the $200 desk");
Console.WriteLine("   ships free. The oversize branch is unreachable for every expensive");
Console.WriteLine("   order — and no compiler warning exists for 'you nested these wrong'.");
Console.WriteLine("2. The loyalty flag is computed twenty lines away from where it is USED");
Console.WriteLine("   (`mem.Years > 5`), and the spec says 5 or more. A five-year member");
Console.WriteLine("   pays $4.95. You cannot see the bug at the `if (isLoyalMember)` line;");
Console.WriteLine("   the fact and the decision live in different postcodes.");
Console.WriteLine();
Console.WriteLine("Discounts, same style: " + $"warehouse staff {DiscountPercent(new Employee("ada", "Warehouse")):P0}, " +
                  $"10-year member {DiscountPercent(new Member("grace", 10)):P0}, guest {DiscountPercent(new Guest()):P0}");

// ---------------------------------------------------------------------------
// The rule book. Read it top to bottom and try to answer "which rule wins for
// an employee with an oversize item?" without a pencil.
// ---------------------------------------------------------------------------

(decimal Cost, string Rule) Quote(Order order)
{
    // Step 1: turn the customer into flags, because the ifs below cannot ask
    // a question and use the answer in the same breath.
    bool isEmployee = false;
    bool isLoyalMember = false;

    Employee? emp = order.Customer as Employee;      // `as` = cast or null
    if (emp != null)
    {
        isEmployee = true;
    }

    Member? mem = order.Customer as Member;
    if (mem != null)
    {
        if (mem.Years > 5)                            // spec says "5 or more"...
        {
            isLoyalMember = true;
        }
    }

    bool hasOversize = false;
    for (int i = 0; i < order.Lines.Count; i++)
    {
        if (order.Lines[i].Sku.StartsWith("OVERSIZE-"))
        {
            hasOversize = true;
        }
    }

    decimal subtotal = 0m;
    foreach (var line in order.Lines)
    {
        subtotal += line.Quantity * line.UnitPrice;
    }

    // Step 2: the nest. Eight rules, seven indentation levels, one order that
    // somebody chose in a hurry and nobody has re-read since.
    if (order.Lines.Count == 0)
    {
        return (0m, "empty order");
    }
    else
    {
        if (subtotal > 50m)
        {
            return (0m, "free over $50");             // <-- the mis-ordering
        }
        else
        {
            if (hasOversize)
            {
                return (24m, "oversize freight");     // <-- can never fire above $50
            }
            else
            {
                if (isEmployee)
                {
                    return (0m, "employee perk");
                }
                else
                {
                    if (isLoyalMember)
                    {
                        return (0m, "loyalty 5+ years");
                    }
                    else
                    {
                        if (order.Ship == Destination.International)
                        {
                            return (19.50m, "international flat");
                        }
                        else
                        {
                            if (order.Lines.Count == 1 && order.Lines[0].Quantity == 1 && subtotal <= 10m)
                            {
                                return (1.95m, "letter rate");
                            }
                            else
                            {
                                return (4.95m, "standard parcel");
                            }
                        }
                    }
                }
            }
        }
    }
}

// Discounts: the `is` / cast double-act. Ask whether it's an Employee, then
// cast it to an Employee — the same question answered twice, in two places
// that are free to disagree after the next edit.
decimal DiscountPercent(Customer customer)
{
    if (customer is Employee)
    {
        Employee e = (Employee)customer;
        if (e.Department == "Warehouse")
        {
            return 0.30m;
        }
        else
        {
            return 0.20m;
        }
    }
    else
    {
        if (customer is Member)
        {
            Member m = (Member)customer;
            if (m.Years >= 10)
            {
                return 0.15m;
            }
            else
            {
                if (m.Years >= 5)
                {
                    return 0.10m;
                }
                else
                {
                    if (m.Years >= 1)
                    {
                        return 0.05m;
                    }
                    else
                    {
                        return 0m;
                    }
                }
            }
        }
        else
        {
            return 0m;
        }
    }
}

List<OrderLine> Lines(params (string Sku, int Qty, decimal Price)[] lines)
{
    var list = new List<OrderLine>();
    foreach (var l in lines) list.Add(new OrderLine(l.Sku, l.Qty, l.Price));
    return list;
}

// ---- the data -------------------------------------------------------------

enum Destination { Domestic, International }

record OrderLine(string Sku, int Quantity, decimal UnitPrice);
record Order(Customer Customer, List<OrderLine> Lines, Destination Ship);

abstract record Customer;
record Guest() : Customer;
record Member(string Name, int Years) : Customer;
record Employee(string Name, string Department) : Customer;
