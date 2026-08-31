if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

// Demo: the SAME form the original needed five submits to fix — one submit now.
var attempt1 = new SignupForm("al", "al.example.com", "short");

Console.WriteLine("=== Attempt 1 ===");
Show(SignupValidator.Validate(attempt1));

Console.WriteLine("The user fixes EVERYTHING in one go — because they were told everything:");
var attempt2 = new SignupForm("alice", "alice@example.com", "longenough7");

Console.WriteLine();
Console.WriteLine("=== Attempt 2 ===");
Show(SignupValidator.Validate(attempt2));

Console.WriteLine();
Console.WriteLine("Two attempts instead of five. Same rules — but failures are VALUES");
Console.WriteLine("that accumulate, not exceptions that bail at the first problem.");
Console.WriteLine("(And no try/catch anywhere in this file: checking a form isn't an");
Console.WriteLine("emergency, so nothing needs to be caught.)");

static void Show(Result result)
{
    if (result.Ok)
    {
        Console.WriteLine("  OK — account created.");
        return;
    }
    Console.WriteLine($"  Please fix {result.Errors.Count} thing(s):");
    foreach (var error in result.Errors)
    {
        Console.WriteLine($"    - {error}");
    }
}
