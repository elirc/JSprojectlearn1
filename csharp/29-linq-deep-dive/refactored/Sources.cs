// Two sequences you can watch: one that costs real time (the demo's sensor),
// and one that counts how often it is walked (the tests' lie detector).

/// The expensive feed from original.cs, with the Console noise removed and the
/// counter promoted to a real property. Still lazy: calling Stream() produces
/// nothing at all until somebody enumerates the result.
public sealed class SensorFeed
{
    private static readonly (string Sensor, decimal Celsius)[] Raw =
    {
        ("north", 18.5m), ("north", 31.2m), ("south", 27.0m),
        ("south", 34.8m), ("roof", 12.4m), ("roof", 22.1m),
    };

    private readonly int delayMs;

    public SensorFeed(int delayMs = 0) => this.delayMs = delayMs;

    /// How many readings this feed has actually produced, ever. The number the
    /// original could not keep down.
    public int Produced { get; private set; }

    public IEnumerable<Reading> Stream()
    {
        foreach (var (sensor, celsius) in Raw)
        {
            Produced++;
            if (delayMs > 0) Thread.Sleep(delayMs);   // a sensor / HTTP call / DB row
            yield return new Reading(sensor, celsius);
        }
    }
}

/// A sequence wrapper that records how it is used: how many enumerations were
/// started (Passes) and how many items were handed out (ItemsProduced).
/// Wrapping the real thing in a counter is the standard trick for asserting
/// "this code walks its input exactly once" — a fact no assertion about the
/// RESULT could ever catch.
public sealed class CountingSource<T> : System.Collections.Generic.IEnumerable<T>
{
    private readonly IReadOnlyList<T> items;

    public CountingSource(params T[] items) => this.items = items;

    public int Passes { get; private set; }
    public int ItemsProduced { get; private set; }

    // Because this method is an iterator, its body does not run when
    // GetEnumerator() is CALLED — it runs on the first MoveNext(). So Passes
    // counts enumerations that really started, not queries that were merely
    // built. That distinction is exactly what this project is about.
    public IEnumerator<T> GetEnumerator()
    {
        Passes++;
        foreach (var item in items)
        {
            ItemsProduced++;
            yield return item;
        }
    }

    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() => GetEnumerator();
}
