public static class Tests
{
    public static int Run()
    {
        Console.WriteLine("NextStep:");
        Check.Equal("send payment reminder", OrderWorkflow.NextStep(OrderStatus.Pending), "Pending -> payment reminder");
        Check.Equal("print shipping label", OrderWorkflow.NextStep(OrderStatus.Paid), "Paid -> shipping label");
        Check.Equal("email tracking number", OrderWorkflow.NextStep(OrderStatus.Shipped), "Shipped -> tracking number");
        Check.Equal("ask for a review", OrderWorkflow.NextStep(OrderStatus.Delivered), "Delivered -> review");
        Check.Throws<ArgumentOutOfRangeException>(
            () => OrderWorkflow.NextStep((OrderStatus)42),
            "an unnamed enum value throws instead of guessing");

        Console.WriteLine("CanCancel:");
        Check.True(OrderWorkflow.CanCancel(OrderStatus.Pending), "Pending can cancel");
        Check.True(OrderWorkflow.CanCancel(OrderStatus.Paid), "Paid can cancel");
        Check.Equal(false, OrderWorkflow.CanCancel(OrderStatus.Shipped), "Shipped cannot cancel");
        Check.Equal(false, OrderWorkflow.CanCancel(OrderStatus.Delivered), "Delivered cannot cancel");

        Console.WriteLine("Advance (one test per legal transition):");
        Check.Equal(OrderStatus.Paid, OrderWorkflow.Advance(OrderStatus.Pending), "Pending -> Paid");
        Check.Equal(OrderStatus.Shipped, OrderWorkflow.Advance(OrderStatus.Paid), "Paid -> Shipped");
        Check.Equal(OrderStatus.Delivered, OrderWorkflow.Advance(OrderStatus.Shipped), "Shipped -> Delivered");
        Check.Throws<InvalidOperationException>(
            () => OrderWorkflow.Advance(OrderStatus.Delivered),
            "Delivered is the end of the line");

        Console.WriteLine("TryParseStatus (the border checkpoint):");
        Check.True(Parse("pending") == OrderStatus.Pending, "\"pending\" parses");
        Check.True(Parse("Paid") == OrderStatus.Paid, "\"Paid\" parses (the original's silent-skip bug)");
        Check.True(Parse("SHIPPED") == OrderStatus.Shipped, "\"SHIPPED\" parses (casing no longer matters)");
        Check.True(Parse("  delivered  ") == OrderStatus.Delivered, "stray spaces are trimmed");
        Check.True(Parse("PAYED") is null, "a real typo is rejected, not silently skipped");
        Check.True(Parse("banana") is null, "nonsense is rejected");
        Check.True(Parse("42") is null, "numeric strings are rejected (Enum.TryParse alone would accept!)");

        return Check.Summary();
    }

    // Small helper so tests read nicely: null means "didn't parse".
    static OrderStatus? Parse(string text) =>
        OrderWorkflow.TryParseStatus(text, out var status) ? status : null;
}
