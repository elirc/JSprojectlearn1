// Tests.cs — a rule book deserves a test per rule, a test per boundary, and
// a test per OVERLAP (two rules match; which wins?). The last group is the
// one the original could never have passed: it is where its bugs lived.
public static class Tests
{
    private static Order O(Customer customer, Destination ship, params (string Sku, int Qty, decimal Price)[] lines) =>
        new(customer, lines.Select(l => new OrderLine(l.Sku, l.Qty, l.Price)).ToList(), ship);

    private static (decimal, string) Q(Order order)
    {
        var q = ShippingRules.Quote(order);
        return (q.Cost, q.Rule);
    }

    public static int Run()
    {
        Console.WriteLine("one test per rule in the table");
        Check.Equal((0.00m, "empty order"), Q(O(new Guest(), Destination.Domestic)),
            "1. an empty basket ships for nothing");
        Check.Equal((24.00m, "oversize freight"), Q(O(new Guest(), Destination.Domestic, ("OVERSIZE-DESK", 1, 200m))),
            "2. an oversize line is freight");
        Check.Equal((0.00m, "employee perk"), Q(O(new Employee("ada", "Support"), Destination.International, ("MUG-2", 1, 6m))),
            "3. staff ship free, anywhere");
        Check.Equal((0.00m, "loyalty 5+ years"), Q(O(new Member("grace", 5), Destination.Domestic, ("MUG-2", 2, 6m))),
            "4. five-year members ship free");
        Check.Equal((0.00m, "free over $50"), Q(O(new Guest(), Destination.Domestic, ("BOOK-9", 2, 60m))),
            "5. baskets over $50 ship free");
        Check.Equal((19.50m, "international flat"), Q(O(new Guest(), Destination.International, ("MUG-2", 3, 6m))),
            "6. international is a flat fee");
        Check.Equal((1.95m, "letter rate"), Q(O(new Guest(), Destination.Domestic, ("PEN-1", 1, 8m))),
            "7. one cheap item is a letter");
        Check.Equal((4.95m, "standard parcel"), Q(O(new Guest(), Destination.Domestic, ("MUG-2", 3, 6m))),
            "8. everything else is a parcel");

        Console.WriteLine("the boundaries the relational patterns draw");
        Check.Equal((4.95m, "standard parcel"), Q(O(new Guest(), Destination.Domestic, ("BOOK-9", 1, 50m))),
            "$50.00 exactly is NOT over $50 — `> 50m` is strict");
        Check.Equal((0.00m, "free over $50"), Q(O(new Guest(), Destination.Domestic, ("BOOK-9", 1, 50.01m))),
            "...but one cent more is");
        Check.Equal((4.95m, "standard parcel"), Q(O(new Member("hedy", 4), Destination.Domestic, ("MUG-2", 2, 6m))),
            "four years is not loyal yet — the original said this too, for five");
        Check.Equal((0.00m, "loyalty 5+ years"), Q(O(new Member("grace", 6), Destination.Domestic, ("MUG-2", 2, 6m))),
            "six years is");
        Check.Equal((1.95m, "letter rate"), Q(O(new Guest(), Destination.Domestic, ("PEN-1", 1, 10m))),
            "$10.00 exactly still fits in an envelope — `<= 10m` includes it");
        Check.Equal((4.95m, "standard parcel"), Q(O(new Guest(), Destination.Domestic, ("PEN-1", 1, 10.01m))),
            "a cent more and it is a parcel");
        Check.Equal((4.95m, "standard parcel"), Q(O(new Guest(), Destination.Domestic, ("PEN-1", 2, 4m))),
            "two of the same item is not a letter — the list pattern demands [{ Quantity: 1 }]");
        Check.Equal((4.95m, "standard parcel"), Q(O(new Guest(), Destination.Domestic, ("PEN-1", 1, 4m), ("MUG-2", 1, 5m))),
            "two lines is not a letter either, even under $10");

        Console.WriteLine("overlaps: two rules match, and the winner is the one we WROTE first");
        Check.Equal((24.00m, "oversize freight"), Q(O(new Guest(), Destination.Domestic, ("OVERSIZE-DESK", 1, 200m))),
            "oversize beats free-over-$50 — THE original's bug, pinned forever");
        Check.Equal((24.00m, "oversize freight"), Q(O(new Employee("ada", "Support"), Destination.Domestic, ("OVERSIZE-DESK", 1, 200m))),
            "oversize beats the employee perk too — freight is freight");
        Check.Equal((24.00m, "oversize freight"), Q(O(new Member("grace", 20), Destination.International, ("OVERSIZE-DESK", 1, 300m))),
            "...and beats loyalty and international at the same time");
        Check.Equal((0.00m, "employee perk"), Q(O(new Employee("ada", "Support"), Destination.International, ("MUG-2", 20, 6m))),
            "employee beats both free-over-$50 and the international fee");
        Check.Equal((0.00m, "loyalty 5+ years"), Q(O(new Member("grace", 5), Destination.International, ("MUG-2", 1, 6m))),
            "loyalty beats the international fee");
        Check.Equal((0.00m, "free over $50"), Q(O(new Guest(), Destination.International, ("BOOK-9", 2, 60m))),
            "free-over-$50 beats the international fee");
        Check.Equal((0.00m, "empty order"), Q(O(new Employee("ada", "Support"), Destination.International)),
            "an empty basket is empty before it is anything else");

        Console.WriteLine("order independence: the arms match a priority table, whatever order the table is in");
        // A second, independent statement of the same rule book: each rule as a
        // predicate with an EXPLICIT priority number. Evaluating it by lowest
        // priority among the matches cannot depend on the array's order — so if
        // it agrees with the switch for every order below, the switch's ARM
        // ORDER really does encode the documented precedence, by proof.
        var table = new (int Priority, string Rule, Func<Order, bool> Matches, decimal Cost)[]
        {
            (1, "empty order",         o => o.Lines.Count == 0,                                                 0.00m),
            (2, "oversize freight",    o => o.Lines.Any(l => l.IsOversize),                                    24.00m),
            (3, "employee perk",       o => o.Customer is Employee,                                             0.00m),
            (4, "loyalty 5+ years",    o => o.Customer is Member m && m.Years >= 5,                             0.00m),
            (5, "free over $50",       o => o.Subtotal > 50m,                                                   0.00m),
            (6, "international flat",  o => o.Ship == Destination.International,                               19.50m),
            (7, "letter rate",         o => o.Lines.Count == 1 && o.Lines[0].Quantity == 1 && o.Subtotal <= 10m, 1.95m),
            (8, "standard parcel",     o => true,                                                               4.95m),
        };

        static (decimal, string) ByTable((int Priority, string Rule, Func<Order, bool> Matches, decimal Cost)[] rules, Order order)
        {
            var winner = rules.Where(r => r.Matches(order)).OrderBy(r => r.Priority).First();
            return (winner.Cost, winner.Rule);
        }

        Customer[] customers =
        [
            new Guest(), new Member("a", 0), new Member("b", 4), new Member("c", 5),
            new Member("d", 12), new Employee("e", "Support"), new Employee("f", "Warehouse"),
        ];
        (string Sku, int Qty, decimal Price)[][] baskets =
        [
            [],
            [("PEN-1", 1, 8m)],
            [("MUG-2", 3, 6m)],
            [("BOOK-9", 2, 60m)],
            [("OVERSIZE-DESK", 1, 200m)],
            [("PEN-1", 1, 8m), ("OVERSIZE-DESK", 1, 40m)],
        ];

        int compared = 0, disagreements = 0, reversedDisagreements = 0;
        var reversedTable = table.Reverse().ToArray();
        foreach (var customer in customers)
            foreach (var basket in baskets)
                foreach (var ship in new[] { Destination.Domestic, Destination.International })
                {
                    var order = O(customer, ship, basket);
                    compared++;
                    if (Q(order) != ByTable(table, order)) disagreements++;
                    if (ByTable(table, order) != ByTable(reversedTable, order)) reversedDisagreements++;
                }

        Check.Equal(84, compared, "the sweep covers 7 customers x 6 baskets x 2 destinations");
        Check.Equal(0, disagreements, "the switch agrees with the priority table on all 84 orders");
        Check.Equal(0, reversedDisagreements, "and the table gives the same answers written backwards — precedence is stated, not accidental");

        Console.WriteLine("discounts");
        Check.Equal(0.30m, DiscountRules.PercentFor(new Employee("ada", "Warehouse")), "warehouse staff get 30%");
        Check.Equal(0.20m, DiscountRules.PercentFor(new Employee("bob", "Support")), "other staff get 20% — one positional pattern splits them");
        Check.Equal(0.15m, DiscountRules.PercentFor(new Member("grace", 10)), "10-year members get 15%");
        Check.Equal(0.10m, DiscountRules.PercentFor(new Member("hedy", 5)), "5-year members get 10%");
        Check.Equal(0.05m, DiscountRules.PercentFor(new Member("linus", 1)), "1-year members get 5%");
        Check.Equal(0.00m, DiscountRules.PercentFor(new Member("new", 0)), "brand-new members get nothing yet");
        Check.Equal(0.00m, DiscountRules.PercentFor(new Guest()), "guests get nothing");
        Check.True(DiscountRules.IsNewCustomer(new Guest()), "`Guest or Member(_, 0)` — a guest is new");
        Check.True(DiscountRules.IsNewCustomer(new Member("new", 0)), "...and so is a zero-year member");
        Check.Equal(false, DiscountRules.IsNewCustomer(new Member("linus", 1)), "...but a one-year member is not");
        Check.Equal(false, DiscountRules.IsNewCustomer(new Employee("ada", "Support")), "...and neither is staff");

        Console.WriteLine("totals put the two rule books together");
        var order12 = O(new Member("hedy", 5), Destination.Domestic, ("MUG-2", 2, 6m));
        Check.Equal(10.80m, DiscountRules.Total(order12), "$12 - 10% + free shipping = $10.80");
        var guestParcel = O(new Guest(), Destination.Domestic, ("MUG-2", 3, 6m));
        Check.Equal(22.95m, DiscountRules.Total(guestParcel), "$18 + $4.95 parcel, no discount");
        Check.True(ShippingRules.ShipsFree(order12), "ShipsFree reuses Quote instead of restating the rules");
        Check.Equal(false, ShippingRules.ShipsFree(guestParcel), "...and says no when the quote is not zero");

        Console.WriteLine("list patterns describe the basket's shape");
        Check.Equal("an empty order", OrderText.Describe(O(new Guest(), Destination.Domestic)), "[] matches nothing at all");
        Check.Equal("one line: 1 x PEN-1", OrderText.Describe(O(new Guest(), Destination.Domestic, ("PEN-1", 1, 8m))), "[var only] matches exactly one");
        Check.Equal("two lines: PEN-1 and MUG-2",
            OrderText.Describe(O(new Guest(), Destination.Domestic, ("PEN-1", 1, 8m), ("MUG-2", 1, 6m))), "[a, b] matches exactly two");
        Check.Equal("4 lines, from PEN-1 to CUP-4",
            OrderText.Describe(O(new Guest(), Destination.Domestic, ("PEN-1", 1, 8m), ("MUG-2", 1, 6m), ("BOX-3", 1, 2m), ("CUP-4", 1, 3m))),
            "[first, .., last] matches three or more and binds both ends");
        Check.True(OrderText.FreightIsFirst(O(new Guest(), Destination.Domestic, ("OVERSIZE-DESK", 1, 200m), ("PEN-1", 1, 8m))),
            "freight in position 0 is found by [{ IsOversize: true }, ..]");
        Check.Equal(false, OrderText.FreightIsFirst(O(new Guest(), Destination.Domestic, ("PEN-1", 1, 8m), ("OVERSIZE-DESK", 1, 200m))),
            "the same freight in position 1 is not — list patterns match POSITION");
        Check.Equal(false, OrderText.FreightIsFirst(O(new Guest(), Destination.Domestic)), "an empty basket has no first line");

        return Check.Summary();
    }
}
