if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

// Same three lookups as original.cs — no try/catch needed anywhere,
// because no path can throw NullReferenceException anymore.
var directory = UserDirectory.Demo();

Console.WriteLine(Greeter.Greet(directory, 1));   // exists, has email
Console.WriteLine(Greeter.Greet(directory, 2));   // exists, Email is null
Console.WriteLine(Greeter.Greet(directory, 99));  // missing — a normal, handled case

Console.WriteLine();
Console.WriteLine($"Ada's email domain:   {Greeter.EmailDomain(directory.FindOrNull(1))}");
Console.WriteLine($"Grace's email domain: {Greeter.EmailDomain(directory.FindOrNull(2))}");
Console.WriteLine($"user 99's domain:     {Greeter.EmailDomain(directory.FindOrNull(99))}");
