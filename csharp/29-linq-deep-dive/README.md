# CS 29 — linq-deep-dive

**Lesson: a LINQ query is a recipe, not a result. Five stats over one lazy
sequence = five full enumerations — so materialize once, deliberately, at a
named boundary, or fold the whole report into a single `Aggregate` pass.**

Follows cs#04 (linq-pipeline), which taught the operators. This one teaches
*when they actually run* — the half that decides whether your report takes
400ms or two seconds.

## Run it

```
dotnet run csharp/29-linq-deep-dive/original.cs
dotnet run --project csharp/29-linq-deep-dive/refactored
dotnet run --project csharp/29-linq-deep-dive/refactored -- test
```

The original prints a line every time the sensor produces a reading. There
are six readings. Count the lines.

## What's wrong with the original?

1. **Five stats, five enumerations, 36 sensor reads for a 6-reading report.**
   `readings.Count()`, `.Average()`, `.Min()`, `.Max()`, `.Count(predicate)` —
   each one walks the sequence from the beginning, re-running the 20ms-per-item
   feed. Nothing in the code *looks* like a loop; five of them are there.
2. **The variable that moved.** `var alerts = readings.Where(r => r.Celsius >
   alertAbove);` builds a query that captures the **variable** `alertAbove`,
   not its value. Forty lines later somebody reuses that variable, and the
   query — which has still never run — quietly changes its meaning. The demo
   asks for alerts over 30°C and is told there are none. There are two.
3. **The expensive source is never marked as expensive.** `IEnumerable<T>`
   looks identical whether it is a `List` in memory or a sensor, a socket, or
   a `SqlDataReader` you may only read once. The type system will not warn
   you; the only defence is knowing where the boundary is.

## What changed in the refactor

- **One deliberate `ToList()` at the boundary**, with a comment saying why.
  Above it: a lazy 20ms-per-item stream. Below it: an ordinary list that costs
  nothing to re-read. Sensor reads drop from 36 to 6.
- **`Statistics.Summarize` is a single `Aggregate`** — JS's `reduce` — folding
  count, min, max, sum and alert count into one `ReadingStats` record in one
  pass. It can therefore be pointed straight at the lazy feed with no list at
  all, which is the version you want when the source is huge.
- **The threshold is passed as an argument** and the filtered result is
  materialized on the spot, so no later assignment can rewrite history.
- **A `CountingSource<T>` wrapper in the tests** counts enumerations, so
  "walks its input exactly once" is an *assertion*, not a comment. Performance
  claims nobody can assert on are performance claims that rot.
- **Explicit notes on when NOT to materialize**: `ToList()` on a lazy source
  means "produce everything, now". If you only need the first match, `First`
  on the lazy feed reads two sensors instead of six.

## Key takeaway

Deferred execution is LINQ's best feature and its sharpest edge. Ask one
question of every query you write: *how many times will this be walked, and
what does one walk cost?* Once → stay lazy and let short-circuiting operators
stop the source early. More than once → cross the boundary on purpose with
`ToList()`. Everything else — the 5x reports, the captured variable that
moved, the stream that was already consumed — is that question going
unasked.
