# 📘 Learning Guide: LINQ Deep Dive (Deferred Execution)

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them. cs#04 taught you what `Where`, `Select` and `GroupBy` *do*. This one teaches **when they run**, which is the part that decides how fast your code is and, occasionally, whether it is correct at all.

## 1. What are we building?

A nightly report over a sensor feed: how many readings, the average, the coldest, the hottest, and how many were over 30°C. Five numbers.

The catch is the feed. Reading a sensor takes 20ms — it stands in for the things real reports read from: an HTTP call per item, a database cursor, a file being parsed line by line. The original asks LINQ for each of the five numbers separately, and LINQ obligingly walks the feed five times. Six readings become thirty-six sensor reads.

The fix is not "use fewer LINQ operators". It is knowing **where the boundary is** between a lazy query and real data, and crossing it once, on purpose.

## 2. Concepts you need first

### A query is a recipe, not a result

This is the whole project in one idea:

```csharp
var adults = people.Where(p => p.Age >= 18);   // NOTHING has happened yet
```

`adults` is not a list of adults. It is an object that *knows how* to produce adults when asked. The lambda has not run. `people` has not been touched. This is **deferred execution** (also called *lazy* evaluation).

JavaScript's array methods are the opposite: `people.filter(p => p.age >= 18)` runs immediately and hands you a new array. Every JS developer's instinct — "the variable holds the answer" — is wrong in LINQ, and it is wrong silently.

### Deferred operators vs immediate operators

The rule of thumb: **operators that return a sequence are lazy; operators that return a single value are immediate.**

| Deferred (return `IEnumerable<T>`) | Immediate (return a value) |
|---|---|
| `Where`, `Select`, `SelectMany` | `Count`, `Sum`, `Min`, `Max`, `Average` |
| `Take`, `Skip`, `TakeWhile`, `OrderBy`* | `First`, `Single`, `Any`, `All` |
| `Distinct`, `Concat`, `Reverse`* | `ToList`, `ToArray`, `ToDictionary` |
| `GroupBy`* | `Aggregate` |

\* these three are deferred but **buffering**: when they finally run, they must read the entire source before they can yield the first item (you cannot know the smallest element until you have seen them all).

Every immediate operator is one full walk of the source. Five of them is five walks.

### `Aggregate` — LINQ's `reduce`

```csharp
int total = numbers.Aggregate(0, (sum, n) => sum + n);
// JS: numbers.reduce((sum, n) => sum + n, 0)
```

Seed, then a function of `(accumulator, item)` applied to each item, then the final accumulator. It is the general-purpose fold: `Count`, `Sum`, `Min` and `Max` are all special cases of it. Which means **any number of statistics can share one pass** if you fold them into one accumulator object:

```csharp
readings.Aggregate(ReadingStats.Empty, (stats, r) => stats.Add(r, alertAbove));
```

One walk. Five numbers.

### `ToList()` — crossing the boundary on purpose

`ToList()` (and `ToArray()`) run the query right now and store the results. After that you have ordinary data: re-reading it costs nothing, and it can never change under you.

```csharp
List<Reading> readings = feed.Stream().ToList();   // pay once, here
```

This is called **materializing**. The mistake is not using it — it is using it *by accident* or *not at all*. A `ToList()` with a comment above it saying "the sensor costs 20ms per item; everything below re-reads this" is good code.

### Closures capture variables, not values

C#'s lambdas close over **the variable itself**, exactly like JavaScript's `let` (and unlike a value copied at capture time):

```csharp
decimal threshold = 30m;
var hot = readings.Where(r => r.Celsius > threshold);
threshold = 100m;
hot.Count();      // uses 100 — the query reads `threshold` when it RUNS
```

In JS this same trap is famous from `for (var i…) setTimeout(() => console.log(i))` printing the final `i` every time. Combine it with deferred execution and you get a bug with no crash, no warning and no obvious cause: the query and the assignment can be in different methods, written months apart.

### Some sequences can only be read once

