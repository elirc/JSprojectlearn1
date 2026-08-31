if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

var words = new List<string?>
{
    "apple", null, "banana", "apple", "cherry", null, "date", "banana", "fig"
};

Console.WriteLine("=== the same pipeline, reading left-to-right ===");
var chunks = words.Compact().Unique().Chunk(3);   // clean -> dedupe -> rows of 3
foreach (var chunk in chunks)
    Console.WriteLine($"  [{string.Join(", ", chunk)}]");

Console.WriteLine();
Console.WriteLine("=== counting by first letter (works for any key) ===");
foreach (var (letter, count) in words.Compact().CountBy(w => w[..1]).OrderBy(pair => pair.Key))
    Console.WriteLine($"  {letter}: {count}");

Console.WriteLine();
Console.WriteLine("=== bad input now fails LOUDLY, at the call site ===");
try
{
    words.Compact().Chunk(0);
}
catch (ArgumentOutOfRangeException ex)
{
    Console.WriteLine($"  Chunk(0) -> {ex.GetType().Name}: chunk size must be at least 1");
    Console.WriteLine("  (the original returned an empty list and let 7 words vanish)");
}

Console.WriteLine();
Console.WriteLine("=== deferred execution, live ===");
var numbers = new List<int> { 1, 2, 3 };
var uniques = numbers.Unique();     // nothing has run yet — this is a RECIPE
numbers.Add(3);
numbers.Add(4);                     // added AFTER the query was built...
Console.WriteLine($"  [{string.Join(", ", uniques)}]  <- 4 still made it in: the");
Console.WriteLine("  query only executed just now, when string.Join looped over it.");

Console.WriteLine();
Console.WriteLine("=== and it's all generic: same helpers, ints this time ===");
var readings = new List<int?> { 3, null, 1, 4, 1, null, 5 };
Console.WriteLine($"  [{string.Join(", ", readings.Compact().Unique().Chunk(2).Select(c => $"({string.Join(",", c)})"))}]");
