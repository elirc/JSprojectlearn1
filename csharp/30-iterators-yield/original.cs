// ============================================================================
// CS 30 — iterators-yield — ORIGINAL (works, and builds 5.7 million numbers
//                                     in order to print five of them)
// Run from repo root:  dotnet run csharp/30-iterators-yield/original.cs
// ============================================================================
// Three helper methods, each with the same shape: make a `new List<int>()`,
// fill it completely, return it. Chain them and every stage is materialized in
// full before the next stage starts — even though the caller wants five items.

using System.Diagnostics;

const int Total = 5_000_000;

long memoryBefore = GC.GetTotalMemory(forceFullCollection: true);
var sw = Stopwatch.StartNew();

// Stage 1: every number from 1 to 5,000,000. All of them. Right now.
List<int> all = BuildRange(1, Total);

// Stage 2: a SECOND full list, holding the multiples of 7.
List<int> multiples = KeepMultiplesOf(all, 7);

// Stage 3: a THIRD full list, holding the ones below 1000.
List<int> small = TakeWhileBelow(multiples, 1000);

sw.Stop();
long memoryAfter = GC.GetTotalMemory(forceFullCollection: false);

Console.WriteLine();
Console.WriteLine("=== the first five squares of small multiples of 7 ===");
for (int i = 0; i < 5; i++)
    Console.WriteLine($"  {small[i]} * {small[i]} = {(long)small[i] * small[i]}");

Console.WriteLine();
Console.WriteLine($"list entries built : {all.Count + multiples.Count + small.Count:N0}");
Console.WriteLine($"list entries USED  : 5");
Console.WriteLine($"time               : {sw.ElapsedMilliseconds}ms");
Console.WriteLine($"memory grew by     : {(memoryAfter - memoryBefore) / 1024 / 1024}MB");
Console.WriteLine();
Console.WriteLine("Every stage ran to completion before the next one started, because a");
Console.WriteLine("method that returns List<int> has no way to hand back item #1 and pause.");
Console.WriteLine("The 35th number is the last one we needed. We produced 5,000,000.");

// And there is a shape this style simply cannot express:
//
//     List<int> everyNumber = BuildRange(1, int.MaxValue);   // 8GB, or death
//
// "All the natural numbers" is a perfectly reasonable sequence to want the
// first five of — but you cannot put it in a List, so you cannot write it at
// all. Eager code makes endless data unrepresentable.

// ---------------------------------------------------------------------------
// The three stages. Note the second disease: generation is tangled up with
// PRINTING. BuildRange decides what shows on the console, so it can never be
// used by anything that wants to stay quiet — a test, a web request, a report.
// ---------------------------------------------------------------------------

List<int> BuildRange(int start, int count)
{
    var list = new List<int>();
    for (int i = 0; i < count; i++)
    {
        list.Add(start + i);
        if ((i + 1) % 1_000_000 == 0)
            Console.WriteLine($"   ...built {(i + 1) / 1_000_000} million numbers");   // not the caller's choice
    }
    Console.WriteLine($"   BuildRange finished: {list.Count:N0} items");
    return list;
}

List<int> KeepMultiplesOf(List<int> source, int factor)
{
    var list = new List<int>();
    foreach (int n in source)
        if (n % factor == 0)
            list.Add(n);
    Console.WriteLine($"   KeepMultiplesOf({factor}) finished: {list.Count:N0} items");
    return list;
}

List<int> TakeWhileBelow(List<int> source, int limit)
{
    var list = new List<int>();
    foreach (int n in source)
    {
        if (n >= limit) break;      // we stop adding... after the previous stage
        list.Add(n);                // already built every item we are ignoring
    }
    Console.WriteLine($"   TakeWhileBelow({limit}) finished: {list.Count:N0} items");
    return list;
}
