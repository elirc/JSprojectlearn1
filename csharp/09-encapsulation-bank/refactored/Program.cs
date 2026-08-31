if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

// Demo: same account story as the original — but now the attacks bounce off.
var account = new Account();
account.Deposit(500m);
account.Withdraw(120m);

Console.WriteLine("=== Used politely, everything works the same ===");
Console.WriteLine($"  balance: {account.Balance}");
foreach (var entry in account.History)
{
    Console.WriteLine($"  history: {entry}");
}

Console.WriteLine();
Console.WriteLine("=== The original's four corruption lines, replayed ===");
Console.WriteLine();
Console.WriteLine("1) GiveRefund writing the field directly?  Doesn't compile anymore:");
Console.WriteLine("     account.Balance += 30m;   // error CS0200: setter is private");
Console.WriteLine("   A refund is a Deposit — and Deposit writes the history too:");
account.Deposit(30m);
Console.WriteLine($"     after Deposit(30): balance {account.Balance}, history entries {account.History.Count}");

Console.WriteLine();
Console.WriteLine("2) Withdraw(-1000) — the money printer:");
try { account.Withdraw(-1000m); }
catch (ArgumentOutOfRangeException) { Console.WriteLine("     rejected: ArgumentOutOfRangeException (a withdrawal must be positive)"); }

Console.WriteLine();
Console.WriteLine("3) account.Balance = -5000m?  Doesn't compile:");
Console.WriteLine("     error CS0200: property 'Balance' cannot be assigned to");

Console.WriteLine();
Console.WriteLine("4) account.History.Clear()?  Doesn't compile:");
Console.WriteLine("     error CS1061: 'IReadOnlyList<string>' contains no definition for 'Clear'");

Console.WriteLine();
Console.WriteLine("5) And the overdraft rule holds at runtime:");
try { account.Withdraw(10_000m); }
catch (InvalidOperationException ex) { Console.WriteLine($"     rejected: {ex.Message}"); }

Console.WriteLine();
Console.WriteLine($"Final state: balance {account.Balance}, history entries {account.History.Count} — still consistent.");
Console.WriteLine("Two attacks became compile errors; two became loud exceptions. None corrupted state.");
