// Tests.cs — two kinds of assertion. The usual kind checks the ANSWER; the
// interesting kind checks how much WORK was done to get it, by wrapping the
// source in a counter. Performance facts you cannot assert on tend to rot.
public static class Tests
{
    // A fixed, boring dataset: n=3, sum=66, avg=22, min=10, max=36, one alert.
    private static Reading[] Sample() =>
    [
        new("a", 10m),
        new("b", 20m),
        new("c", 36m),
    ];

    public static int Run()
    {
        Console.WriteLine("the maths");
        var s = Statistics.Summarize(Sample(), alertAbove: 30m);
        Check.Equal(3, s.Count, "Count counts every reading");
        Check.Equal(10m, s.Min, "Min finds the coldest");
        Check.Equal(36m, s.Max, "Max finds the hottest");
        Check.Equal(66m, s.Sum, "Sum adds them all up");
        Check.Equal(22m, s.Average, "Average is Sum / Count");
        Check.Equal(1, s.AlertCount, "AlertCount counts readings strictly above the threshold");

        Console.WriteLine("edges the seed has to survive");
        var empty = Statistics.Summarize([], alertAbove: 30m);
        Check.Equal(0, empty.Count, "an empty sequence folds to Count 0");
        Check.Equal(0m, empty.Average, "and to Average 0 instead of a divide-by-zero");
        var one = Statistics.Summarize([new Reading("a", 7.5m)], alertAbove: 30m);
        Check.Equal(7.5m, one.Min, "a single reading defines Min");
        Check.Equal(7.5m, one.Max, "...and Max — the seed never leaks a sentinel");
        var atThreshold = Statistics.Summarize([new Reading("a", 30m)], alertAbove: 30m);
        Check.Equal(0, atThreshold.AlertCount, "exactly 30C is not 'above 30C' — the boundary is pinned");

        Console.WriteLine("the fold agrees with the five-pass original");
        var slow = Statistics.SummarizeTheSlowWay(Sample(), alertAbove: 30m);
        Check.Equal(slow, s, "one Aggregate produces exactly the numbers five LINQ calls do");

        Console.WriteLine("how many times the source gets walked");
        var counted = new CountingSource<Reading>(Sample());
        Statistics.SummarizeTheSlowWay(counted, alertAbove: 30m);
        Check.Equal(5, counted.Passes, "the original's five stats = five full enumerations");
        Check.Equal(15, counted.ItemsProduced, "3 readings, produced 15 times");

        var once = new CountingSource<Reading>(Sample());
        Statistics.Summarize(once, alertAbove: 30m);
        Check.Equal(1, once.Passes, "Aggregate walks the source exactly once");
        Check.Equal(3, once.ItemsProduced, "3 readings, produced 3 times — the 5x tax is gone");

        var boundary = new CountingSource<Reading>(Sample());
        var materialized = boundary.ToList();                 // pay once, on purpose
        Statistics.SummarizeTheSlowWay(materialized, alertAbove: 30m);
        Statistics.SummarizeTheSlowWay(materialized, alertAbove: 30m);
        Check.Equal(1, boundary.Passes, "after ToList(), even ten passes never touch the source again");

        Console.WriteLine("deferred execution, stated as facts");
        var lazy = new CountingSource<Reading>(Sample());
        var query = lazy.Where(r => r.Celsius > 5m).Select(r => r.Celsius);
        Check.Equal(0, lazy.Passes, "building a query runs NOTHING — Where/Select are recipes");
        _ = query.Count();
        Check.Equal(1, lazy.Passes, "asking for a result is what runs it");
        _ = query.Count();
        Check.Equal(2, lazy.Passes, "asking again runs it AGAIN — queries are not results");

        var stopper = new CountingSource<Reading>(Sample());
        var firstMatch = stopper.First(r => r.Celsius >= 20m);
        Check.Equal(20m, firstMatch.Celsius, "First finds the right reading");
        Check.Equal(2, stopper.ItemsProduced, "...having produced only 2 of the 3 — short-circuiting is why laziness pays");

        Console.WriteLine("the captured variable that moved");
        decimal threshold = 30m;
        var deferred = Sample().Where(r => r.Celsius > threshold);   // a recipe...
        var pinned = Sample().Where(r => r.Celsius > threshold).ToList();  // ...and a result
        threshold = 100m;
        Check.Equal(0, deferred.Count(), "the deferred query re-read the variable and saw 100 — the original's bug");
        Check.Equal(1, pinned.Count, "the materialized one kept the answer it computed at 30");

        Console.WriteLine("per-sensor grouping");
        var lines = Statistics.PerSensor(
            [new("north", 10m), new("north", 40m), new("roof", 5m)], alertAbove: 30m);
        Check.Equal(2, lines.Count, "one line per sensor");
        Check.Equal("north  n=2 avg=25.0C max=40.0C alerts=1", lines[0], "groups are summarized with the same single-pass fold");
        Check.Equal("roof   n=1 avg=5.0C max=5.0C alerts=0", lines[1], "and ordered by sensor name");

        return Check.Summary();
    }
}
