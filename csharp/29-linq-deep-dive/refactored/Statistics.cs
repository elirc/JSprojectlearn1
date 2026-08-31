// The report's maths, as pure functions over readings. No Console, no sensor,
// no clock — just numbers in, numbers out, which is why Tests.cs can pin every
// digit of it without waiting 20ms for anything.

public readonly record struct Reading(string Sensor, decimal Celsius);

/// Everything the nightly report needs, in one value. Building it in ONE pass
/// is the whole point: five separate LINQ calls means five separate walks.
public sealed record ReadingStats(int Count, decimal Min, decimal Max, decimal Sum, int AlertCount)
{
    public static readonly ReadingStats Empty = new(0, 0m, 0m, 0m, 0);

    /// Averages are derived, not stored — Sum and Count already know it.
    /// (Guarding Count == 0 is why this is a property and not a field:
    /// LINQ's own Average() throws on an empty sequence.)
    public decimal Average => Count == 0 ? 0m : Sum / Count;

    /// Fold one more reading in. The Count == 0 checks are what make the seed
    /// honest: an empty stats object has no meaningful Min or Max yet, so the
    /// first reading defines both instead of losing to a sentinel.
    public ReadingStats Add(Reading r, decimal alertAbove) => new(
        Count: Count + 1,
        Min: Count == 0 ? r.Celsius : Math.Min(Min, r.Celsius),
        Max: Count == 0 ? r.Celsius : Math.Max(Max, r.Celsius),
        Sum: Sum + r.Celsius,
        AlertCount: AlertCount + (r.Celsius > alertAbove ? 1 : 0));
}

public static class Statistics
{
    /// ONE pass. Aggregate is LINQ's fold: start from a seed, apply a function
    /// to (accumulator, item) for each item, return the final accumulator.
    /// JS calls it `array.reduce((acc, x) => ..., seed)` — same operator, and
    /// like reduce it consumes the source exactly once, so it is safe to point
    /// at a stream, a file, a socket, or anything else you can only read once.
    public static ReadingStats Summarize(IEnumerable<Reading> readings, decimal alertAbove)
        => readings.Aggregate(ReadingStats.Empty, (stats, reading) => stats.Add(reading, alertAbove));

    /// The original's five-pass version, kept ONLY so the tests can prove the
    /// two agree on the numbers and disagree on the work. Never call this on
    /// an expensive or single-use sequence: it walks `readings` five times
    /// (and Min/Max throw on an empty one).
    public static ReadingStats SummarizeTheSlowWay(IEnumerable<Reading> readings, decimal alertAbove) => new(
        Count: readings.Count(),
        Min: readings.Min(r => r.Celsius),
        Max: readings.Max(r => r.Celsius),
        Sum: readings.Sum(r => r.Celsius),
        AlertCount: readings.Count(r => r.Celsius > alertAbove));

    /// Per-sensor report lines. GroupBy is a single pass too — it buckets as it
    /// goes — but it BUFFERS: every item is held until the source ends, so this
    /// is a "materializing" operator in all but name. Worth knowing before you
    /// aim it at a 40GB log file.
    public static IReadOnlyList<string> PerSensor(IReadOnlyList<Reading> readings, decimal alertAbove) =>
        readings
            .GroupBy(r => r.Sensor)
            .OrderBy(g => g.Key, StringComparer.Ordinal)
            .Select(g =>
            {
                var s = Summarize(g, alertAbove);     // one pass per group, over a buffer
                return $"{g.Key,-6} n={s.Count} avg={s.Average:0.0}C max={s.Max:0.0}C alerts={s.AlertCount}";
            })
            .ToList();
}
