# 🏋️ Practice: LINQ Deep Dive (Deferred Execution)

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking.

## Exercises

### ⭐ 1. Two more numbers for free (warm-up)

Add `Spread` (hottest minus coldest) and `AlertRate` (alerts as a fraction of readings) to `ReadingStats`. Neither may add a constructor parameter, a LINQ call, or an enumeration: both are already implied by numbers the fold collects.

Practices: derived properties vs "just add another LINQ call", and the habit of asking "does this need a pass?" before writing one.

Hint: they are computed properties like `Average`, with the same `Count == 0` guard. `AlertRate` needs one cast — integer division would report every rate as 0.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var spread = Statistics.Summarize([new Reading("a", 10m), new Reading("b", 36m), new Reading("c", 20m)], 30m);
Check.Equal(26m, spread.Spread, "spread is Max - Min");
Check.Equal(1m / 3m, spread.AlertRate, "one alert in three readings");
var none = Statistics.Summarize([], 30m);
Check.Equal(0m, none.Spread, "an empty report has no spread instead of a crash");
Check.Equal(0m, none.AlertRate, "...and no rate, instead of a divide by zero");
```

### ⭐⭐ 2. Fold one more fact in (core)

The report should name the hottest sensor, not just the temperature. Add `HottestSensor` to `ReadingStats` — a real constructor parameter this time — and set it in `Add`. Still one pass. You will also have to update `SummarizeTheSlowWay`, which builds the record positionally; that is the point of keeping it around.

Practices: growing an accumulator instead of adding a pass, and feeling why two implementations of the same thing must be kept honest by a test.

Hint: inside `Add`, the new sensor wins exactly when the new reading also becomes the new `Max` — including the very first reading, when `Count == 0`. In `SummarizeTheSlowWay`, `readings.MaxBy(r => r.Celsius).Sensor` does it in one more (sixth!) pass.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var hot = Statistics.Summarize([new Reading("north", 10m), new Reading("roof", 36m), new Reading("south", 20m)], 30m);
Check.Equal("roof", hot.HottestSensor, "the fold remembered which sensor was hottest");
Check.Equal("", Statistics.Summarize([], 30m).HottestSensor, "an empty report names nobody");
Check.Equal("only", Statistics.Summarize([new Reading("only", -5m)], 30m).HottestSensor, "a single reading is the hottest one");
var counted = new CountingSource<Reading>(new Reading("a", 1m), new Reading("b", 2m));
Statistics.Summarize(counted, 30m);
Check.Equal(1, counted.Passes, "and it still costs exactly one pass");
```

### ⭐⭐ 3. A sequence that refuses a second walk (core)

Write `SingleUse<T> : IEnumerable<T>` in `Sources.cs` — it wraps a sequence and throws `InvalidOperationException` the *second* time anybody starts enumerating it. Then use it to prove, as a test, that `Summarize` is safe to point at a network stream and `SummarizeTheSlowWay` is not.

Practices: modelling a real constraint (streams, readers) as a type you can test against, and the difference between "works on my `List`" and "works on the source I will actually get".

Hint: unlike `CountingSource`, `GetEnumerator` here must **not** be an iterator method — an iterator's body would not run until the first `MoveNext()`, and the guard has to fire when enumeration *starts*. Set a `bool used` flag and `return source.GetEnumerator();`.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
Reading[] sample = [new("a", 10m), new("b", 20m), new("c", 36m)];
var oneShot = new SingleUse<Reading>(sample);
Check.Equal(3, Statistics.Summarize(oneShot, 30m).Count, "Summarize needs exactly one walk, so a stream is fine");
Check.Throws<InvalidOperationException>(
    () => Statistics.SummarizeTheSlowWay(new SingleUse<Reading>(sample), 30m),
    "the five-pass version dies on the second walk — as it would on a real stream");
Check.Throws<InvalidOperationException>(
    () => { var s = new SingleUse<Reading>(sample); s.Count(); s.Count(); },
    "two walks is two walks, however innocent they look");