A `List` can be walked a hundred times. A network stream, a `SqlDataReader`, a `File.ReadLines` enumerator part-way through — these produce items *as they go*. Walk one twice and you get an exception, or an empty second walk, or (worst) different data. The compiler cannot tell them apart: both are `IEnumerable<T>`. **If a method receives an `IEnumerable<T>` it did not create, it should walk it once or materialize it — never assume it can walk it twice.**

## 3. Walking through the original code

The feed is an iterator (project 30 teaches these properly). All you need here: it produces one reading at a time, prints a line each time, and sleeps 20ms.

```csharp
IEnumerable<Reading> readings = LoadReadings();
Console.WriteLine("query built — sensor readings produced so far: " + Meter.Produced);   // 0
```

Zero. The call ran no code at all. Then the report:

```csharp
Console.WriteLine($"readings : {readings.Count()}");                        // pass 1
Console.WriteLine($"average  : {readings.Average(r => r.Celsius):0.0}C");   // pass 2
Console.WriteLine($"coldest  : {readings.Min(r => r.Celsius):0.0}C");       // pass 3
Console.WriteLine($"hottest  : {readings.Max(r => r.Celsius):0.0}C");       // pass 4
Console.WriteLine($"alerts   : {readings.Count(r => r.Celsius > 30m)}");    // pass 5
```

Each line is an immediate operator, so each line runs the whole feed again. The output interleaves six "…reading the sensor" lines with each stat — thirty in total — and the run takes about a second and a half of pure sleeping.

Then the second trap:

```csharp
decimal alertAbove = 30m;
var alerts = readings.Where(r => r.Celsius > alertAbove);
alertAbove = 100m;                       // the "unrelated" line
Console.WriteLine($"alerts: {alerts.Count()}");    // 0 — there are 2
```

Nothing here is exotic. Every line is the kind of line people write.

## 4. What's wrong with it (in beginner terms)

**1. The work is invisible.** `readings.Average(...)` looks like reading a property. It is a full traversal of a slow source, and there are five of them on five consecutive lines. Costs you cannot see are costs nobody reviews.

**2. It gets worse with the size of the data, not the size of the code.** Six readings is a demo. The same five lines over a 100,000-row database cursor is five queries, and the fix is still three characters (`ToList`) that nobody thought about.

**3. The captured variable produces a wrong answer, not an error.** No exception, no warning, no crash. The report says zero alerts. Somebody trusts it.

**4. It only works because the source happens to be replayable.** Point those same five lines at a stream you can only read once and the first stat consumes it; the rest silently see an empty sequence. `Average` of nothing throws — but `Count` of nothing is a perfectly believable `0`.

## 5. Try it yourself first!

Before reading on, try fixing the original yourself. Hints, vaguest first:

1. 🌱 Add a line right after `LoadReadings()` that turns the query into data. What happens to the counter at the end?
2. 🌿 Now do it *without* the list: can five statistics be computed in one walk? (Reach for `Aggregate` and a small record to fold into.)
3. 🌳 For the threshold bug: two independent fixes exist — one stops the query from re-reading the variable, the other stops the variable from mattering. Apply both.
4. 🍎 Prove it. Wrap the feed in a class that counts how many times it is enumerated, then write a test that asserts the count is 1 after a full report. If you cannot assert it, the next refactor will quietly undo it.

## 6. Understanding the refactored solution

**`Statistics.cs`** — the report's maths, with no source of data in sight:

```csharp
public ReadingStats Add(Reading r, decimal alertAbove) => new(
    Count: Count + 1,
    Min: Count == 0 ? r.Celsius : Math.Min(Min, r.Celsius),
    ...
```

`ReadingStats` is an immutable record; `Add` folds one reading in and returns a new one. `Summarize` is then a one-liner over `Aggregate`, and `SummarizeTheSlowWay` — the original's five calls — is kept *only* so the tests can prove the two agree on the numbers and disagree on the work.

**`Program.cs`** — section A is the boundary, with the comment that makes it deliberate:

```csharp
// THE BOUNDARY. Everything above this line is a lazy stream that costs 20ms
// per item; everything below is an ordinary in-memory list.
List<Reading> readings = feed.Stream().ToList();
```

