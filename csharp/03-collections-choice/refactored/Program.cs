if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

// Thin demo — all decisions happen in CharCounter, printing happens here.
var text = "hello world, hello c#";

Console.WriteLine($"character counts for: \"{text}\"");
foreach (var (c, n) in CharCounter.Count(text))
{
    Console.WriteLine($"  {c}: {n}");
}

Console.WriteLine($"most common: {CharCounter.MostCommon(text)}");
Console.WriteLine($"unique, in order: {string.Join(" ", CharCounter.UniqueInOrder(text))}");
Console.WriteLine($"case-insensitive 'Hello hello' counts h as: {CharCounter.Count("Hello hello", ignoreCase: true)['h']}");
