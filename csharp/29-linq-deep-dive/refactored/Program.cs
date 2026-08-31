if (args.Contains("test")) { Environment.Exit(Tests.Run()); }

// Program.cs — the same nightly report, with every enumeration accounted for.
// Rule of thumb: a lazy query may be walked ONCE for free. If you need it
// twice, materialize it (`ToList()`) deliberately, at a named boundary, with
// a comment saying why — or fold it into one pass with Aggregate.

Console.WriteLine("=== A. materialize once at the boundary ===");

var feed = new SensorFeed(delayMs: 20);
var sw = System.Diagnostics.Stopwatch.StartNew();

// THE BOUNDARY. Everything above this line is a lazy stream that costs 20ms
// per item; everything below is an ordinary in-memory list that costs nothing
// to re-read. ToList() is where we pay, once, on purpose.
List<Reading> readings = feed.Stream().ToList();

sw.Stop();
Console.WriteLine($"sensor readings produced: {feed.Produced}   ({sw.ElapsedMilliseconds}ms)");

var stats = Statistics.Summarize(readings, alertAbove: 30m);
Console.WriteLine($"readings : {stats.Count}");
Console.WriteLine($"average  : {stats.Average:0.0}C");
Console.WriteLine($"coldest  : {stats.Min:0.0}C");
Console.WriteLine($"hottest  : {stats.Max:0.0}C");
Console.WriteLine($"alerts   : {stats.AlertCount}");
foreach (var line in Statistics.PerSensor(readings, alertAbove: 30m))
    Console.WriteLine($"  {line}");
Console.WriteLine($"sensor readings produced, after all of that: {feed.Produced}  (was 36 in the original)");

Console.WriteLine();
Console.WriteLine("=== B. or skip the list entirely: one fold, one pass ===");

// Summarize is a single Aggregate, so it can consume an expensive lazy source
// directly — no list, no second walk, no buffering of six (or six million)
// readings. This is the version to reach for when the source is huge.
var streamed = new SensorFeed(delayMs: 20);
var streamStats = Statistics.Summarize(streamed.Stream(), alertAbove: 30m);
Console.WriteLine($"same numbers straight off the stream: n={streamStats.Count} avg={streamStats.Average:0.0}C alerts={streamStats.AlertCount}");
Console.WriteLine($"sensor readings produced: {streamed.Produced}   (one pass, zero lists)");

Console.WriteLine();
Console.WriteLine("=== C. the alert threshold that no longer moves ===");

decimal alertAbove = 30m;
// Two fixes, both visible: the value is passed as an argument (so the query
// cannot read it again later), and ToList() runs the filter NOW instead of
// whenever someone happens to ask.
List<Reading> alerts = readings.Where(r => r.Celsius > alertAbove).ToList();
alertAbove = 100m;                                  // the "unrelated" line, again
Console.WriteLine($"alerts over 30C: {alerts.Count}   (the original said 0 here)");
Console.WriteLine($"and they are: {string.Join(", ", alerts.Select(a => $"{a.Sensor} {a.Celsius}C"))}");

Console.WriteLine();
Console.WriteLine("=== D. when NOT to materialize ===");

// ToList() on a lazy source means "produce EVERYTHING, now". If you only need
// the first match, that is the most expensive possible way to find it: laziness
// plus a short-circuiting operator (First/Any/Take) stops the source dead.
var peek = new SensorFeed(delayMs: 20);
Reading first = peek.Stream().First(r => r.Celsius > 30m);
Console.WriteLine($"first alert: {first.Sensor} {first.Celsius}C");
Console.WriteLine($"sensor readings produced: {peek.Produced}   (stopped as soon as it found one)");
Console.WriteLine();
Console.WriteLine("Materialize when: you need the data more than once, the source is");
Console.WriteLine("single-use (a stream/reader), or a captured variable might move.");
Console.WriteLine("Stay lazy when: the source is huge or endless, or you only need a");
Console.WriteLine("prefix (First / Any / Take) — that is project 30's whole story.");
