// ============================================================================
// CS 29 — linq-deep-dive — ORIGINAL (compiles, runs... and does the work 5x)
// Run from repo root:  dotnet run csharp/29-linq-deep-dive/original.cs
// ============================================================================
// A nightly report over a sensor feed. Reading a sensor is SLOW (20ms each),
// so the feed prints a line every time it produces a value. There are only 6
// readings — watch how many times the sensor gets asked for them.
//
// Nothing here is "wrong" in the compiler's eyes. The bug is that a LINQ query
// is a RECIPE, not a RESULT: every stat below re-runs the whole recipe.

using System.Diagnostics;

// This call runs NO code. It builds an iterator and hands it back — the first
// reading is not produced until somebody enumerates. (Count the printed lines:
// zero so far.)
IEnumerable<Reading> readings = LoadReadings();
Console.WriteLine("query built — sensor readings produced so far: " + Meter.Produced);
Console.WriteLine();

var sw = Stopwatch.StartNew();

Console.WriteLine("=== the nightly sensor report ===");
Console.WriteLine($"readings : {readings.Count()}");                        // pass 1
Console.WriteLine($"average  : {readings.Average(r => r.Celsius):0.0}C");   // pass 2
Console.WriteLine($"coldest  : {readings.Min(r => r.Celsius):0.0}C");       // pass 3
Console.WriteLine($"hottest  : {readings.Max(r => r.Celsius):0.0}C");       // pass 4
Console.WriteLine($"alerts   : {readings.Count(r => r.Celsius > 30m)}");    // pass 5

sw.Stop();
Console.WriteLine();
Console.WriteLine($"6 readings exist. The sensor produced {Meter.Produced} of them.");
Console.WriteLine($"Five stats = five full enumerations = {sw.ElapsedMilliseconds}ms of sleeping.");
Console.WriteLine("Every `readings.Something()` re-ran the whole feed from scratch.");

// ---------------------------------------------------------------------------
// Surprise #2: the query does not remember the variable's VALUE, it remembers
// the VARIABLE. Deferred execution reads it whenever the query finally runs.
// ---------------------------------------------------------------------------
Console.WriteLine();
Console.WriteLine("=== the alert threshold that moved ===");

decimal alertAbove = 30m;
var alerts = readings.Where(r => r.Celsius > alertAbove);   // still nothing runs
Console.WriteLine($"alert query built with alertAbove = {alertAbove}");

// ...forty lines of unrelated code later, someone reuses the same variable for
// a different calculation. It looks harmless. It is not.
alertAbove = 100m;

Console.WriteLine($"alerts over {30m}C: {alerts.Count()}");   // says 0. There are 2.
Console.WriteLine("Expected 2 (31.2C and 34.8C). Got 0 — because `alertAbove` was");
Console.WriteLine("100 by the time the query actually ran. The lambda captured the");
Console.WriteLine("variable, not the number, and nothing about the code LOOKS wrong.");

Console.WriteLine();
Console.WriteLine($"total sensor readings produced for a 6-reading report: {Meter.Produced}");

// The expensive source. Each `yield return` hands one item to whoever is
// enumerating and then FREEZES here until the next item is requested.
IEnumerable<Reading> LoadReadings()
{
    (string Sensor, decimal Celsius)[] raw =
    {
        ("north", 18.5m), ("north", 31.2m), ("south", 27.0m),
        ("south", 34.8m), ("roof", 12.4m), ("roof", 22.1m),
    };

    foreach (var (sensor, celsius) in raw)
    {
        Meter.Produced++;
        Console.WriteLine($"   ...reading the {sensor} sensor (#{Meter.Produced})");
        Thread.Sleep(20);                 // a real sensor / HTTP call / DB row
        yield return new Reading(sensor, celsius);
    }
}

record Reading(string Sensor, decimal Celsius);

// A global counter, so the demo can prove how much work really happened.
static class Meter
{
    public static int Produced;
}
