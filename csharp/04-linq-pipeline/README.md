# CS 04 — linq-pipeline

**Lesson: questions about data are pipelines, not loop plumbing. LINQ is C#'s `filter`/`map`/`reduce` — plus the `GroupBy` you always hand-rolled.**

This is js#36 (log-analyzer) lite: same "answer questions about a list of
records" shape, now with the language doing the aggregation work.

## Run it

From the repo root:

```
dotnet run csharp/04-linq-pipeline/original.cs
dotnet run --project csharp/04-linq-pipeline/refactored
dotnet run --project csharp/04-linq-pipeline/refactored -- test
```

## What's wrong with the original?

It prints the right report — total per region, top product, average of the
big sales. The cost is the *how*:

- **Question 1 rebuilds project 03's parallel-lists bug**: `regionNames` +
  `regionTotals` glued by index, with a manual "seen this region?" scan.
  Grouping is such a common need that hand-rolling it should ring alarms.
- **Question 2 is a nested-loop pile**: for each sale, re-sum every sale of
  the same product, guard against double-counting with an `alreadyDone` list,
  and track the winner in `topProduct`/`topRevenue` flag variables. Three
  bookkeeping mechanisms for one sentence of intent.
- **Question 3 welds filter + sum + count + divide-by-zero-guard** into one
  loop with running totals.
- All three answers are computed *and printed* in the same breath — nothing
  returns data, so nothing is testable. And every new question means another
  15-line loop block.

## What changed in the refactor

1. **`Sale` became a one-line record**; the report became `SalesReport`, a
   class of pure methods that take `IEnumerable<Sale>` and *return data*.
2. **Each question is one LINQ pipeline**:
   - `TotalByRegion` → `GroupBy(...).ToDictionary(g => g.Key, g => g.Sum(...))`
   - `TopProduct` → `GroupBy(...).OrderByDescending(g => g.Sum(...)).First().Key`
   - `AverageOver` → `Where(...).Select(...).Average()` with an explicit
     empty-case answer (0) instead of a crash
   - `ProductsIn` → `Where`/`Select`/`Distinct`/`OrderBy` chained like JS
     array methods
3. **Edge cases became visible decisions**: empty input returns an empty
   dictionary / 0 / an empty list — except `TopProduct`, which *throws*,
   because "the best of nothing" has no honest answer. A test pins each
   behavior, including the throw.
4. **`Program.cs` only prints.** Adding a new question = one new method +
   one test, not another loop block spliced into the output code.

## Key takeaway

You already think in pipelines — `sales.filter(...).map(...)` — so keep
thinking that way in C#: `Where` = `filter`, `Select` = `map`, `Sum`/
`Average`/`Aggregate` = `reduce`, `OrderBy` = `sort` (without mutating!),
and `GroupBy` replaces the whole parallel-lists dance. When a loop exists
only to build a temp list, a flag, or a running total, it's a pipeline
that hasn't been written yet.
