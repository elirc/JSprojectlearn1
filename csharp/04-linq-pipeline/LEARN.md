# 📘 Learning Guide: LINQ Pipeline

Read this before or alongside the README — the README assumes you know these concepts; this file teaches them.

## 1. What are we building?

A tiny sales report. The data is eight hard-coded sales — each a product, a region, and an amount — and the program answers three questions: what did each region sell in total? which product earned the most? what's the average of the "big" sales (over 100)? The original answers with nested loops and bookkeeping variables. The refactor answers with **LINQ** — the C# feature you will use more than any other, and the one JS developers fall in love with fastest, because you already know its soul: `filter`, `map`, `reduce`.

## 2. Concepts you need first

(Projects 01–03 assumed: records, `List<T>`, `Dictionary<K,V>`, lambdas made a cameo in 03's tests.)

### Lambdas, properly this time
A **lambda** is an inline function value. JS: `s => s.amount > 100`. C#:

```csharp
s => s.Amount > 100          // one parameter, expression body — IDENTICAL shape
(a, b) => a + b              // two parameters
```

The compiler infers the types from context. Lambdas are the arguments LINQ lives on.

### What LINQ is
**LINQ** (Language INtegrated Query) is a set of methods available on every collection — arrays, lists, dictionaries, anything enumerable — for querying and transforming data. Each takes a lambda and returns a new sequence or a value; none of them mutate the source. The JS mapping you should tattoo somewhere:

| JS array method | LINQ | note |
|---|---|---|
| `filter(f)` | `Where(f)` | keep matching items |
| `map(f)` | `Select(f)` | transform each item |
| `reduce(...)` for sums | `Sum(f)` / `Average(f)` / `Aggregate(...)` | the common reductions are built in |
| `sort(cmp)` | `OrderBy(f)` / `OrderByDescending(f)` | returns a NEW sorted sequence (never mutates!) |
| `find(f)` | `First(f)` / `FirstOrDefault(f)` | `First` throws if nothing matches |
| `some(f)` / `every(f)` | `Any(f)` / `All(f)` | |
| `[...new Set(xs)]` | `Distinct()` | de-duplicate |
| `Object.groupBy` (newish) | `GroupBy(f)` | the star of this project |

```csharp
var bigAmounts = sales.Where(s => s.Amount > 100)   // filter
                      .Select(s => s.Amount)        // map
                      .ToList();                    // materialize
```

Chains read top-to-bottom like JS. One habit to build: a chain is *lazy* (nothing runs until something consumes it); ending with `.ToList()`, `.ToDictionary(...)`, `.Sum()` etc. actually executes it. For this project, just remember: finish pipelines with a materializing call.

### `IEnumerable<T>` — "anything I can foreach over"
The refactored methods take `IEnumerable<Sale>` rather than `List<Sale>`. **`IEnumerable<T>`** is the minimal contract "a sequence of T you can iterate" — every collection satisfies it. Accepting it means callers can pass a list, an array, or the output of another LINQ chain. (It's an *interface* — the "contract" idea from project 02's `IReadOnlyList`, going mainstream in cs#10.)

### `GroupBy` — the one you've been hand-rolling
`GroupBy(s => s.Region)` splits a sequence into buckets by key. Each bucket (an `IGrouping`) has a `.Key` and is itself a sequence you can `Sum`, `Count`, etc.:

```csharp
foreach (var g in sales.GroupBy(s => s.Region))
{
    Console.WriteLine($"{g.Key}: {g.Sum(s => s.Amount)}");
}
// North: 380.00   South: 175.00   West: 490.00
```

Every "parallel lists + seen-scan" you've ever written (project 03, the original here, half the JS track) was `GroupBy` by hand.

### `ToDictionary`
Turns a sequence into a `Dictionary` by saying what the key and value are:

```csharp
sales.GroupBy(s => s.Region)
     .ToDictionary(g => g.Key, g => g.Sum(s => s.Amount));
// Dictionary<string, decimal>: region -> total
```

### `First`, `.First().Key`, and honest emptiness
`OrderByDescending(...).First()` = "the biggest one." But the biggest of an *empty* sequence doesn't exist, so `First()` throws `InvalidOperationException`. That's not a flaw — it's the method refusing to invent an answer. When "nothing" is a legitimate outcome you choose the behavior: `FirstOrDefault()` (null/zero for empty), or guard yourself, or let it throw and document that. The refactor makes one of each choice, deliberately, and tests all of them.

### `sales.Where(...).Average()` would throw too
`Average()` on an empty sequence throws (the average of nothing is mathematically undefined). `AverageOver` therefore checks for the empty case and returns `0m` — a *visible, tested* decision instead of a crash or a NaN.

### Method chaining formatting
C# convention wraps long chains one call per line, dots leading:

```csharp
sales.GroupBy(s => s.Product)
     .OrderByDescending(g => g.Sum(s => s.Amount))
     .First().Key;
```

Read it like a sentence: group by product, order groups by revenue descending, take the winner, give me its name.

## 3. Walking through the original code

Question 1 — total per region — is project 03's disease, relapsed:

```csharp
var regionNames = new List<string>();
var regionTotals = new List<decimal>();
foreach (var sale in sales)
{
    bool found = false;
    for (int i = 0; i < regionNames.Count; i++)
    {
        if (regionNames[i] == sale.Region) { regionTotals[i] += sale.Amount; found = true; break; }
    }
    if (!found) { regionNames.Add(sale.Region); regionTotals.Add(sale.Amount); }
}
```

Parallel lists, index gymnastics, a `found` flag — a hand-rolled `GroupBy`+`Sum`.

Question 2 — top product — stacks three mechanisms:

```csharp
string topProduct = "";
decimal topRevenue = -1m;
var alreadyDone = new List<string>();
foreach (var sale in sales)
{
    // skip if already processed... (inner loop #1 over alreadyDone)
    // sum every sale of this product... (inner loop #2 over sales)
    // compare against the best so far... (flag variables)
}
```

Flag variables to track a maximum, a nested re-scan of the whole list per product, and a "done" list to avoid double counting. Each is innocent; together they're a paragraph of code hiding one sentence of meaning: *group by product, rank by revenue, take the top*. (And a subtle smell: `topRevenue = -1m` — a magic "impossible" starting value. If all revenues could be negative, that guess becomes a bug.)

Question 3 — average of big sales:

```csharp
decimal bigSum = 0m;
int bigCount = 0;
foreach (var sale in sales)
{
    if (sale.Amount > 100m) { bigSum += sale.Amount; bigCount += 1; }
}
if (bigCount > 0) { ... print bigSum / bigCount ... } else { ... print "(none)" ... }
```

Filter, sum, count, divide, and the empty-case guard — all fused with the printing.

## 4. What's wrong with it (in beginner terms)

**1. Intent is buried under mechanism.** "Total per region" is four words; the code is eighteen lines of index bookkeeping. Every reader must *reverse-engineer* the sentence from the plumbing, every time. Code you can't skim is code you'll mischange.

**2. It re-implements solved problems, differently each time.** Question 1 hand-rolls grouping one way, question 2 hand-rolls it another way (with `alreadyDone`). Two bespoke implementations of the same idea = two places to get it wrong = they'll drift apart under maintenance.

**3. Nothing returns data.** Each answer is computed straight into `Console.WriteLine`. Want the region totals in a test, a JSON response, a chart? Impossible without copy-pasting the loop. (By now you can recite this flaw in your sleep — good. It's the repo's boss monster and it respawns everywhere.)

**4. Edge cases are accidents.** The `bigCount > 0` guard exists because someone remembered; `topRevenue = -1m` works because revenues happen to be positive. None of these decisions is named, none is tested.

## 5. Try it yourself first!

Rewrite `original.cs` question by question (it's your scratch copy). Hints, vaguest first:

1. 🌱 Say each question aloud in filter/map/reduce words. "Total per region" = *group* by region, *sum* each group. "Top product" = *group*, *rank groups*, *first*. "Average over 100" = *filter*, *average*.
2. 🌿 Question 3 first (easiest): `sales.Where(s => s.Amount > 100m)`. Then `.Select(s => s.Amount)`. What happens if you call `.Average()` when nothing survived the filter? Decide, then handle it.
3. 🌳 Question 1: `sales.GroupBy(s => s.Region)` then loop `foreach (var g in ...)` printing `g.Key` and `g.Sum(s => s.Amount)`. Delete both parallel lists and the `found` flag. Then upgrade: `.ToDictionary(g => g.Key, g => g.Sum(s => s.Amount))`.
4. 🍎 Question 2 is one chain: group by product, `OrderByDescending` the groups by their summed amount, `.First().Key`. When it works, move all three into a `static class SalesReport` with pure methods and make `Program.cs` print-only.

## 6. Understanding the refactored solution

**`Sale.cs`** is one line — `public record Sale(string Product, string Region, decimal Amount);` — and **`SalesReport.cs`** is four pure methods, each an English sentence in method form:

```csharp
public static Dictionary<string, decimal> TotalByRegion(IEnumerable<Sale> sales) =>
    sales.GroupBy(s => s.Region)
         .ToDictionary(g => g.Key, g => g.Sum(s => s.Amount));
```

Eighteen lines → two. No `found`, no indexes, nothing to desynchronize.

```csharp
public static string TopProduct(IEnumerable<Sale> sales) =>
    sales.GroupBy(s => s.Product)
         .OrderByDescending(g => g.Sum(s => s.Amount))
         .First().Key;
```

The three-mechanism pile is now the sentence it always wanted to be. On empty input `First()` throws `InvalidOperationException` — chosen, documented in a comment, and *pinned by a test* with `Check.Throws`. Compare:

```csharp
public static decimal AverageOver(IEnumerable<Sale> sales, decimal threshold)
{
    var big = sales.Where(s => s.Amount > threshold)
                   .Select(s => s.Amount)
                   .ToList();
    return big.Count == 0 ? 0m : big.Average();
}
```

Here the empty case gets the opposite treatment — a defined answer (0) instead of a throw — because "no big sales" is an ordinary situation, not a caller error. Two edge cases, two *decisions*, both visible. `ProductsIn` rounds out the vocabulary: `Where` → `Select` → `Distinct()` → `OrderBy` → `ToList()`, exactly the JS chain `filter → map → Set-dedupe → sort` you've written a dozen times.

**`Tests.cs`** keeps a fixed `Sample` list and asserts real numbers (`380m` for North, `Monitor` on top, `195m` average) plus every edge: empty input → empty dictionary, → throw (via `Check.Throws<InvalidOperationException>`), → 0. The demo in `Program.cs` prints the same report as the original — from data the methods *returned*.

## 7. Words you learned (glossary)

- **LINQ** — C#'s built-in query methods over collections; filter/map/reduce and friends.
- **Lambda** — inline function value: `s => s.Amount > 100`.
- **`Where` / `Select`** — filter / map.
- **`Sum` / `Average` / `Count`** — built-in reductions (throwing `Average` on empty!).
- **`OrderBy` / `OrderByDescending`** — sort into a *new* sequence; source untouched.
- **`GroupBy` / `IGrouping`** — split into keyed buckets; each bucket is a sequence with a `.Key`.
- **`ToDictionary` / `ToList`** — materialize a pipeline into a real collection.
- **`First` / `FirstOrDefault`** — first match; throw vs default when nothing matches.
- **`Distinct`** — de-duplicate a sequence.
- **`IEnumerable<T>`** — "any sequence of T"; the friendliest parameter type for pure data methods.
- **Lazy evaluation** — LINQ chains describe work; a materializing call performs it.
- **Flag variable** — a mutable local (`found`, `topRevenue`) tracking loop state — the smell LINQ deletes.
- **Magic value** — an in-band "impossible" marker like `-1m`; works until it doesn't.
- **`InvalidOperationException`** — .NET's "this operation makes no sense right now" (e.g. `First()` on empty).

## 8. Experiments to try on the plane (no internet needed)

1. **Add a question end-to-end.** "How many sales per product?" Add `public static Dictionary<string, int> CountByProduct(IEnumerable<Sale> sales)` (`GroupBy` + `ToDictionary(g => g.Key, g => g.Count())`), one demo line, one test (`Keyboard` → 3). Expected: green, and the whole feature took three small additions — none of which touched existing code.
2. **Meet the empty-sequence throw personally.** In `Program.cs`, add `SalesReport.TopProduct(new List<Sale>());`. Expected: crash with `InvalidOperationException: Sequence contains no elements`. Now you've seen the exact failure the `Check.Throws` test guards. Remove the line.
3. **Swap a policy and watch a test object.** Make `AverageOver` return `-1m` for the empty case instead of `0m`. Expected: exactly two tests fail ("nothing qualifies" and "empty list"), naming the behavior you changed. This is what "tests pin decisions" means. Revert.
4. **Chain order matters.** In `ProductsIn`, move `.Distinct()` after `.OrderBy(p => p)` — still fine. Now instead move `.Select(s => s.Product)` to the *end* of the chain. Expected: compile errors along the chain, because after `Select` the items are strings, and before it they're `Sale`s — the type system tracks what flows through each stage of the pipeline. Restore the order that compiles.
5. **Ties in TopProduct.** Add a `new Sale("Webcam", "North", 470m)` to the test `Sample` so Webcam also totals 550. Which of Monitor/Webcam wins now? Run and see; `OrderByDescending` is *stable*, so equal keys keep their encounter order. Decide how you'd make the tie-break explicit (hint: `.ThenBy(g => g.Key)`), do it, and re-run. Remove the extra sale after.
