public static class Tests
{
    public static int Run()
    {
        // THE TEST PYRAMID, in one method. The unit tests below are fast,
        // numerous, and precise: when one fails you know the line. The HTTP
        // suite at the bottom is slower and broader: when one fails you know
        // the *system* is wrong, which is a different and equally necessary
        // fact. Neither can replace the other, and the original had neither.

        Console.WriteLine("Money.Round: invoices round .5 UP, statistics don't");
        Check.Equal(2.67m, Money.Round(2.665m), "2.665 rounds up to 2.67");
        Check.Equal(2.66m, Math.Round(2.665m, 2), "...whereas the DEFAULT Math.Round gives 2.66 (banker's rounding)");
        Check.Equal(2.69m, Money.Round(2.685m), "2.685 rounds up to 2.69");
        Check.Equal(2.68m, Math.Round(2.685m, 2), "...where the default would say 2.68");
        Check.Equal(-2.67m, Money.Round(-2.665m), "away from zero goes downwards for negatives");
        Check.Equal(1.01m, Money.Round(1.005m), "1.005 is 1.01, which is what the receipt has to say");
        Check.Equal(19.99m, Money.Round(19.99m), "an already-round value is left alone");
        Check.Equal(0m, Money.Round(0.004m), "a fraction of a cent rounds to nothing");

        Console.WriteLine("Totals.For: the arithmetic, with no server anywhere");
        var single = Totals.For([new OrderLine("BOOK-1", 3, 19.99m)]);
        Check.Equal(59.97m, single.Subtotal, "3 x 19.99 = 59.97");
        Check.Equal(4.80m, single.Tax, "8% of 59.97 is 4.7976, rounded to 4.80");
        Check.Equal(64.77m, single.Total, "and the total is 64.77");

        var multi = Totals.For([new OrderLine("A", 1, 10.00m), new OrderLine("B", 2, 5.005m)]);
        Check.Equal(20.01m, multi.Subtotal, "10.00 + 10.01 = 20.01 (line B rounds first)");
        Check.Equal(1.60m, multi.Tax, "8% of 20.01 is 1.6008 -> 1.60");
        Check.Equal(21.61m, multi.Total, "and the total");

        var awkward = Totals.For([new OrderLine("TILE", 3, 0.335m)]);
        Check.Equal(1.01m, awkward.Subtotal, "3 x 0.335 = 1.005, rounded away from zero to 1.01");
        Check.Equal(0.08m, awkward.Tax, "tax on 1.01");
        Check.Equal(1.09m, awkward.Total, "and the total");

        var none = Totals.For([]);
        Check.Equal(0m, none.Subtotal, "no lines, no subtotal");
        Check.Equal(0m, none.Tax, "no lines, no tax");
        Check.Equal(0m, none.Total, "no lines, no total — and no divide-by-zero either");

        // A PROPERTY test rather than an example: whatever the inputs, the
        // three numbers the client sees must add up. This is the assertion the
        // original could not have passed for any input at all.
        var violations = 0;
        var checkedCombinations = 0;
        for (int qty = 1; qty <= 20; qty++)
        {
            for (int step = 1; step <= 40; step++)
            {
                var (subtotal, tax, total) = Totals.For([new OrderLine("X", qty, step * 0.255m)]);
                checkedCombinations++;
                if (subtotal + tax != total) violations++;
                if (Money.Round(subtotal) != subtotal || Money.Round(tax) != tax) violations++;
            }
        }
        Check.Equal(800, checkedCombinations, "800 qty/price combinations were checked");
        Check.Equal(0, violations, "...and in every one, subtotal + tax == total exactly, all in whole cents");

        Console.WriteLine("OrderRules.Validate: every problem at once");
        Check.Equal(0, OrderRules.Validate(new NewOrder([new NewOrderLine("A", 1, 1m)])).Count,
            "a good order has no problems");
        Check.Equal(1, OrderRules.Validate(null).Count, "a missing body is one error");
        Check.Equal(1, OrderRules.Validate(new NewOrder(null)).Count, "missing lines is one error");
        Check.Equal(1, OrderRules.Validate(new NewOrder([])).Count, "zero lines is one error");
        Check.Equal(3, OrderRules.Validate(new NewOrder([new NewOrderLine("", 0, -1m)])).Count,
            "one line can hold three problems, and all three are reported");
        Check.True(OrderRules.Validate(new NewOrder([new NewOrderLine("A", 1, 1m), new NewOrderLine(" ", 1, 1m)]))[0]
                .Contains("line 2"),
            "errors name the line NUMBER, counting from 1 like a human");
        Check.Equal(0, OrderRules.Validate(new NewOrder([new NewOrderLine("A", 1, 0m)])).Count,
            "a free item (unitPrice 0) is allowed; only negatives are not");
        Check.Equal(1, OrderRules.Validate(new NewOrder(
                Enumerable.Range(0, OrderRules.MaxLines + 1).Select(i => new NewOrderLine("A", 1, 1m)).ToList())).Count,
            "too many lines is one error, and the good lines don't add noise");

        Console.WriteLine("OrderStore: ids, lookups, deletes");
        var store = new OrderStore();
        Check.Equal(0, store.All().Count, "a new store is empty");
        Check.Equal(null, store.Find(1), "Find on an empty store is null, not a crash");

        var first = store.Add([new OrderLine("BOOK-1", 3, 19.99m)]);
        Check.Equal(1, first.Id, "the first order gets id 1");
        Check.Equal(64.77m, first.Total, "the store computes totals on the way in");
        var second = store.Add([new OrderLine("MUG-1", 1, 9.50m)]);
        Check.Equal(2, second.Id, "ids increment");
        Check.Equal(2, store.All().Count, "both orders are listed");
        Check.Equal(64.77m, store.Find(1)!.Total, "Find locates by id");
        Check.Equal(null, store.Find(999), "Find on a missing id is null");

        Check.Equal(true, store.Delete(1), "Delete reports success");
        Check.Equal(false, store.Delete(1), "deleting twice reports failure");
        Check.Equal(null, store.Find(1), "the deleted order is gone");
        Check.Equal(3, store.Add([new OrderLine("X", 1, 1m)]).Id, "ids are never recycled after a delete");

        // ---------------------------------------------------------------
        // Now the other half of the pyramid: a real server, real sockets,
        // real JSON, real status codes. Everything above this line could
        // pass while the API was still broken — the original proves it.
        // ---------------------------------------------------------------
        Console.WriteLine("Integration suite: a real Kestrel server on a random free port");
        HttpTests.Run();

        return Check.Summary();
    }
}