```

### ⭐⭐⭐ 4. The number you cannot stream (challenge)

Add `Statistics.Median(IReadOnlyList<Reading> readings)`. A median needs every value sorted, so it cannot be folded — and the signature should say so: take `IReadOnlyList<Reading>`, not `IEnumerable<Reading>`, so the compiler makes the caller materialize first.

Practices: choosing a parameter type as documentation, and recognising the operations (median, percentile, shuffle, "last N") that genuinely require the whole set.

Hint: `readings.Select(r => r.Celsius).OrderBy(c => c).ToList()`, then pick the middle — or average the two middles when the count is even. Guard the empty case.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
Check.Equal(20m, Statistics.Median([new("a", 10m), new("b", 36m), new("c", 20m)]), "odd count takes the middle value");
Check.Equal(15m, Statistics.Median([new("a", 10m), new("b", 20m)]), "even count averages the two middles");
Check.Equal(0m, Statistics.Median([]), "an empty report has no median");
Check.Equal(10m, Statistics.Median([new("a", 10m)]), "one reading is its own median");
// And the design point, in a comment you can verify by trying it:
// Statistics.Median(someSensorFeed.Stream())  ->  does not compile.
```

### ⭐⭐⭐ 5. Lazy AND replayable (challenge)

`ToList()` fixes multiple enumeration by giving up laziness: it produces everything, immediately. Write `Memoized<T> : IEnumerable<T>` that does both — it pulls from the source only as far as the consumer asks, caches every item it has seen, and serves later walks from the cache without touching the source again.

Practices: an iterator that reads its own state (`yield return` inside a loop that may be re-entered), and the realisation that "lazy" and "replayable" are separate properties you can have at once.

Hint: hold the source's `IEnumerator<T>`, a `List<T> cache` and a `bool exhausted`. In `GetEnumerator`, walk an index `i`: if `i` is inside the cache, yield the cached item; if not, pull one more from the source (caching it) or finish. Not thread-safe, and that is a fair trade for twelve lines.

Check it offline: add to `Tests.cs` — all should pass:
```csharp
var feed = new SensorFeed();                       // no delay, but it counts
var memo = new Memoized<Reading>(feed.Stream());
var slow = Statistics.SummarizeTheSlowWay(memo, 30m);   // five walks!
Check.Equal(6, slow.Count, "the numbers are right");
Check.Equal(6, feed.Produced, "...and the sensor was read six times, not thirty");

var peek = new SensorFeed();
var lazyMemo = new Memoized<Reading>(peek.Stream());
_ = lazyMemo.First();
Check.Equal(1, peek.Produced, "still lazy: one item asked for, one item produced");
Check.Equal(6, lazyMemo.Count(), "a later full walk fills the rest of the cache");
Check.Equal(6, peek.Produced, "and a third walk costs the sensor nothing");
```

## Solutions

### 1. Two more numbers for free

```csharp
// In ReadingStats, next to Average:
public decimal Spread => Count == 0 ? 0m : Max - Min;
public decimal AlertRate => Count == 0 ? 0m : (decimal)AlertCount / Count;
```

WHY: both are functions of data the fold already has, so they cost nothing and cannot drift out of sync with the numbers they are derived from — the same reason `Average` is a property instead of a sixth `Sum`-like field. The cast in `AlertRate` matters: `AlertCount / Count` is integer division, which would report 1-in-3 as `0` and pass a sloppy test that only checked "less than one". And note what you did *not* do: reach for `readings.Count(r => r.Celsius > threshold) / (decimal)readings.Count()`, which is two more passes over the source for a number you already own.

### 2. Fold one more fact in

```csharp
public sealed record ReadingStats(
    int Count, decimal Min, decimal Max, decimal Sum, int AlertCount, string HottestSensor)
{
    public static readonly ReadingStats Empty = new(0, 0m, 0m, 0m, 0, "");

    public ReadingStats Add(Reading r, decimal alertAbove) => new(
        Count: Count + 1,
        Min: Count == 0 ? r.Celsius : Math.Min(Min, r.Celsius),
        Max: Count == 0 ? r.Celsius : Math.Max(Max, r.Celsius),
        Sum: Sum + r.Celsius,
        AlertCount: AlertCount + (r.Celsius > alertAbove ? 1 : 0),
        HottestSensor: Count == 0 || r.Celsius > Max ? r.Sensor : HottestSensor);
}

// SummarizeTheSlowWay grows a SIXTH pass to keep up:
HottestSensor: readings.MaxBy(r => r.Celsius).Sensor);
```

