if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

// Program.cs — the same five numbers, produced by pulling instead of building.
// Nothing in this file allocates a list of intermediate results. The pipeline
// is assembled first and runs only when the final `foreach` pulls on it.

Console.WriteLine("=== A. the original's pipeline, lazily ===");

long memoryBefore = GC.GetTotalMemory(forceFullCollection: true);
var sw = System.Diagnostics.Stopwatch.StartNew();

// Same three stages, same order, same five-million-item range — but each stage
// is an iterator, so `numbers` is a recipe, not 20MB of ints.
var numbers = new Counted<int>(Sequences.Range(1, 5_000_000));
var pipeline = numbers
    .Filtered(n => n % 7 == 0)
    .Until(n => n < 1000)
    .FirstFew(5);

Console.WriteLine($"pipeline built. numbers produced so far: {numbers.Produced}");

foreach (int n in pipeline)                     // ⬅ the pull that starts everything
    Console.WriteLine($"  {n} * {n} = {(long)n * n}");

sw.Stop();
long memoryAfter = GC.GetTotalMemory(forceFullCollection: false);

Console.WriteLine($"numbers produced   : {numbers.Produced}   (the original built 5,714,427)");
Console.WriteLine($"time               : {sw.ElapsedMilliseconds}ms   (the original: run it and compare)");
Console.WriteLine($"memory grew by     : {(memoryAfter - memoryBefore) / 1024}KB   (the original grew ~39MB)");
Console.WriteLine("The source stopped at 35 because FirstFew stopped pulling at 35.");
Console.WriteLine("Laziness makes the CONSUMER decide how much work the producer does.");

Console.WriteLine();
Console.WriteLine("=== B. a sequence with no end, and no danger ===");

var naturals = new Counted<int>(Sequences.Naturals());       // 1, 2, 3, ... forever
var firstSquares = naturals
    .Filtered(n => n % 3 == 0)
    .Mapped(n => (long)n * n)
    .FirstFew(6);

Console.WriteLine($"squares of multiples of 3: {string.Join(", ", firstSquares)}");
Console.WriteLine($"naturals produced: {naturals.Produced}   (out of infinity)");
Console.WriteLine($"fibonacci, first 10: {string.Join(", ", Sequences.Fibonacci().FirstFew(10))}");
Console.WriteLine("The original could not even WRITE these: a List of all the naturals");
Console.WriteLine("is 8GB of nothing. An iterator is one int and a resume point.");

Console.WriteLine();
Console.WriteLine("=== C. streaming a big job in constant memory ===");

// 5,000,000 numbers, summed, in batches of 1000 — the shape of "process a
// huge file / table without loading it". Peak memory is one batch.
long before = GC.GetTotalMemory(forceFullCollection: true);
long total = 0;
int batches = 0;
foreach (var batch in Sequences.Range(1, 5_000_000).Filtered(n => n % 7 == 0).Batched(1000))
{
    batches++;
    foreach (int n in batch) total += n;
}
// forceFullCollection: true measures memory still held ALIVE — the honest
// number for "how much of this did we have to keep?".
long grew = (GC.GetTotalMemory(forceFullCollection: true) - before) / 1024;
Console.WriteLine($"summed {batches:N0} batches of multiples of 7 -> {total:N0}");
Console.WriteLine($"live memory grew by {grew}KB — one batch at a time, never the whole set");

Console.WriteLine();
Console.WriteLine("=== D. the trap the two-method shape closes ===");

try
{
    // Never enumerated — and it still throws, right here, at the mistake.
    var bad = Sequences.Range(1, -1);
    Console.WriteLine($"no exception?! got {bad}");
}
catch (ArgumentOutOfRangeException ex)
{
    Console.WriteLine($"Range(1, -1) threw at the CALL: {ex.ParamName} — {ex.Message.Split('(')[0].Trim()}");
}

var lateBomb = Sequences.RangeTheLateWay(1, -1);     // the one-method version
Console.WriteLine("RangeTheLateWay(1, -1) returned a sequence without complaining.");
try
{
    foreach (int _ in lateBomb) { }                  // the bang, far from the mistake
}
catch (ArgumentOutOfRangeException)
{
    Console.WriteLine("...and threw here instead, inside somebody else's foreach.");
}