Section B does the same report with no list at all, straight off the lazy feed — because a single `Aggregate` only needs one pass. Section D is the counterweight: `First(r => r.Celsius > 30m)` on the lazy feed reads **two** sensors, because short-circuiting operators stop the source. `ToList()` there would have read six. There is no universally right answer, only the question: how many walks, and what does a walk cost?

**`Tests.cs`** — the interesting half is the enumeration counter:

```csharp
var counted = new CountingSource<Reading>(Sample());
Statistics.SummarizeTheSlowWay(counted, alertAbove: 30m);
Check.Equal(5, counted.Passes, "the original's five stats = five full enumerations");
```

That is a *performance property*, written as an ordinary assertion. There is also a test that builds a query and asserts `Passes == 0` — the fact that a query is a recipe, stated as a fact — and one that runs the same query twice and asserts `Passes == 2`.

## 7. Words you learned (glossary)

- **Deferred execution / lazy evaluation** — a query runs when it is enumerated, not when it is written.
- **Immediate operator** — one that runs the query on the spot: `Count`, `Sum`, `First`, `ToList`, `Aggregate`.
- **Deferred operator** — one that returns another query: `Where`, `Select`, `Take`.
- **Buffering operator** — deferred, but must read the whole source before yielding anything: `OrderBy`, `GroupBy`, `Reverse`.
- **Materializing** — running a query and storing the results (`ToList`, `ToArray`).
- **Enumeration / pass** — one complete walk of a sequence.
- **Multiple enumeration** — walking the same query more than once; the 5x bug.
- **`Aggregate`** — LINQ's fold/reduce: seed + `(accumulator, item)` function.
- **Closure** — a lambda that captures a variable from its surroundings, by reference to the variable, not a copy of its value.
- **Short-circuiting** — `First`/`Any`/`Take` stopping the source as soon as the answer is known.
- **Single-use sequence** — one that cannot be walked twice (streams, readers).
- **`GC.GetTotalMemory`** — a rough "how much memory is live" reading, used in project 30 to see materialization.

## 8. Experiments to try on the plane (no internet needed)

Run tests after each change: `dotnet run --project csharp/29-linq-deep-dive/refactored -- test`

1. **Feel the tax.** In the original, comment out four of the five stat lines and re-run. Expected: six sensor lines instead of thirty, and roughly a fifth of the time. Each stat you add back is a whole extra pass — that is the unit of cost.
2. **Remove the boundary.** In `Program.cs` section A, change `feed.Stream().ToList()` to `feed.Stream()` and change `List<Reading> readings` to `IEnumerable<Reading> readings`. Re-run. Expected: the counter climbs past 6 (each `PerSensor` group and each stat re-reads the sensor), and the demo slows down. Put it back and watch it drop to 6.
3. **Break the single pass and let the test catch it.** In `Statistics.Summarize`, replace the `Aggregate` body with a call to `SummarizeTheSlowWay(readings, alertAbove)`. Expected: the *numbers* tests still pass, and the enumeration test fails with `expected: 1, actual: 5`. A refactor that costs 5x performance and changes no answers is exactly the kind tests usually miss.
4. **Watch a stream get consumed.** Add to `Program.cs`: `var once = new SensorFeed().Stream().Where(r => r.Celsius > 0m); Console.WriteLine(once.Count()); Console.WriteLine(once.Count());` and print `feed.Produced` after each. Expected: 6 then 12 — the query re-ran. Now imagine the source was a network socket that had already been drained: the second `Count()` would say 0, and nothing would complain.
5. **Move the goalposts.** Re-create the original's bug in the refactor: in section C, change `.Where(...).ToList()` to `.Where(...)` (keep the `alertAbove = 100m;` line) and print `alerts.Count()`. Expected: 0 again. Undo. That two-character difference is the entire bug.
6. **A fold of your own.** Add `LongestGap` to `ReadingStats` — the biggest difference between consecutive readings — by keeping the previous reading in the accumulator. Expected: still one pass; the accumulator grows, the walk count does not. That is why folding beats "just add another LINQ call".