WHY: the accumulator is where "one more thing to know about the data" belongs — adding a field costs no extra traversal, while adding a LINQ call costs a whole one. The `Count == 0 ||` half of the condition is the classic seed bug: without it the first reading loses to `Max`'s meaningless `0m` and a report of sub-zero temperatures names nobody. Notice the cost asymmetry the exercise exposes: the fold absorbed the new fact for free, the multi-pass version needed a sixth walk — and the test that compares the two is what stops them quietly disagreeing.

### 3. A sequence that refuses a second walk

```csharp
/// Streams, sockets and DB readers can only be walked once. This is that
/// constraint, as a type you can point tests at.
public sealed class SingleUse<T> : IEnumerable<T>
{
    private readonly IEnumerable<T> source;
    private bool used;

    public SingleUse(IEnumerable<T> source) => this.source = source;

    // NOT an iterator method: no `yield` anywhere, so this body runs the moment
    // somebody calls GetEnumerator() — which is exactly when the guard must fire.
    public IEnumerator<T> GetEnumerator()
    {
        if (used) throw new InvalidOperationException("this sequence has already been consumed");
        used = true;
        return source.GetEnumerator();
    }

    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() => GetEnumerator();
}
```

WHY: the iterator-vs-plain-method distinction is the subtle half. Written with `yield return`, the guard would not run until the first `MoveNext()`, so `foreach (var x in s) break;` twice could slip past it — and worse, `Count()` on an empty source would behave differently from `Count()` on a full one. The test it enables is the valuable part: "walks its input once" stops being a comment about `Summarize` and becomes a property that a future refactor cannot quietly break. Real `IEnumerable`s that behave this way are everywhere (`File.ReadLines` mid-iteration, `SqlDataReader`, `Channel.ReadAllAsync`), and none of them are marked by the type system.

### 4. The number you cannot stream

```csharp
/// IReadOnlyList, not IEnumerable, ON PURPOSE: a median needs every value
/// sorted, so the caller must materialize first — and now the compiler says so.
public static decimal Median(IReadOnlyList<Reading> readings)
{
    if (readings.Count == 0) return 0m;
    var sorted = readings.Select(r => r.Celsius).OrderBy(c => c).ToList();
    int mid = sorted.Count / 2;
    return sorted.Count % 2 == 1
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2m;
}
```

WHY: this is the exception that proves the project's rule. Count, sum, min, max and alerts can all be folded; median, percentiles, "the last 10", shuffling and sorting cannot — they need the whole set. The design move is to make the requirement visible in the *signature* rather than hiding it behind an `IEnumerable<T>` that will be walked twice (once for `Count()`, once for `OrderBy`) and will misbehave on a stream. A parameter type is documentation the compiler enforces: `Median(feed.Stream())` does not compile, and the caller is pushed to the `ToList()` they needed anyway.

### 5. Lazy AND replayable

```csharp
/// Lazy like a query, replayable like a list: items are pulled from the source
/// only as far as anyone has asked, and remembered for every later walk.
public sealed class Memoized<T> : IEnumerable<T>
{
    private readonly IEnumerator<T> source;
    private readonly List<T> cache = new();
    private bool exhausted;

    public Memoized(IEnumerable<T> source) => this.source = source.GetEnumerator();

    public IEnumerator<T> GetEnumerator()
    {
        int i = 0;
        while (true)
        {
            if (i == cache.Count)                       // past what we have seen
            {
                if (exhausted) yield break;             // ...and there is no more
                if (!source.MoveNext())
                {
                    exhausted = true;
                    source.Dispose();
                    yield break;
                }
                cache.Add(source.Current);              // one more item, remembered
            }
            yield return cache[i];
            i++;
        }
    }

    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() => GetEnumerator();
}
```

WHY: `ToList()` and laziness look like opposites — one produces everything now, the other produces nothing until asked — and this class is the proof that they are not. Each walk reads from the cache while it can and extends it by exactly one item when it must, so five passes over a six-item feed cost six sensor reads, and `First()` still costs one. The catch worth knowing: it is not thread-safe (two threads extending the cache at once would race), it holds every item it has yielded (so it is unusable on an infinite sequence — see project 30), and it must own its enumerator, which is why the constructor takes `IEnumerable<T>` but stores `GetEnumerator()`. .NET has no built-in for this; when you need it in production the usual answers are `System.Reactive`'s `Replay` or an explicit `ToList()` — but writing it once explains deferred execution better than any amount of reading about it.
