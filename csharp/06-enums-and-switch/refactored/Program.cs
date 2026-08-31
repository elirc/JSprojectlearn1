if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

// Demo: the same messy inputs as the original — but now they're caught at the
// door by TryParseStatus, and inside the program only the enum travels.
Console.WriteLine("=== Parsing the morning batch (messy strings -> enum, once) ===");
var rawInputs = new[] { "pending", "Paid", "SHIPPED", "delivered", "PAYED", "42" };

foreach (var raw in rawInputs)
{
    if (OrderWorkflow.TryParseStatus(raw, out var status))
    {
        var cancel = OrderWorkflow.CanCancel(status) ? "can cancel" : "too late";
        Console.WriteLine($"  \"{raw}\" -> {status,-9} | next: {OrderWorkflow.NextStep(status),-22} | {cancel}");
    }
    else
    {
        Console.WriteLine($"  \"{raw}\" -> rejected at the door (not a real status)");
    }
}

Console.WriteLine();
Console.WriteLine("=== An order's whole life, via Advance ===");
var s = OrderStatus.Pending;
Console.Write($"  {s}");
while (s != OrderStatus.Delivered)
{
    s = OrderWorkflow.Advance(s);
    Console.Write($" -> {s}");
}
Console.WriteLine();
Console.WriteLine();
Console.WriteLine("Try it: add Refunded to the enum, remove a _ arm, rebuild — and watch");
Console.WriteLine("the compiler point at every switch that needs a decision about it.");
